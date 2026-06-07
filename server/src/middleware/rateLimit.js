import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Per-user rate limiting backed by Upstash Redis (works across serverless
// instances). It degrades safely:
//   - if Upstash isn't configured, every limiter is a no-op (app keeps working);
//   - if Redis errors at request time, we fail OPEN so an outage can't take the
//     endpoint down.
// Must run AFTER requireAuth (keys on req.user.id).

const configured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let redis = null;
function getRedis() {
  if (!configured) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

const limiters = new Map();
function getLimiter(name, max, window) {
  const r = getRedis();
  if (!r) return null;
  const cacheKey = `${name}:${max}:${window}`;
  if (!limiters.has(cacheKey)) {
    limiters.set(
      cacheKey,
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(max, window),
        prefix: `rl:${name}`,
        analytics: false,
      })
    );
  }
  return limiters.get(cacheKey);
}

/**
 * Express middleware factory. `window` is an Upstash duration string ("1 m", "1 h").
 * Example: rateLimit({ name: 'assistant', max: 20, window: '1 m' })
 */
export function rateLimit({ name, max, window }) {
  return async (req, res, next) => {
    try {
      const limiter = getLimiter(name, max, window);
      if (!limiter) return next(); // not configured — skip

      const key = req.user?.id || req.ip || 'anon';
      const { success, limit, remaining, reset } = await limiter.limit(`${name}:${key}`);

      res.setHeader('RateLimit-Limit', String(limit));
      res.setHeader('RateLimit-Remaining', String(Math.max(0, remaining)));

      if (!success) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))));
        return res
          .status(429)
          .json({ error: 'Slow down a sec — too many requests. Try again in a moment.' });
      }
      next();
    } catch (err) {
      console.error('Rate limit error (failing open):', err.message);
      next();
    }
  };
}
