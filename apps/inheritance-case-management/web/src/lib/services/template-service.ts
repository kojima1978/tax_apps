import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const TEMPLATE_DIR = path.join(process.cwd(), 'templates');

const TEMPLATE_FILES: Record<string, string> = {
  estimate: 'estimate_template.xlsx',
  invoice: 'estimate_template.xlsx',
  'invoice-request': 'invoice_request_template.xlsx',
};

export async function getTemplateBase64(type: string) {
  const fileName = TEMPLATE_FILES[type];
  if (!fileName) return null;
  const filePath = path.join(TEMPLATE_DIR, fileName);
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

export type DocType = 'estimate' | 'invoice' | 'invoice-request';

export interface GenerateTemplateInput {
  docType: DocType;
  addresseeName: string;
  deceasedName: string;
  propertyValue: number;
  landRosenkaCount: number;
  landBairitsuCount: number;
  unlistedStockCount: number;
  heirCount: number;
  discount: number;
  expensesTotal: number;
  specialAdditions?: { description: string; amount: number }[];
  // invoice-request 用
  assigneeName?: string;
  referrerName?: string;
  revenueAmount?: number;
  referralFeeAmount?: number;
}

function formatYen(n: number): string {
  return n.toLocaleString('ja-JP');
}

export async function generateTemplate(input: GenerateTemplateInput): Promise<Buffer> {
  const fileName = TEMPLATE_FILES[input.docType];
  if (!fileName) throw new Error('TEMPLATE_NOT_FOUND');
  const templatePath = path.join(TEMPLATE_DIR, fileName);
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

  if (input.docType === 'invoice-request') {
    fillInvoiceRequest(ws, input);
  } else {
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
    const specialAdditions = (input.specialAdditions || []).slice(0, 2);
    const specialAdditionDescriptionFont: Partial<ExcelJS.Font> = { name: 'ＭＳ 明朝', size: 9, bold: true };
    const specialAdditionDescription1 = ws.getCell('B35');
    const specialAdditionDescription2 = ws.getCell('B36');
    specialAdditionDescription1.value = specialAdditions[0]?.description ? `    ${specialAdditions[0].description}` : null;
    specialAdditionDescription1.font = { ...specialAdditionDescription1.font, ...specialAdditionDescriptionFont };
    ws.getCell('M35').value = specialAdditions[0]?.amount || null;
    specialAdditionDescription2.value = specialAdditions[1]?.description ? `    ${specialAdditions[1].description}` : null;
    specialAdditionDescription2.font = { ...specialAdditionDescription2.font, ...specialAdditionDescriptionFont };
    ws.getCell('M36').value = specialAdditions[1]?.amount || null;
    ws.getCell('M37').value = input.discount ? -Math.abs(input.discount) : null;
    ws.getCell('M42').value = input.expensesTotal;
  }

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

function fillInvoiceRequest(ws: ExcelJS.Worksheet, input: GenerateTemplateInput) {
  const smallFont: Partial<ExcelJS.Font> = { size: 8 };

  // W3: 担当者名
  if (input.assigneeName) {
    ws.getCell('W3').value = input.assigneeName;
  }

  // B4: 発行日
  // テンプレートは =TODAY() 数式 → 指定日で上書き
  // (発行日は addresseeName と同じリクエストで送られてくる前提、
  //  export-excel.ts 側で issueDate を Date に変換して送る)

  // C5: 請求先（被相続人名付き）
  const addressee = input.deceasedName
    ? `${input.addresseeName}（被相続人: ${input.deceasedName}）`
    : input.addresseeName;
  ws.getCell('C5').value = addressee;

  // A18: 紹介者名
  if (input.referrerName) {
    const cell = ws.getCell('A18');
    cell.value = input.referrerName;
    cell.font = { ...cell.font, ...smallFont };
  }

  // A19: 売上・紹介料内訳
  const revenue = input.revenueAmount || 0;
  const referral = input.referralFeeAmount || 0;
  const detailCell = ws.getCell('A19');
  detailCell.value = `売上: ${formatYen(revenue - referral)}円　紹介料: ${formatYen(referral)}円`;
  detailCell.font = { ...detailCell.font, ...smallFont };

  // V18: 報酬額（税抜）
  ws.getCell('V18').value = revenue;

  // H15: 立替金合計
  ws.getCell('H15').value = input.expensesTotal;
}
