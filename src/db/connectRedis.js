import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

export const redisOptions = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
};

export const redisClient = new Redis(redisOptions);

export const connectRedis = async () =>
  new Promise((resolve, reject) => {
    const connectionTimeout = setTimeout(() => {
      reject(new Error('Redis connection timeout after 10000ms'));
    }, 10000);

    redisClient.once('ready', () => {
      clearTimeout(connectionTimeout);
      logger.info('Redis client connected successfully and ready to use.');
      resolve();
    });

    redisClient.once('error', (err) => {
      clearTimeout(connectionTimeout);
      logger.error('Failed to connect to Redis:', { error: err });
      reject(err);
    });

    if (redisClient.status === 'ready') {
      clearTimeout(connectionTimeout);
      logger.info('Redis was already connected.');
      resolve();
    }
  });
