import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import { casesRouter } from './routes/cases.js';
import { assigneesRouter } from './routes/assignees.js';
import { referrersRouter } from './routes/referrers.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { config } from './config.js';
import { openApiDocument } from './openapi.js';

const app = new Hono();

// CORS
app.use(
  '*',
  cors({
    origin: [config.frontendUrl, 'http://localhost:3020'],
    credentials: true,
  })
);

// Request logging
app.use('*', requestLogger());

// Health check
app.get('/health', (c) =>
  c.json({
    status: 'OK',
    service: 'inheritance-case-management-api',
    timestamp: new Date().toISOString(),
  })
);

// OpenAPI document
app.get('/openapi.json', (c) => c.json(openApiDocument));

// Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

// API Routes (NO AUTH - internal app)
app.route('/api/cases', casesRouter);
app.route('/api/assignees', assigneesRouter);
app.route('/api/referrers', referrersRouter);

// Error handler
app.onError(errorHandler);

// 404 handler
app.notFound((c) =>
  c.json(
    {
      error: 'Not Found',
      code: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  )
);

export { app };
