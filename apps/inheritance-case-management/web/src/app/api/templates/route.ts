import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const TEMPLATE_DIR = path.join(process.cwd(), 'templates');

const TEMPLATE_FILES: Record<string, string> = {
  estimate: 'estimate_template.xlsx',
  invoice: 'invoice_template.xlsx',
};

/** テンプレートファイルをBase64で返す */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type || !TEMPLATE_FILES[type]) {
    return NextResponse.json(
      { error: '無効なテンプレートタイプです（estimate / invoice）' },
      { status: 400 }
    );
  }

  const filePath = path.join(TEMPLATE_DIR, TEMPLATE_FILES[type]);

  if (!existsSync(filePath)) {
    return NextResponse.json({ exists: false });
  }

  const buffer = await readFile(filePath);
  const base64 = buffer.toString('base64');

  return NextResponse.json({ exists: true, data: base64 });
}
