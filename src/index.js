import './config/dotenvConfig.js';
import app from './app.js';
import mongoose from 'mongoose';
import connectDB from './db/connectDB.js';
import { connectRedis, redisClient } from './db/connectRedis.js';
import { logger } from './utils/logger.js';
import { catchAsync } from './utils/catchAsync.js';

Promise.all([connectDB(), connectRedis()])
  .then(() => {
    const server = app.listen(process.env.PORT, () => {
      logger.info(
        `Server is running at port: ${process.env.PORT}, in ${process.env.NODE_ENV} mode`
      );
    });

    const disconnectRedis = catchAsync(async () => {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
        await redisClient.quit();
        logger.info('Redis client disconnected gracefully.');
      } else {
        logger.warn('Redis client not connected or already disconnected.');
      }
    });

    const disconnectMongo = catchAsync(async () => {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected gracefully.');
    });

    // Graceful shutdown function
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');

        await Promise.all([disconnectRedis(), disconnectMongo()]);

        logger.info('Process terminated!');
        process.exit(signal === 'unhandledRejection' ? 1 : 0);
      });
    };

    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err });
      gracefulShutdown('unhandledRejection');
    });

    process.on('SIGTERM', () => {
      gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      gracefulShutdown('SIGINT');
    });
  })
  .catch((err) => {
    logger.error('Application startup failed!', { error: err });
    Promise.allSettled([
      redisClient.status === 'ready' || redisClient.status === 'connect'
        ? redisClient.quit()
        : Promise.resolve(),
      mongoose.connection.readyState === 1 ? mongoose.disconnect() : Promise.resolve()
    ]).finally(() => {
      process.exit(1);
    });
  });
