import { NextResponse } from 'next/server';
import { generateTemplate } from '@/lib/services/template-service';
import type { GenerateTemplateInput } from '@/lib/services/template-service';
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-types';
import { exportFileName } from '@/lib/export-filename';

export async function POST(request: Request) {
  try {
    const body: GenerateTemplateInput = await request.json();
    const { docType } = body;

    if (!docType || !['estimate', 'invoice', 'invoice-request'].includes(docType)) {
      return NextResponse.json(
        { error: '無効なテンプレートタイプです（estimate / invoice / invoice-request）' },
        { status: 400 }
      );
    }

    const buffer = await generateTemplate(body);

    // 画面からの保存では呼び出し側が名前を付け直すが、API を直接叩いたときにも中身の分かる名前にする。
    const fileName = exportFileName([body.deceasedName, DOCUMENT_TYPE_LABELS[docType]], 'xlsx');

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
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
    if (message === 'TEMPLATE_LAYOUT_OUTDATED') {
      return NextResponse.json(
        { error: 'テンプレート（estimate_template.xlsx）が古い形式です。値引額を2行（遺産整理業務分／その他）にした新しいテンプレートへ差し替えてください' },
        { status: 500 }
      );
    }
    console.error('テンプレート生成エラー:', e);
    return NextResponse.json(
      { error: 'テンプレート生成に失敗しました: ' + message },
      { status: 500 }
    );
  }
}
