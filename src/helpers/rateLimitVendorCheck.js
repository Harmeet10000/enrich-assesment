// Lua script for atomic rate limiting.
// KEYS[1] - The Redis key for the counter (e.g., 'rate_limit:syncVendor:1700000000')
// ARGV[1] - Max requests allowed

import { config } from '../config/limits.js';
import { redisClient } from '../db/connectRedis.js';
import { logger } from '../utils/logger.js';

// ARGV[2] - Expiration time for the key (duration in seconds)
const rateLimitLuaScript = `
    local key = KEYS[1]
    local max = tonumber(ARGV[1])
    local expiry = tonumber(ARGV[2])

    local current = redis.call('get', key)

    if current then
        current = tonumber(current)
        if current < max then
            redis.call('incr', key)
            return 1 -- Allowed
        else
            return 0 -- Denied
        end
    else
        redis.call('setex', key, expiry, 1)
        return 1 -- Allowed
    end
`;

// Load the Lua script into Redis. This ensures it's available for atomic calls.
redisClient.defineCommand('rateLimitCheck', {
  numberOfKeys: 1,
  lua: rateLimitLuaScript
});

export const canCallVendor = async (vendorName) => {
  const { max, duration } = config.vendorRateLimits[vendorName] || { max: 1, duration: 1000 };
  const windowStart = Math.floor(Date.now() / duration) * duration;
  const key = `rate_limit:${vendorName}:${windowStart}`;
  const expirySeconds = Math.ceil(duration / 1000); // Convert duration to seconds for Redis TTL

  try {
    // Use the defined Lua script for atomic check and increment
    const result = await redisClient.rateLimitCheck(key, max, expirySeconds);
    return result === 1; // 1 means allowed, 0 means denied
  } catch (error) {
    logger.error(`Error with Redis rate limiter for ${vendorName}:`, error.message);
    // In case of Redis error, decide on a fallback strategy (e.g., allow or deny)
    // For now, we'll deny to prevent overwhelming the vendor.
    return false;
  }
};

export const getTimeUntilNextCall = (vendorName) => {
  const { duration } = config.vendorRateLimits[vendorName] || { max: 1, duration: 1000 };
  const now = Date.now();
  const currentWindowStart = Math.floor(now / duration) * duration;
  const nextWindowStart = currentWindowStart + duration;
  return nextWindowStart - now;
};
