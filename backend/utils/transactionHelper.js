import mongoose from 'mongoose';

/**
 * Checks whether the active MongoDB connection is a standalone single-node deployment
 * where multi-document ACID transactions are not supported.
 *
 * @returns {boolean}
 */
export const isStandaloneDeployment = () => {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        return true;
    }
    const topologyType = mongoose.connection?.client?.topology?.description?.type;
    return topologyType === 'Single' || topologyType === 'Standalone';
};

/**
 * Checks whether the active MongoDB connection supports multi-document transactions
 * (Replica Set or Sharded Cluster).
 *
 * @returns {boolean}
 */
export const isTransactionSupported = () => {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        return false;
    }
    const topologyType = mongoose.connection?.client?.topology?.description?.type;
    return topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';
};

/**
 * Safely executes a critical database operation within a MongoDB transaction.
 *
 * Key Safety Guarantees:
 * 1. ACID Guarantees: Operations execute inside a session with transaction.
 * 2. NO Unsafe Re-execution: If an error occurs during operation execution,
 *    the transaction aborts and rolls back. The operation is NEVER blindly re-run.
 * 3. Clear Production Failure: In production environments, multi-document transactions
 *    require a MongoDB Replica Set or Sharded Cluster. Standalone deployments fail clearly.
 * 4. Post-Commit Outbox Pattern: External side-effects (notifications, emails, socket events)
 *    registered via context.onCommit(...) are ONLY executed after successful commit.
 *
 * @param {Function} operation - async (session, context) => Promise<any>
 * @param {Object} [options]
 * @param {boolean} [options.requireTransaction] - Default true in production
 * @param {boolean} [options.allowStandaloneFallback] - Default true in development/test
 * @param {string} [options.operationName] - Descriptive name for logging & error reporting
 * @returns {Promise<any>} Result of the operation
 */
export const runTransactionSafe = async (operation, {
    requireTransaction = process.env.NODE_ENV === 'production',
    allowStandaloneFallback = process.env.NODE_ENV !== 'production',
    operationName = 'Critical Operation'
} = {}) => {
    let session = null;
    const postCommitTasks = [];
    const context = {
        onCommit: (task) => {
            if (typeof task === 'function') {
                postCommitTasks.push(task);
            }
        }
    };

    // When disconnected or standalone deployment (avoids Mongoose 10s startSession buffer timeout)
    const isReady = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
    const hasTxSupport = isReady && isTransactionSupported();

    if (!hasTxSupport) {
        if (requireTransaction) {
            throw new Error(
                `[TRANSACTION_UNSUPPORTED] ${operationName} requires multi-document transactions. ` +
                'Production deployments must use a MongoDB Replica Set or Sharded Cluster.'
            );
        }

        if (allowStandaloneFallback) {
            const result = await operation(null, context);
            for (const task of postCommitTasks) {
                try {
                    await task();
                } catch (taskErr) {
                    console.error(`Post-commit task failed for ${operationName}:`, taskErr.message);
                }
            }
            return result;
        }

        throw new Error(
            `[TRANSACTION_UNSUPPORTED] ${operationName} cannot execute: transactions unavailable and standalone fallback is disabled.`
        );
    }

    try {
        session = await mongoose.startSession();
    } catch (sessionErr) {
        if (requireTransaction) {
            throw new Error(
                `[TRANSACTION_UNSUPPORTED] ${operationName} failed to start session: ${sessionErr.message}. ` +
                'Please deploy a MongoDB Replica Set for production transactional safety.'
            );
        }

        if (allowStandaloneFallback) {
            const result = await operation(null, context);
            for (const task of postCommitTasks) {
                try {
                    await task();
                } catch (taskErr) {
                    console.error(`Post-commit task failed for ${operationName}:`, taskErr.message);
                }
            }
            return result;
        }

        throw sessionErr;
    }

    // Session was successfully started. Execute within withTransaction.
    let operationExecuted = false;
    let result;

    try {
        await session.withTransaction(async () => {
            operationExecuted = true;
            result = await operation(session, context);
        });

        // Transaction COMMITTED successfully! Now safe to trigger external side-effects
        for (const task of postCommitTasks) {
            try {
                await task();
            } catch (taskErr) {
                console.error(`Post-commit task error for ${operationName}:`, taskErr.message);
            }
        }

        return result;
    } catch (txErr) {
        // If withTransaction failed: the transaction has ALREADY been aborted by MongoDB.
        // DO NOT blindly execute operation(null). Throw error directly to preserve data integrity.
        if (operationExecuted) {
            txErr.isTransactionAborted = true;
        }
        throw txErr;
    } finally {
        if (session) {
            try {
                await session.endSession();
            } catch {
                // Ignore session close error
            }
        }
    }
};

export default {
    runTransactionSafe,
    isStandaloneDeployment,
    isTransactionSupported
};
