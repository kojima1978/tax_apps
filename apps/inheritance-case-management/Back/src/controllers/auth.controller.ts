import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';

// 本番環境ではデータベースからユーザーを取得する
// 開発用にハッシュ化されたパスワードを事前生成
let hashedAdminPassword: string | null = null;

async function getHashedPassword(): Promise<string> {
  if (!hashedAdminPassword) {
    hashedAdminPassword = await bcrypt.hash(config.adminPassword, 10);
  }
  return hashedAdminPassword;
}

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'ユーザー名とパスワードを入力してください' });
    return;
  }

  // 開発用: 環境変数で設定された管理者認証情報を使用
  if (username !== config.adminUsername) {
    res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    return;
  }

  const hashedPassword = await getHashedPassword();
  const isValidPassword = await bcrypt.compare(password, hashedPassword);

  if (!isValidPassword) {
    res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    return;
  }

  const token = jwt.sign(
    { username },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { username },
    message: 'ログインに成功しました',
  });
}

export async function verifyToken(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ valid: false });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { username: string };
    res.json({ valid: true, user: { username: decoded.username } });
  } catch {
    res.status(401).json({ valid: false });
  }
}
