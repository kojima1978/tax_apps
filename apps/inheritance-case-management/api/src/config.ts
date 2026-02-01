export const config = {
  port: parseInt(process.env.PORT || '3021', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3020',
  databaseUrl: process.env.DATABASE_URL || '',
} as const;
