/**
 * 見積書・請求書のExcel出力
 *
 * テンプレートファイルが /app/templates/ に存在する場合はそれを読み込んでデータ埋め込み。
 * 存在しない場合はコード内で直接生成（フォールバック）。
 */
import type { InheritanceCase } from '@/types/shared';
import { calcEstimate, type EstimateBreakdown } from './estimate-calc';
import { EXCEL_STYLES as S } from './excel-styles';
import { apiClient } from './api/client';

type DocumentType = 'estimate' | 'invoice';

const TITLES: Record<DocumentType, string> = {
  estimate: '御 見 積 書',
  invoice: '御 請 求 書',
};

const AMOUNT_LABELS: Record<DocumentType, string> = {
  estimate: '御見積金額（税込）',
  invoice: '御請求金額（税込）',
};

// 発行元情報（フォールバック用 — テンプレート使用時は不要）
const ISSUER_INFO = [
  '○○税理士法人',
  '〒000-0000',
  '東京都○○区○○ 1-2-3',
  'TEL: 03-0000-0000',
  'FAX: 03-0000-0001',
];

const TAX_RATE = 0.10; // 消費税率

interface ExportParams {
  caseData: InheritanceCase;
  docType: DocumentType;
  /** 宛先に使う連絡先名のリスト */
  addresseeNames: string[];
  /** 発行日 (YYYY-MM-DD) */
  issueDate: string;
}

/** 明細行を構築 */
function buildDetailRows(breakdown: EstimateBreakdown, caseData: InheritanceCase) {
  const rows: { description: string; detail: string; amount: number }[] = [];

  rows.push({
    description: '基本報酬',
    detail: `遺産総額 × 0.8%`,
    amount: breakdown.baseFee,
  });

  if (breakdown.landRosenkaFee > 0) {
    rows.push({
      description: '土地評価（路線価地域）',
      detail: `${caseData.landRosenkaCount || 0}区分 × ¥10,000`,
      amount: breakdown.landRosenkaFee,
    });
  }

  if (breakdown.landBairitsuFee > 0) {
    rows.push({
      description: '土地評価（倍率地域）',
      detail: `${caseData.landBairitsuCount || 0}区分 × ¥3,000`,
      amount: breakdown.landBairitsuFee,
    });
  }

  if (breakdown.unlistedStockFee > 0) {
    rows.push({
      description: '非上場株式評価',
      detail: `${caseData.unlistedStockCount || 0}社 × ¥100,000`,
      amount: breakdown.unlistedStockFee,
    });
  }

  if (breakdown.heirFee > 0) {
    const additional = Math.max(0, Math.min((caseData.heirCount || 0) - 1, 4));
    rows.push({
      description: '相続人加算',
      detail: `${additional}人 × ¥50,000`,
      amount: breakdown.heirFee,
    });
  }

  return rows;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}年${m}月${day}日`;
}

type CellValue = string | number;
type CellObj = { v: CellValue; s?: object; t?: string };
type Row = (CellValue | CellObj)[];

function cell(v: CellValue, style?: object): CellObj {
  const obj: CellObj = { v, s: style };
  if (typeof v === 'number') obj.t = 'n';
  return obj;
}

/** テンプレートファイルの取得を試みる */
async function fetchTemplate(docType: DocumentType): Promise<ArrayBuffer | null> {
  try {
    const res = await apiClient<{ exists: boolean; data?: string }>(`/templates?type=${docType}`);
    if (res.exists && res.data) {
      const binary = atob(res.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }
  } catch {
    // テンプレートAPI接続失敗 — フォールバック
  }
  return null;
}

export async function exportDocument(params: ExportParams): Promise<void> {
  const { caseData, docType, addresseeNames, issueDate } = params;
  const XLSX = (await import('xlsx-js-style')).default;

  // 金額計算
  const breakdown = calcEstimate({
    propertyValue: caseData.propertyValue || 0,
    landRosenkaCount: caseData.landRosenkaCount || 0,
    landBairitsuCount: caseData.landBairitsuCount || 0,
    unlistedStockCount: caseData.unlistedStockCount || 0,
    heirCount: caseData.heirCount || 0,
  });

  // 見積書は estimateAmount、請求書は feeAmount（ユーザーが転記済みの値を使用）
  const subtotal = docType === 'invoice'
    ? (caseData.feeAmount || 0)
    : (caseData.estimateAmount || 0);
  const tax = Math.floor(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const detailRows = buildDetailRows(breakdown, caseData);
  const addressee = addresseeNames.join('、') + '　様';

  const typeLabel = docType === 'estimate' ? '見積書' : '請求書';
  const dateStr = issueDate.replace(/-/g, '');
  const fileName = `${typeLabel}_${caseData.deceasedName}_${dateStr}.xlsx`;

  // ── テンプレート方式を試行 ──
  const templateBuffer = await fetchTemplate(docType);
  if (templateBuffer) {
    const wb = XLSX.read(templateBuffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // テンプレートにデータを埋め込み
    // TODO: テンプレートのセル位置に合わせて調整が必要
    // 以下は一般的な埋め込みパターン（テンプレート提供後に調整）
    ws['B3'] = { v: addressee, t: 's' };
    ws['E3'] = { v: formatDate(issueDate), t: 's' };
    ws['B5'] = { v: total, t: 'n', z: '#,##0' };

    // 明細行の開始位置（テンプレートに合わせて調整）
    const detailStartRow = 10;
    detailRows.forEach((row, i) => {
      const r = detailStartRow + i;
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: row.description, t: 's' };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: row.detail, t: 's' };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: row.amount, t: 'n', z: '#,##0' };
    });

    // 値引き/調整
    let nextRow = detailStartRow + detailRows.length;
    if (subtotal !== breakdown.total) {
      const diff = subtotal - breakdown.total;
      ws[XLSX.utils.encode_cell({ r: nextRow, c: 0 })] = { v: diff < 0 ? '値引き' : '調整', t: 's' };
      ws[XLSX.utils.encode_cell({ r: nextRow, c: 2 })] = { v: diff, t: 'n', z: '#,##0' };
      nextRow++;
    }

    // 小計・消費税・合計
    ws[XLSX.utils.encode_cell({ r: nextRow, c: 1 })] = { v: '小計', t: 's' };
    ws[XLSX.utils.encode_cell({ r: nextRow, c: 2 })] = { v: subtotal, t: 'n', z: '#,##0' };
    nextRow++;
    ws[XLSX.utils.encode_cell({ r: nextRow, c: 1 })] = { v: `消費税（${TAX_RATE * 100}%）`, t: 's' };
    ws[XLSX.utils.encode_cell({ r: nextRow, c: 2 })] = { v: tax, t: 'n', z: '#,##0' };
    nextRow++;
    ws[XLSX.utils.encode_cell({ r: nextRow, c: 1 })] = { v: '合計（税込）', t: 's' };
    ws[XLSX.utils.encode_cell({ r: nextRow, c: 2 })] = { v: total, t: 'n', z: '#,##0' };

    XLSX.writeFile(wb, fileName);
    return;
  }

  // ── フォールバック: コード生成方式 ──
  const wsData: Row[] = [];

  // Row 0: タイトル
  wsData.push([cell(TITLES[docType], S.title)]);

  // Row 1: 空行
  wsData.push([]);

  // Row 2: 宛名 | | | 発行日
  wsData.push([
    cell(addressee, S.addressee),
    '', '', '',
    cell(`発行日: ${formatDate(issueDate)}`, S.normalRight),
  ]);

  // Row 3: 空行
  wsData.push([]);

  // Row 4: 合計金額
  wsData.push([
    cell(AMOUNT_LABELS[docType], S.subtotalLabel),
    '',
    cell(total, S.totalAmount),
  ]);

  // Row 5: 空行
  wsData.push([]);

  // Row 6: 案件情報
  wsData.push([
    cell('被相続人', S.normal),
    cell(caseData.deceasedName, S.normal),
    '',
    cell('相続開始日', S.normal),
    cell(formatDate(caseData.dateOfDeath), S.normal),
  ]);

  // Row 7: 空行
  wsData.push([]);

  // Row 8: 発行元情報（右側に配置）
  for (const line of ISSUER_INFO) {
    wsData.push(['', '', '', '', cell(line, S.issuer)]);
  }

  // 空行
  wsData.push([]);

  // 明細ヘッダー
  wsData.push([
    cell('項目', S.detailHeader),
    cell('内容', S.detailHeader),
    cell('金額（税抜）', S.detailHeader),
  ]);

  // 明細行
  for (const row of detailRows) {
    wsData.push([
      cell(row.description, S.detailCell),
      cell(row.detail, S.detailCell),
      cell(row.amount, S.detailAmount),
    ]);
  }

  // 値引き/調整行（転記額と計算合計が異なる場合）
  if (subtotal !== breakdown.total) {
    const diff = subtotal - breakdown.total;
    wsData.push([
      cell(diff < 0 ? '値引き' : '調整', S.detailCell),
      cell('', S.detailCell),
      cell(diff, S.detailAmount),
    ]);
  }

  // 小計
  wsData.push([
    cell('', S.detailCell),
    cell('小計', S.subtotalLabel),
    cell(subtotal, S.subtotalAmount),
  ]);

  // 消費税
  wsData.push([
    cell('', S.detailCell),
    cell(`消費税（${TAX_RATE * 100}%）`, S.subtotalLabel),
    cell(tax, S.subtotalAmount),
  ]);

  // 合計
  wsData.push([
    cell('', S.detailCell),
    cell('合計（税込）', S.subtotalLabel),
    cell(total, S.subtotalAmount),
  ]);

  // 空行
  wsData.push([]);

  // 備考
  const noteStartRow = wsData.length;
  wsData.push([cell('備考', S.subtotalLabel)]);
  const noteText = [
    '・基本報酬算定の基礎となる遺産総額は、プラス財産の総額であり、',
    '　債務・葬式費用、小規模宅地の特例、生命保険非課税枠等の控除を行う前の金額です。',
    '・上記金額は消費税込みの金額です。',
  ].join('\n');
  wsData.push([cell(noteText, S.note)]);

  // ── ワークシート作成 ──
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 列幅
  ws['!cols'] = [
    { wch: 22 }, // A: 項目
    { wch: 30 }, // B: 内容
    { wch: 18 }, // C: 金額
    { wch: 14 }, // D: （案件情報ラベル）
    { wch: 24 }, // E: （発行元情報/日付）
  ];

  // 行高
  ws['!rows'] = [
    { hpt: 35 }, // タイトル行
  ];

  // 備考行の高さ
  const noteRow = noteStartRow + 1;
  if (!ws['!rows']) ws['!rows'] = [];
  while (ws['!rows'].length <= noteRow) ws['!rows'].push({});
  ws['!rows'][noteRow] = { hpt: 60 };

  // セル結合
  ws['!merges'] = [
    // タイトル行: A1:E1
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    // 宛名: A3:C3
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    // 合計金額ラベル: A5:B5
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    // 合計金額値: C5:E5
    { s: { r: 4, c: 2 }, e: { r: 4, c: 4 } },
    // 備考タイトル
    { s: { r: noteStartRow, c: 0 }, e: { r: noteStartRow, c: 4 } },
    // 備考本文
    { s: { r: noteRow, c: 0 }, e: { r: noteRow, c: 4 } },
  ];

  // 印刷設定
  ws['!pageSetup'] = {
    fitToWidth: 1,
    fitToHeight: 0,
    orientation: 'portrait',
    paperSize: 9, // A4
  };

  // ── ブック作成・ダウンロード ──
  const wb = XLSX.utils.book_new();
  const sheetName = docType === 'estimate' ? '見積書' : '請求書';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}
