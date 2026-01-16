import { NextResponse } from 'next/server';
import { getDatabase } from './db';

/**
 * 共通のCRUD操作ユーティリティ
 */

/**
 * APIハンドラーのエラーハンドリングラッパー
 */
export async function withErrorHandler<T>(
  handler: () => Promise<T> | T,
  errorMessage: string = 'エラーが発生しました'
): Promise<NextResponse> {
  try {
    const result = await handler();
    if (result instanceof NextResponse) {
      return result;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('データベースエラー:', error);
    const message = error instanceof Error ? error.message : errorMessage;
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

interface CreateOptions {
  tableName: string;
  nameField: string;
  data: { name: string };
}

interface UpdateOptions {
  tableName: string;
  nameField: string;
  data: { id: number; name: string };
}

/**
 * 新規レコード作成
 */
export async function createRecord(options: CreateOptions) {
  const { tableName, nameField, data } = options;
  const db = getDatabase();

  // 重複チェック
  const existing = db
    .prepare(`SELECT id FROM ${tableName} WHERE ${nameField} = ?`)
    .get(data.name);

  if (existing) {
    return NextResponse.json(
      { error: `${data.name}は既に登録されています` },
      { status: 400 }
    );
  }

  // 新規作成
  db.prepare(`INSERT INTO ${tableName} (${nameField}) VALUES (?)`).run(
    data.name
  );

  return NextResponse.json({
    success: true,
    message: `${data.name}を登録しました`,
  });
}

/**
 * レコード更新
 */
export async function updateRecord(options: UpdateOptions) {
  const { tableName, nameField, data } = options;
  const db = getDatabase();

  // 重複チェック（自分自身を除く）
  const existing = db
    .prepare(`SELECT id FROM ${tableName} WHERE ${nameField} = ? AND id != ?`)
    .get(data.name, data.id);

  if (existing) {
    return NextResponse.json(
      { error: `${data.name}は既に登録されています` },
      { status: 400 }
    );
  }

  // 更新
  db.prepare(
    `UPDATE ${tableName} SET ${nameField} = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`
  ).run(data.name, data.id);

  return NextResponse.json({
    success: true,
    message: `${data.name}に更新しました`,
  });
}
