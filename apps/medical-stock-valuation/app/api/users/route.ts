import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { createRecord, updateRecord, withErrorHandler } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const showInactive = searchParams.get('showInactive') === 'true';

    // クエリパラメータに応じて有効なデータのみ、または全データを取得
    const query = showInactive
      ? 'SELECT id, name, is_active, created_at, updated_at FROM users ORDER BY is_active DESC, name'
      : 'SELECT id, name, is_active, created_at, updated_at FROM users WHERE is_active = 1 ORDER BY name';

    const users = db.prepare(query).all();
    return NextResponse.json(users);
  }, 'ユーザー一覧の取得に失敗しました');
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '担当者名を入力してください' },
        { status: 400 }
      );
    }

    return await createRecord({
      tableName: 'users',
      nameField: 'name',
      data: { name },
    });
  }, '担当者の登録に失敗しました');
}

export async function PUT(request: NextRequest) {
  return withErrorHandler(async () => {
    const { id, name } = await request.json();

    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { error: 'IDと担当者名を入力してください' },
        { status: 400 }
      );
    }

    return await updateRecord({
      tableName: 'users',
      nameField: 'name',
      data: { id, name },
    });
  }, '担当者情報の更新に失敗しました');
}

export async function PATCH(request: NextRequest) {
  return withErrorHandler(async () => {
    const { id, action } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'IDを指定してください' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    if (action === 'deactivate') {
      // 無効化（論理削除）
      db.prepare('UPDATE users SET is_active = 0, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(id);
      return NextResponse.json({ message: '担当者を無効化しました' });
    } else if (action === 'activate') {
      // 有効化
      db.prepare('UPDATE users SET is_active = 1, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(id);
      return NextResponse.json({ message: '担当者を有効化しました' });
    } else if (action === 'delete') {
      // 物理削除（無効化表示画面からのみ実行可能）
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      return NextResponse.json({ message: '担当者を削除しました' });
    } else {
      return NextResponse.json(
        { error: '無効なアクションです' },
        { status: 400 }
      );
    }
  }, '担当者の操作に失敗しました');
}
