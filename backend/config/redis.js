import net from 'net';

/**
 * Validates Redis configuration from environment variables.
 * @returns {{ valid: boolean, errors: string[], config: Object }}
 */
export const validateRedisConfig = () => {
    const errors = [];
    let host = '127.0.0.1';
    let port = 6379;
    let password = '';
    let tls = false;
    let configured = false;

    if (process.env.REDIS_URL) {
        configured = true;
        try {
            const parsed = new URL(process.env.REDIS_URL);
            if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
                errors.push(`Invalid REDIS_URL protocol: "${parsed.protocol}". Must be redis: or rediss:.`);
            }
            host = parsed.hostname || '127.0.0.1';
            port = parsed.port ? Number(parsed.port) : 6379;
            password = parsed.password ? decodeURIComponent(parsed.password) : '';
            tls = parsed.protocol === 'rediss:';
        } catch (err) {
            errors.push(`Failed to parse REDIS_URL: ${err.message}`);
        }
    } else if (process.env.REDIS_HOST) {
        configured = true;
        host = process.env.REDIS_HOST.trim();
        if (process.env.REDIS_PORT) {
            const p = Number(process.env.REDIS_PORT);
            if (isNaN(p) || p <= 0 || p > 65535) {
                errors.push(`Invalid REDIS_PORT number: "${process.env.REDIS_PORT}". Must be between 1 and 65535.`);
            } else {
                port = p;
            }
        }
        password = process.env.REDIS_PASSWORD || '';
        tls = process.env.REDIS_TLS === 'true';
    }

    return {
        valid: errors.length === 0,
        configured,
        errors,
        config: { host, port, password, tls }
    };
};

/**
 * Lightweight, zero-dependency RESP-protocol Redis client for Node.js
 */
export class NativeRedisClient {
    constructor(options = {}) {
        this.host = options.host || '127.0.0.1';
        this.port = options.port || 6379;
        this.password = options.password || '';
        this.socket = null;
        this.connected = false;
        this.queue = [];
        this.buffer = '';
        this.reconnectTimer = null;
    }

    connect() {
        if (this.socket) return;

        try {
            this.socket = net.createConnection({ host: this.host, port: this.port }, () => {
                this.connected = true;
                if (this.password) {
                    this._sendCommand(['AUTH', this.password]).catch(() => {});
                }
            });

            this.socket.on('data', (data) => {
                this._handleData(data.toString());
            });

            this.socket.on('error', (err) => {
                this.connected = false;
                this._flushQueue(err);
            });

            this.socket.on('close', () => {
                this.connected = false;
                this.socket = null;
            });

            // Prevent socket error from crashing process
            this.socket.unref();
        } catch (err) {
            this.connected = false;
            this._flushQueue(err);
        }
    }

    _sendCommand(args) {
        return new Promise((resolve, reject) => {
            if (!this.connected || !this.socket) {
                return reject(new Error('Redis client not connected'));
            }

            // Encode RESP Array
            let resp = `*${args.length}\r\n`;
            for (const arg of args) {
                const str = String(arg);
                resp += `$${Buffer.byteLength(str)}\r\n${str}\r\n`;
            }

            this.queue.push({ resolve, reject });
            this.socket.write(resp);
        });
    }

    _handleData(chunk) {
        this.buffer += chunk;
        while (this.buffer.length > 0) {
            const firstChar = this.buffer[0];
            const crlfIdx = this.buffer.indexOf('\r\n');
            if (crlfIdx === -1) break;

            if (firstChar === '+' || firstChar === ':') {
                const line = this.buffer.slice(1, crlfIdx);
                this.buffer = this.buffer.slice(crlfIdx + 2);
                const req = this.queue.shift();
                if (req) req.resolve(firstChar === ':' ? Number(line) : line);
            } else if (firstChar === '-') {
                const line = this.buffer.slice(1, crlfIdx);
                this.buffer = this.buffer.slice(crlfIdx + 2);
                const req = this.queue.shift();
                if (req) req.reject(new Error(line));
            } else if (firstChar === '$') {
                const len = Number(this.buffer.slice(1, crlfIdx));
                if (len === -1) {
                    this.buffer = this.buffer.slice(crlfIdx + 2);
                    const req = this.queue.shift();
                    if (req) req.resolve(null);
                } else {
                    const dataStart = crlfIdx + 2;
                    if (this.buffer.length < dataStart + len + 2) break;
                    const val = this.buffer.slice(dataStart, dataStart + len);
                    this.buffer = this.buffer.slice(dataStart + len + 2);
                    const req = this.queue.shift();
                    if (req) req.resolve(val);
                }
            } else {
                this.buffer = '';
                break;
            }
        }
    }

    _flushQueue(err) {
        while (this.queue.length > 0) {
            const req = this.queue.shift();
            req.reject(err);
        }
    }

    async incr(key) {
        return await this._sendCommand(['INCR', key]);
    }

    async pexpire(key, ms) {
        return await this._sendCommand(['PEXPIRE', key, ms]);
    }

    async pttl(key) {
        return await this._sendCommand(['PTTL', key]);
    }

    async del(key) {
        return await this._sendCommand(['DEL', key]);
    }

    async ping() {
        return await this._sendCommand(['PING']);
    }

    disconnect() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
            this.connected = false;
        }
    }
}

/**
 * Creates an in-memory mock Redis client sharing state across simulated server instances.
 * Ideal for unit testing distributed multi-instance rate limiting without external dependencies.
 */
export const createMockRedisClient = (sharedStore = new Map()) => {
    return {
        isMock: true,
        connected: true,
        async incr(key) {
            const now = Date.now();
            let record = sharedStore.get(key);
            if (!record || (record.expiresAt && now >= record.expiresAt)) {
                record = { value: 1, expiresAt: null };
            } else {
                record.value += 1;
            }
            sharedStore.set(key, record);
            return record.value;
        },
        async pexpire(key, ms) {
            const record = sharedStore.get(key);
            if (!record) return 0;
            record.expiresAt = Date.now() + ms;
            return 1;
        },
        async pttl(key) {
            const record = sharedStore.get(key);
            if (!record) return -2;
            if (!record.expiresAt) return -1;
            const remaining = record.expiresAt - Date.now();
            return remaining > 0 ? remaining : -2;
        },
        async del(key) {
            const existed = sharedStore.delete(key);
            return existed ? 1 : 0;
        },
        async ping() {
            return 'PONG';
        },
        disconnect() {
            this.connected = false;
        }
    };
};

let activeRedisClient = null;

export const setRedisClient = (client) => {
    activeRedisClient = client;
};

export const getRedisClient = () => {
    return activeRedisClient;
};

export const isRedisReady = () => {
    return Boolean(activeRedisClient && activeRedisClient.connected !== false);
};

export const initRedis = () => {
    const { valid, configured, config } = validateRedisConfig();

    if (!configured) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️ [REDIS ADVISORY] No REDIS_URL or REDIS_HOST set in production. Rate limiting is using memory fallback. Configure REDIS_URL for distributed deployments.');
        }
        return null;
    }

    if (!valid) {
        console.error('❌ Redis Configuration Error. Falling back to in-memory store.');
        return null;
    }

    try {
        const client = new NativeRedisClient(config);
        client.connect();
        setRedisClient(client);
        return client;
    } catch (err) {
        console.warn('⚠️ Could not connect to Redis, falling back to memory store:', err.message);
        return null;
    }
};

export default {
    validateRedisConfig,
    NativeRedisClient,
    createMockRedisClient,
    setRedisClient,
    getRedisClient,
    isRedisReady,
    initRedis
};
