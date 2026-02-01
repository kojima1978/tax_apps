import { serve } from '@hono/node-server';
import { app } from './app.js';
import { logger } from './lib/logger.js';
import { config } from './config.js';

const port = config.port;

logger.info({ port, env: config.nodeEnv }, 'Starting server...');

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info(
      { url: `http://localhost:${info.port}` },
      'Server started successfully'
    );
  }
);
