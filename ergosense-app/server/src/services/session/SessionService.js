/**
 * Sessões distribuídas Redis — compatível com cluster / load balancer.
 */
import crypto from 'crypto';
import { getRedisClient } from '../../redis.js';
import { config } from '../../config/env.js';

const PREFIX = 'session:';
const memorySessions = new Map();

function sessionKey(sessionId) {
  return `${PREFIX}${sessionId}`;
}

export class SessionService {
  async create(userId, metadata = {}) {
    const sessionId = crypto.randomUUID();
    const payload = {
      userId,
      createdAt: new Date().toISOString(),
      ...metadata,
    };
    await this._set(sessionId, payload);
    return sessionId;
  }

  async get(sessionId) {
    if (!sessionId) return null;
    const redis = await getRedisClient();
    if (redis && config.session.enabled) {
      try {
        const raw = await redis.get(sessionKey(sessionId));
        return raw ? JSON.parse(raw) : null;
      } catch {
        /* fallback */
      }
    }
    return memorySessions.get(sessionId) ?? null;
  }

  async touch(sessionId) {
    const data = await this.get(sessionId);
    if (!data) return false;
    await this._set(sessionId, { ...data, lastSeenAt: new Date().toISOString() });
    return true;
  }

  async destroy(sessionId) {
    if (!sessionId) return;
    const redis = await getRedisClient();
    if (redis) {
      try {
        await redis.del(sessionKey(sessionId));
      } catch {
        /* ignore */
      }
    }
    memorySessions.delete(sessionId);
  }

  async destroyAllForUser(userId) {
    const redis = await getRedisClient();
    if (redis && config.session.enabled) {
      try {
        let cursor = '0';
        do {
          const [next, keys] = await redis.scan(cursor, 'MATCH', `${PREFIX}*`, 'COUNT', 100);
          cursor = next;
          for (const key of keys) {
            const raw = await redis.get(key);
            if (!raw) continue;
            const data = JSON.parse(raw);
            if (data.userId === userId) await redis.del(key);
          }
        } while (cursor !== '0');
      } catch {
        /* ignore */
      }
    }
    for (const [sid, data] of memorySessions) {
      if (data.userId === userId) memorySessions.delete(sid);
    }
  }

  async _set(sessionId, payload) {
    const ttl = config.session.ttlSec;
    const redis = await getRedisClient();
    if (redis && config.session.enabled) {
      try {
        await redis.setex(sessionKey(sessionId), ttl, JSON.stringify(payload));
        return;
      } catch {
        /* fallback */
      }
    }
    memorySessions.set(sessionId, payload);
  }
}

export const sessionService = new SessionService();
