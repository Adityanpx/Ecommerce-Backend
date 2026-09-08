import 'dotenv/config';
import { initSentry } from './config/sentry';

// Sentry must initialise before anything else so startup errors are captured.
initSentry();

import app from './app';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    logger.info('Database connected');

    const server = app.listen(config.port, () => {
      logger.info(`Server listening on http://localhost:${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Health check: http://localhost:${config.port}${config.apiPrefix}/health`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received — shutting down gracefully`);

      const forceExit = setTimeout(() => {
        logger.error('Forced shutdown after 10s timeout');
        process.exit(1);
      }, 10_000);

      server.close(async () => {
        clearTimeout(forceExit);
        await disconnectDatabase();
        logger.info('Shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', { reason });
      throw reason;
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { message: error.message, stack: error.stack });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

void bootstrap();
