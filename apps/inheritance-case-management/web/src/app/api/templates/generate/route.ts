import { NextResponse } from 'next/server';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const TEMPLATE_DIR = path.join(process.cwd(), 'templates');

const TEMPLATE_FILE = 'estimate_template.xlsx';

/** 請求書の場合に上書きするセル値 */
const INVOICE_OVERRIDES: Record<string, string> = {
  B11: '相 続 税 申 告 報 酬 請 求 書',
  B14: '下記計算書の通り御請求申し上げます。',
  B17: '御請求額',
  B41: ' ４．立替金費用（戸籍謄本・不動産登記事項閲覧・残高証明書発行手数料等）',
  B43: '御　請　求　額',
  B44: '振　込　先',
  E44: '　阿波銀行（銀行コード：0172）蔵本支店（店番号：117）\n　普通預金 №１１３５４１７　ゼイ）マスエージェント\n　（振込手数料はお客様にてご負担をお願い致します。）',
};

interface GenerateRequest {
  docType: 'estimate' | 'invoice';
  addresseeName: string;
  deceasedName: string;
  propertyValue: number;
  landRosenkaCount: number;
  landBairitsuCount: number;
  unlistedStockCount: number;
  heirCount: number;
  discount: number;
  expensesTotal: number;
}

export async function POST(request: Request) {
  let tmpPath = '';
  try {
    const body: GenerateRequest = await request.json();
    const { docType } = body;

    if (!docType || !['estimate', 'invoice'].includes(docType)) {
      return NextResponse.json(
        { error: '無効なテンプレートタイプです（estimate / invoice）' },
        { status: 400 }
      );
    }

    const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_FILE);
    if (!existsSync(templatePath)) {
      return NextResponse.json({ error: 'テンプレートファイルが見つかりません' }, { status: 404 });
    }

    // テンプレートを読み込み（読み取り専用マウントでもOK）
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    // 書き出し先は /tmp（書き込み可能）
    tmpPath = path.join('/tmp', `_tmp_${Date.now()}.xlsx`);
    const ws = workbook.getWorksheet(1);
    if (!ws) {
      return NextResponse.json({ error: 'ワークシートが見つかりません' }, { status: 500 });
    }

    // 請求書の場合はタイトル等のセルを上書き
    if (docType === 'invoice') {
      for (const [cell, value] of Object.entries(INVOICE_OVERRIDES)) {
        ws.getCell(cell).value = value;
      }
    }

    // 入力値のみ書き込み（数式・レイアウト・画像はそのまま）
    // D2: 宛先名（1人目）
    ws.getCell('D2').value = body.addresseeName;
    // H15: 被相続人名
    ws.getCell('H15').value = body.deceasedName;
    // H22: 遺産総額
    ws.getCell('H22').value = body.propertyValue;
    // K27: 路線価土地数
    ws.getCell('K27').value = body.landRosenkaCount;
    // K28: 倍率土地数
    ws.getCell('K28').value = body.landBairitsuCount;
    // K30: 非上場株式数
    ws.getCell('K30').value = body.unlistedStockCount;
    // J32: 相続人数
    ws.getCell('J32').value = body.heirCount;
    // M37: 値引額
    ws.getCell('M37').value = body.discount;
    // M41: 立替金費用
    ws.getCell('M41').value = body.expensesTotal;

    // 上書き保存
    await workbook.xlsx.writeFile(tmpPath);

    // ファイルを読み込んでレスポンス
    const buffer = await readFile(tmpPath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="generated.xlsx"`,
      },
    });
  } catch (e) {
    console.error('テンプレート生成エラー:', e);
    return NextResponse.json(
      { error: 'テンプレート生成に失敗しました: ' + String(e) },
      { status: 500 }
    );
  } finally {
    // 一時ファイル削除
    if (tmpPath && existsSync(tmpPath)) {
      await unlink(tmpPath).catch(() => {});
    }
  }
}
