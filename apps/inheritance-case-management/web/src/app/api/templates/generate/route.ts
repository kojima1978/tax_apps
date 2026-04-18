import { NextResponse } from 'next/server';
import { generateTemplate } from '@/lib/services/template-service';
import type { GenerateTemplateInput } from '@/lib/services/template-service';

export async function POST(request: Request) {
  try {
    const body: GenerateTemplateInput = await request.json();
    const { docType } = body;

    if (!docType || !['estimate', 'invoice'].includes(docType)) {
      return NextResponse.json(
        { error: '無効なテンプレートタイプです（estimate / invoice）' },
        { status: 400 }
      );
    }

    const buffer = await generateTemplate(body);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="generated.xlsx"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === 'TEMPLATE_NOT_FOUND') {
      return NextResponse.json({ error: 'テンプレートファイルが見つかりません' }, { status: 404 });
    }
    if (message === 'WORKSHEET_NOT_FOUND') {
      return NextResponse.json({ error: 'ワークシートが見つかりません' }, { status: 500 });
    }
    console.error('テンプレート生成エラー:', e);
    return NextResponse.json(
      { error: 'テンプレート生成に失敗しました: ' + message },
      { status: 500 }
    );
  }
}
