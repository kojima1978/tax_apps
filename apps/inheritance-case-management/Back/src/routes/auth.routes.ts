import { Router } from 'express';
import { login, verifyToken } from '../controllers/auth.controller';

const router = Router();

// ログイン
router.post('/login', login);

// トークン検証
router.get('/verify', verifyToken);

export default router;
