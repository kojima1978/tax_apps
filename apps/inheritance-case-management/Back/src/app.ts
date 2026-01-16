import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env';
import casesRouter from './routes/cases.routes';
import authRouter from './routes/auth.routes';
import { authMiddleware } from './middleware/auth.middleware';

const app: Application = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ログミドルウェア
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Inheritance Tax Case Management API is running',
    environment: config.nodeEnv,
  });
});

// Routes
import assigneesRouter from './routes/assignees.routes';
import referrersRouter from './routes/referrers.routes';

// Auth routes (公開)
app.use('/api/auth', authRouter);

// Protected routes (認証必須)
app.use('/api/cases', authMiddleware, casesRouter);
app.use('/api/assignees', authMiddleware, assigneesRouter);
app.use('/api/referrers', authMiddleware, referrersRouter);

// 404 ハンドラー
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// エラーハンドラー
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

export default app;
