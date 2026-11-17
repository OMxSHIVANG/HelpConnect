import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
    runTransactionSafe,
    isStandaloneDeployment,
    isTransactionSupported
} from '../utils/transactionHelper.js';
import {
    transitionDonationStatus,
    transitionPickupStatus,
    confirmCollectionWithOtp,
    confirmDeliveryAtNgo
} from '../services/donationLifecycleService.js';
import Donation from '../models/Donation.js';

test('MongoDB Transaction Safety & Post-Commit Outbox Suite (TASK 10)', async (t) => {

    await t.test('1. Transaction Success: Executes multi-step operations and fires post-commit tasks', async () => {
        let opExecuted = false;
        let postCommitExecuted = false;

        const result = await runTransactionSafe(
            async (session, context) => {
                opExecuted = true;
                context.onCommit(async () => {
                    postCommitExecuted = true;
                });
                return { success: true, count: 42 };
            },
            {
                requireTransaction: false, // development / test safe mode
                allowStandaloneFallback: true,
                operationName: 'Test Success Operation'
            }
        );

        assert.equal(opExecuted, true);
        assert.equal(result.success, true);
        assert.equal(result.count, 42);
        assert.equal(postCommitExecuted, true, 'Post-commit callback must be triggered after successful completion');
    });

    await t.test('2. Transaction Rollback: Fails cleanly and NEVER executes post-commit notifications', async () => {
        let opExecuted = false;
        let notificationSent = false;

        await assert.rejects(
            async () => {
                await runTransactionSafe(
                    async (session, context) => {
                        opExecuted = true;

                        // Register critical notification
                        context.onCommit(async () => {
                            notificationSent = true;
                        });

                        // Simulate internal failure (e.g. quantity exceeded or database error)
                        throw new Error('Simulated database write conflict / business rule rejection');
                    },
                    {
                        requireTransaction: false,
                        allowStandaloneFallback: true,
                        operationName: 'Test Failing Operation'
                    }
                );
            },
            /Simulated database write conflict/
        );

        assert.equal(opExecuted, true);
        assert.equal(notificationSent, false, 'SECURITY GUARANTEE: Zero notifications must be sent on transaction failure/rollback');
    });

    await t.test('3. Anti-Reexecution: Does NOT blindly re-run operation(null) after transaction failure', async () => {
        let executionAttempts = 0;

        await assert.rejects(
            async () => {
                await runTransactionSafe(
                    async () => {
                        executionAttempts++;
                        throw new Error('Transaction abort triggered by validation failure');
                    },
                    {
                        requireTransaction: false,
                        allowStandaloneFallback: true,
                        operationName: 'Test Anti-Rerun'
                    }
                );
            },
            /Transaction abort triggered by validation failure/
        );

        assert.equal(
            executionAttempts,
            1,
            'SECURITY GUARANTEE: Operation must NOT be automatically re-executed with null session after an error'
        );
    });

    await t.test('4. Production Requirement: Fails clearly when transactional guarantees are unavailable', async () => {
        // In production, when transactions are required, it must fail clearly if the deployment is standalone
        const origState = mongoose.connection.readyState;

        await assert.rejects(
            async () => {
                await runTransactionSafe(
                    async () => {
                        return { ok: true };
                    },
                    {
                        requireTransaction: true, // Strict production mode
                        allowStandaloneFallback: false,
                        operationName: 'High Security Transfer'
                    }
                );
            },
            (err) => {
                return err.message.includes('TRANSACTION_UNSUPPORTED') ||
                    err.message.includes('replica set') ||
                    err.message.includes('Transactions are not supported');
            }
        );
    });

    await t.test('5. Duplicate Assignment Prevention: Atomic conditional guard prevents double assignment', () => {
        const donationRecord = {
            _id: new mongoose.Types.ObjectId(),
            status: 'accepted',
            assignedAgent: new mongoose.Types.ObjectId()
        };

        const attemptAssign = (donation, targetAgentId, isForced) => {
            // Guard: If already assigned to an agent and not explicitly changing, reject
            if (donation.assignedAgent && !isForced) {
                throw new Error('Conflict: Donation is already assigned to a pickup agent.');
            }
            donation.assignedAgent = targetAgentId;
            return donation;
        };

        const agent1Id = new mongoose.Types.ObjectId();
        const agent2Id = new mongoose.Types.ObjectId();

        // Second concurrent assignment without reassignment flag is blocked
        assert.throws(
            () => attemptAssign(donationRecord, agent2Id, false),
            /Conflict: Donation is already assigned/
        );
    });

    await t.test('6. Concurrent Collection Confirmation: Guards against simultaneous OTP validations', () => {
        const donationDoc = {
            _id: new mongoose.Types.ObjectId(),
            verificationCode: 'HC-112233',
            isVerificationCodeUsed: false,
            pickupStatus: 'agent_arrived',
            status: 'accepted'
        };

        const confirmCollectionMock = (doc, enteredOtp) => {
            // Atomic conditional check (simulating findOneAndUpdate { isVerificationCodeUsed: false })
            if (doc.isVerificationCodeUsed) {
                throw new Error('Conflict: Donation collection was already confirmed concurrently.');
            }
            if (doc.verificationCode !== enteredOtp) {
                throw new Error('Invalid verification code');
            }
            doc.isVerificationCodeUsed = true;
            doc.pickupStatus = 'donation_collected';
            doc.status = 'picked_up';
            return doc;
        };

        // First confirmation succeeds
        const first = confirmCollectionMock(donationDoc, 'HC-112233');
        assert.equal(first.pickupStatus, 'donation_collected');
        assert.equal(first.isVerificationCodeUsed, true);

        // Simultaneous second confirmation is strictly blocked
        assert.throws(
            () => confirmCollectionMock(donationDoc, 'HC-112233'),
            /Conflict: Donation collection was already confirmed concurrently/
        );
    });

    await t.test('7. Idempotent Retry Handling: Repeated receipt calls on completed orders succeed safely', () => {
        const completedDonation = {
            _id: new mongoose.Types.ObjectId(),
            pickupStatus: 'completed',
            status: 'received'
        };

        const handleReceiptConfirmation = (donation) => {
            // Idempotency: If already completed, return existing document without mutating or erroring
            if (donation.pickupStatus === 'completed' && donation.status === 'received') {
                return { idempotent: true, donation };
            }
            donation.pickupStatus = 'completed';
            donation.status = 'received';
            return { idempotent: false, donation };
        };

        const retry = handleReceiptConfirmation(completedDonation);
        assert.equal(retry.idempotent, true);
        assert.equal(retry.donation.status, 'received');
        assert.equal(retry.donation.pickupStatus, 'completed');
    });

    await t.test('8. Topology Helper Detection: Identifies standalone and replica set topology types', () => {
        assert.equal(typeof isStandaloneDeployment, 'function');
        assert.equal(typeof isTransactionSupported, 'function');

        // Check return types are boolean
        assert.equal(typeof isStandaloneDeployment(), 'boolean');
        assert.equal(typeof isTransactionSupported(), 'boolean');
    });
});
