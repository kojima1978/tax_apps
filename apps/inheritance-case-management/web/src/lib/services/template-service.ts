import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const TEMPLATE_DIR = path.join(process.cwd(), 'templates');
const TEMPLATE_FILE = 'estimate_template.xlsx';

export async function getTemplateBase64(type: string) {
  const filePath = path.join(TEMPLATE_DIR, TEMPLATE_FILE);
  if (!existsSync(filePath)) return null;

  const buffer = await readFile(filePath);
  return buffer.toString('base64');
}

const INVOICE_OVERRIDES: Record<string, string> = {
  B11: '相 続 税 申 告 報 酬 請 求 書',
  B14: '下記計算書の通り御請求申し上げます。',
  B17: '御請求額',
  B41: ' ４．立替金費用（戸籍謄本・不動産登記事項閲覧・残高証明書発行手数料等）',
  B43: '御　請　求　額',
  B44: '振　込　先',
  E44: '　阿波銀行（銀行コード：0172）蔵本支店（店番号：117）\n　普通預金 №１１３５４１７　ゼイ）マスエージェント\n　（振込手数料はお客様にてご負担をお願い致します。）',
};

export interface GenerateTemplateInput {
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

export async function generateTemplate(input: GenerateTemplateInput): Promise<Buffer> {
  const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_FILE);
  if (!existsSync(templatePath)) {
    throw new Error('TEMPLATE_NOT_FOUND');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const tmpPath = path.join('/tmp', `_tmp_${Date.now()}.xlsx`);
  const ws = workbook.getWorksheet(1);
  if (!ws) {
    throw new Error('WORKSHEET_NOT_FOUND');
  }

  if (input.docType === 'invoice') {
    for (const [cell, value] of Object.entries(INVOICE_OVERRIDES)) {
      ws.getCell(cell).value = value;
    }
    ws.name = '請求書';
  }

  ws.getCell('D2').value = input.addresseeName;
  ws.getCell('H15').value = input.deceasedName;
  ws.getCell('H22').value = input.propertyValue;
  ws.getCell('K27').value = input.landRosenkaCount;
  ws.getCell('K28').value = input.landBairitsuCount;
  ws.getCell('K30').value = input.unlistedStockCount;
  ws.getCell('J32').value = input.heirCount;
  ws.getCell('M37').value = input.discount;
  ws.getCell('M41').value = input.expensesTotal;

  try {
    await workbook.xlsx.writeFile(tmpPath);
    const buffer = await readFile(tmpPath);
    return buffer;
  } finally {
    if (existsSync(tmpPath)) {
      await unlink(tmpPath).catch(() => {});
    }
  }
}
