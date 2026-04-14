import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const TEMPLATE_DIR = path.join(process.cwd(), 'templates');

const TEMPLATE_FILE = 'estimate_template.xlsx';

/** テンプレートファイルをBase64で返す（見積・請求で共通テンプレート） */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type || !['estimate', 'invoice'].includes(type)) {
    return NextResponse.json(
      { error: '無効なテンプレートタイプです（estimate / invoice）' },
      { status: 400 }
    );
  }

  const filePath = path.join(TEMPLATE_DIR, TEMPLATE_FILE);

  if (!existsSync(filePath)) {
    return NextResponse.json({ exists: false });
  }

  const buffer = await readFile(filePath);
  const base64 = buffer.toString('base64');

  return NextResponse.json({ exists: true, data: base64 });
}
