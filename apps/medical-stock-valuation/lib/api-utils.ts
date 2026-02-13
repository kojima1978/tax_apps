import { NextRequest, NextResponse } from 'next/server';
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
async function createRecord(options: CreateOptions) {
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
async function updateRecord(options: UpdateOptions) {
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

/**
 * 単一フィールドのマスタ管理用ルートハンドラー生成ファクトリ
 * users/companies のような「名前1フィールド + is_active」のCRUD API用
 */
interface MasterRouteConfig {
  tableName: string;
  nameField: string;
  entityLabel: string;
}

export function createMasterRouteHandlers(config: MasterRouteConfig) {
  const { tableName, nameField, entityLabel } = config;
  const columns = `id, ${nameField}, is_active, created_at, updated_at`;

  return {
    GET: (request: NextRequest) =>
      withErrorHandler(async () => {
        const db = getDatabase();
        const showInactive = new URL(request.url).searchParams.get('showInactive') === 'true';
        const query = showInactive
          ? `SELECT ${columns} FROM ${tableName} ORDER BY is_active DESC, ${nameField}`
          : `SELECT ${columns} FROM ${tableName} WHERE is_active = 1 ORDER BY ${nameField}`;
        return db.prepare(query).all();
      }, `${entityLabel}一覧の取得に失敗しました`),

    POST: (request: NextRequest) =>
      withErrorHandler(async () => {
        const body = await request.json();
        const name = body[nameField];
        if (!name || !name.trim()) {
          return NextResponse.json({ error: `${entityLabel}名を入力してください` }, { status: 400 });
        }
        return await createRecord({ tableName, nameField, data: { name } });
      }, `${entityLabel}の登録に失敗しました`),

    PUT: (request: NextRequest) =>
      withErrorHandler(async () => {
        const body = await request.json();
        const name = body[nameField];
        if (!body.id || !name || !name.trim()) {
          return NextResponse.json({ error: `IDと${entityLabel}名を入力してください` }, { status: 400 });
        }
        return await updateRecord({ tableName, nameField, data: { id: body.id, name } });
      }, `${entityLabel}情報の更新に失敗しました`),

    PATCH: (request: NextRequest) =>
      withErrorHandler(async () => {
        const { id, action } = await request.json();
        if (!id) {
          return NextResponse.json({ error: 'IDを指定してください' }, { status: 400 });
        }
        const db = getDatabase();
        if (action === 'deactivate') {
          db.prepare(`UPDATE ${tableName} SET is_active = 0, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(id);
          return { message: `${entityLabel}を無効化しました` };
        } else if (action === 'activate') {
          db.prepare(`UPDATE ${tableName} SET is_active = 1, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(id);
          return { message: `${entityLabel}を有効化しました` };
        } else if (action === 'delete') {
          db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
          return { message: `${entityLabel}を削除しました` };
        }
        return NextResponse.json({ error: '無効なアクションです' }, { status: 400 });
      }, `${entityLabel}の操作に失敗しました`),
  };
}
