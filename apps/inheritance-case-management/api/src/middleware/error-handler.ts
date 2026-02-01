import type { Context } from 'hono';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';

export function errorHandler(err: Error, c: Context) {
  logger.error({ err, path: c.req.path, method: c.req.method }, 'Request error');

  // Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      400
    );
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as Error & { code?: string };

    if (prismaError.code === 'P2025') {
      return c.json(
        {
          error: 'Not Found',
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        },
        404
      );
    }

    return c.json(
      {
        error: 'Database Error',
        code: 'DB_ERROR',
        message: config.nodeEnv === 'development' ? err.message : 'A database error occurred',
      },
      400
    );
  }

  // Generic error
  return c.json(
    {
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
    },
    500
  );
}
