import XLSX from 'xlsx-js-style';
import type { Asset } from '@/types';
import { CATEGORY_ORDER, CATEGORY_CONFIG } from '@/types';
import { formatDate } from '@/utils/formatters';
import { calcWithin3YearsDate } from '@/utils/calculation';

/** 列ヘッダー */
const COLUMN_HEADERS = [
  'NO',
  '減価償却資産の名称等',
  '取得年月',
  '課税時期',
  '経過年数',
  '耐用年数',
  '取得価額',
  '', // 償却額 or 償却率（カテゴリで変動）
  '相続税評価額',
  '期末簿価',
  'その他',
];

/** 列幅（wch） */
const COL_WIDTHS = [6, 30, 12, 12, 8, 8, 15, 15, 15, 15, 20];

/** 評価通達の条文テキスト */
const REGULATION_TEXTS = [
  '＜評基通89-2＞ 文化財建造物である家屋以外の家屋の評価',
  '　家屋（文化財建造物である家屋を除く。）の評価は、その家屋の固定資産税評価額に別表1に定める倍率を乗じて計算した金額によって評価する。',
  '　ただし、固定資産税評価額がない場合は、その家屋と状況の類似するものの固定資産税評価額を基とし、付近の家屋との',
  '　構造、経過年数等の差を考慮して評定した価額に別表1に定める倍率を乗じた金額によって評価する。',
  '　(2) 上記により難い場合は、その家屋の再建築価額から経過年数に応ずる減価の額を控除した金額の100分の70に相当する金額。',
  '',
  '＜評基通92＞ 附属設備等の評価',
  '　家屋と構造上一体となっている設備は、家屋の評価額に含めて評価する。',
  '　家屋の附属設備で、家屋と構造上一体とならないもの（例：ルームエアコン等）は、',
  '　再建築価額から経過年数に応ずる減価の額を控除した金額の100分の70に相当する金額によって評価する。',
  '',
  '＜評基通97＞ 構築物の評価',
  '　構築物の価額は、その構築物の再建築価額から、建築の時から課税時期までの期間（その期間に1年未満の端数があるときは、',
  '　その端数は1年とする。）の償却費の額の合計額又は減価の額を控除した金額の100分の70に相当する金額によって評価する。',
  '',
  '＜評基通128～130＞ 一般動産の評価',
  '　一般動産の価額は、原則として、売買実例価額、精通者意見価格等を参酌して評価する。',
  '　ただし、売買実例価額等が明らかでないものは、その動産と同種及び同規格の新品の課税時期における小売価額から、',
  '　製造の時から課税時期までの期間の償却費の額の合計額を控除した金額によって評価する。',
  '　償却費の額は、定率法によって計算し、その計算に当たっては耐用年数省令に規定する耐用年数による。',
];

/** 基本フォント */
const BASE_FONT = { name: 'MS ゴシック', sz: 10 };

/** 太字フォント */
const BOLD_FONT = { ...BASE_FONT, bold: true };

/** ヘッダー背景色 */
const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } };

/** 薄い罫線スタイル */
const THIN_BORDER = { style: 'thin', color: { rgb: '000000' } } as const;

/** 横線のみ（上下） */
const HORIZONTAL_BORDER = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
};

/** 上罫線のみ（合計行用） */
const TOP_BORDER = {
  top: THIN_BORDER,
};

/** 下罫線のみ */
const BOTTOM_BORDER = {
  bottom: THIN_BORDER,
};

/** セルスタイル生成ヘルパー */
function textCell(
  value: string,
  options?: { bold?: boolean; fill?: boolean; alignment?: XLSX.CellStyle['alignment']; border?: XLSX.CellStyle['border'] }
): XLSX.CellObject {
  const style: XLSX.CellStyle = { font: options?.bold ? BOLD_FONT : BASE_FONT };
  if (options?.fill) style.fill = HEADER_FILL;
  if (options?.alignment) style.alignment = options.alignment;
  if (options?.border) style.border = options.border;
  return { v: value, t: 's', s: style };
}

function numberCell(
  value: number,
  options?: { bold?: boolean; fill?: boolean; format?: string; border?: XLSX.CellStyle['border'] }
): XLSX.CellObject {
  const style: XLSX.CellStyle = {
    font: options?.bold ? BOLD_FONT : BASE_FONT,
    alignment: { horizontal: 'right' },
    numFmt: options?.format ?? '#,##0',
  };
  if (options?.fill) style.fill = HEADER_FILL;
  if (options?.border) style.border = options.border;
  return { v: value, t: 'n', s: style };
}

/** メインのExcel出力関数 */
export function exportToExcel(
  caseName: string,
  taxDate: string,
  assets: Asset[]
): void {
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  let row = 0;
  const colCount = 11; // A~K

  // ---- Row 1: 案件名 ----
  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell(caseName, { bold: true });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: colCount - 1 } });
  row++;

  // ---- Row 2: 課税時期 ----
  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell('課税時期', { bold: true });
  ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = textCell(formatDate(taxDate));
  row++;

  // ---- Row 3: 3年以内 ----
  const within3YearsDate = calcWithin3YearsDate(taxDate);
  const w3y = within3YearsDate.getFullYear();
  const w3m = String(within3YearsDate.getMonth() + 1).padStart(2, '0');
  const w3d = String(within3YearsDate.getDate()).padStart(2, '0');
  const within3YearsStr = `${w3y}/${w3m}/${w3d}`;
  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell('3年以内', { bold: true });
  ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = textCell(within3YearsStr);
  row++;

  // ---- Row 4: 空行 ----
  row++;

  // ---- カテゴリ別セクション ----
  for (const category of CATEGORY_ORDER) {
    const categoryAssets = assets.filter((a) => a.category === category);
    if (categoryAssets.length === 0) continue;

    const config = CATEGORY_CONFIG[category];

    // カテゴリヘッダー行
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell(
      config.excelHeader,
      { bold: true }
    );
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: colCount - 1 } });
    row++;

    // カラムヘッダー行
    const headers = [...COLUMN_HEADERS];
    headers[7] = config.headerLabel; // 償却額 or 償却率
    for (let c = 0; c < headers.length; c++) {
      ws[XLSX.utils.encode_cell({ r: row, c })] = textCell(headers[c]!, {
        bold: true,
        fill: true,
        alignment: { horizontal: 'center' },
        border: HORIZONTAL_BORDER,
      });
    }
    row++;

    // データ行
    let sumAcquisitionCost = 0;
    let sumEvaluationAmount = 0;
    let sumBookValue = 0;

    for (const asset of categoryAssets) {
      // A: NO
      ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = numberCell(asset.no, { format: '0' });

      // B: 名称
      ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = textCell(asset.name);

      // C: 取得年月
      ws[XLSX.utils.encode_cell({ r: row, c: 2 })] = textCell(formatDate(asset.acquisitionDate));

      // D: 課税時期
      ws[XLSX.utils.encode_cell({ r: row, c: 3 })] = textCell(formatDate(taxDate));

      // E: 経過年数
      ws[XLSX.utils.encode_cell({ r: row, c: 4 })] = numberCell(asset.elapsedYears, { format: '0' });

      // F: 耐用年数
      ws[XLSX.utils.encode_cell({ r: row, c: 5 })] = numberCell(asset.usefulLife, { format: '0' });

      // G: 取得価額
      ws[XLSX.utils.encode_cell({ r: row, c: 6 })] = numberCell(asset.acquisitionCost);

      // H: 償却額 or 償却率
      if (category === '建物') {
        // 建物は償却額（金額）
        ws[XLSX.utils.encode_cell({ r: row, c: 7 })] = numberCell(
          asset.depreciationAmountOrRate
        );
      } else {
        // 他は償却率（小数）
        ws[XLSX.utils.encode_cell({ r: row, c: 7 })] = numberCell(
          asset.depreciationAmountOrRate,
          { format: '0.000' }
        );
      }

      // I: 相続税評価額
      if (asset.evaluationAmount === null) {
        ws[XLSX.utils.encode_cell({ r: row, c: 8 })] = textCell('-', {
          alignment: { horizontal: 'center' },
        });
      } else {
        ws[XLSX.utils.encode_cell({ r: row, c: 8 })] = numberCell(asset.evaluationAmount);
        sumEvaluationAmount += asset.evaluationAmount;
      }

      // J: 期末簿価
      ws[XLSX.utils.encode_cell({ r: row, c: 9 })] = numberCell(asset.bookValue);

      // K: その他（評価根拠）
      ws[XLSX.utils.encode_cell({ r: row, c: 10 })] = textCell(asset.evaluationBasis);

      sumAcquisitionCost += asset.acquisitionCost;
      sumBookValue += asset.bookValue;
      row++;
    }

    // 合計行（A列から全列に上罫線）
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell('', { border: TOP_BORDER });
    ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = textCell('合　計', {
      bold: true,
      border: TOP_BORDER,
    });
    for (let c = 2; c <= 5; c++) {
      ws[XLSX.utils.encode_cell({ r: row, c })] = textCell('', { border: TOP_BORDER });
    }
    ws[XLSX.utils.encode_cell({ r: row, c: 6 })] = numberCell(sumAcquisitionCost, {
      bold: true,
      border: TOP_BORDER,
    });
    ws[XLSX.utils.encode_cell({ r: row, c: 7 })] = textCell('', { border: TOP_BORDER });
    ws[XLSX.utils.encode_cell({ r: row, c: 8 })] = numberCell(sumEvaluationAmount, {
      bold: true,
      border: TOP_BORDER,
    });
    ws[XLSX.utils.encode_cell({ r: row, c: 9 })] = numberCell(sumBookValue, {
      bold: true,
      border: TOP_BORDER,
    });
    ws[XLSX.utils.encode_cell({ r: row, c: 10 })] = textCell('', { border: TOP_BORDER });
    row++;

    // 空行（カテゴリ間）
    row++;
  }

  // ---- 評価通達条文テキスト ----
  for (const text of REGULATION_TEXTS) {
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell(text);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: colCount - 1 } });
    row++;
  }

  // ---- ワークシート設定 ----
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: colCount - 1 } });
  ws['!merges'] = merges;
  ws['!cols'] = COL_WIDTHS.map((wch) => ({ wch }));

  // 印刷設定: A4横、全列を1ページに収める
  ws['!pageSetup'] = {
    paperSize: 9,        // A4
    orientation: 'landscape',
    fitToWidth: 1,       // 全列を1ページ幅に収める
    fitToHeight: 0,      // 行方向は制限なし（複数ページ可）
    scale: 0,            // fitToWidth/Heightを有効にするため0
  };
  ws['!margins'] = {
    left: 0.3,
    right: 0.3,
    top: 0.4,
    bottom: 0.4,
    header: 0.2,
    footer: 0.2,
  };

  // フッターにページ番号
  ws['!headerFooter'] = {
    oddFooter: '&C&P / &N',
  };

  // ---- ワークブック作成・出力 ----
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '減価償却資産');
  const dateStr = taxDate.replace(/-/g, '');
  XLSX.writeFile(wb, `${caseName}_減価償却資産評価_${dateStr}.xlsx`);
}
