import { NextResponse } from 'next/server';
import { getTemplateBase64 } from '@/lib/services/template-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type || !['estimate', 'invoice'].includes(type)) {
    return NextResponse.json(
      { error: '無効なテンプレートタイプです（estimate / invoice）' },
      { status: 400 }
    );
  }

  const data = await getTemplateBase64(type);
  if (data === null) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: true, data });
}
