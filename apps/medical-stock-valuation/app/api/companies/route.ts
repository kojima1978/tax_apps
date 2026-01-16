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
      ? 'SELECT id, company_name, is_active, created_at, updated_at FROM companies ORDER BY is_active DESC, company_name'
      : 'SELECT id, company_name, is_active, created_at, updated_at FROM companies WHERE is_active = 1 ORDER BY company_name';

    const companies = db.prepare(query).all();
    return NextResponse.json(companies);
  }, '会社一覧の取得に失敗しました');
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const { company_name } = await request.json();

    if (!company_name || !company_name.trim()) {
      return NextResponse.json(
        { error: '会社名を入力してください' },
        { status: 400 }
      );
    }

    return await createRecord({
      tableName: 'companies',
      nameField: 'company_name',
      data: { name: company_name },
    });
  }, '会社の登録に失敗しました');
}

export async function PUT(request: NextRequest) {
  return withErrorHandler(async () => {
    const { id, company_name } = await request.json();

    if (!id || !company_name || !company_name.trim()) {
      return NextResponse.json(
        { error: 'IDと会社名を入力してください' },
        { status: 400 }
      );
    }

    return await updateRecord({
      tableName: 'companies',
      nameField: 'company_name',
      data: { id, name: company_name },
    });
  }, '会社情報の更新に失敗しました');
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
      db.prepare('UPDATE companies SET is_active = 0, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(id);
      return NextResponse.json({ message: '会社を無効化しました' });
    } else if (action === 'activate') {
      // 有効化
      db.prepare('UPDATE companies SET is_active = 1, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(id);
      return NextResponse.json({ message: '会社を有効化しました' });
    } else if (action === 'delete') {
      // 物理削除（無効化表示画面からのみ実行可能）
      db.prepare('DELETE FROM companies WHERE id = ?').run(id);
      return NextResponse.json({ message: '会社を削除しました' });
    } else {
      return NextResponse.json(
        { error: '無効なアクションです' },
        { status: 400 }
      );
    }
  }, '会社の操作に失敗しました');
}
