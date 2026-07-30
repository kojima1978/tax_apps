import XLSX from 'xlsx-js-style';
import type { Asset } from '@/types';
import { CATEGORY_CONFIG, groupByLabel } from '@/types';
import { RATE_TABLE } from '@/data/rateTable';
import { calcWithin3YearsDate, getCalculationTooltip } from '@/utils/calculation';
import { formatWareki } from '@/utils/formatters';

/** 列ヘッダー */
const COLUMN_HEADERS = [
  'NO',
  '減価償却資産の名称等',
  '取得年月',
  '課税時期',
  '経過年数',
  '耐用年数',
  '取得価額',
  '', // 償却額 or 残価率（カテゴリで変動）
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
const BASE_FONT = { name: 'Arial', sz: 10 };

/** 太字フォント */
const BOLD_FONT = { ...BASE_FONT, bold: true };

/** ヘッダー背景色（明るい緑） */
const HEADER_FILL = { fgColor: { rgb: 'C6EFCE' } };

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

/** 共通印刷設定: A4横、全列を1ページに収める */
const PAGE_SETUP = {
  paperSize: 9,
  orientation: 'landscape' as const,
  fitToWidth: 1,
  fitToHeight: 0,
  scale: 0,
};

/** 共通マージン設定 */
const MARGINS = {
  left: 0.3,
  right: 0.3,
  top: 0.4,
  bottom: 0.4,
  header: 0.2,
  footer: 0.2,
};

/** Excel標準の和暦日付表示（例: R08.07.01） */
const JAPANESE_ERA_DATE_FORMAT = '[$-ja-JP-x-gannen]gee"."mm"."dd';

/** 残価率表シート名（本表H列の数式から参照するため定数化） */
const RATE_SHEET_NAME = '残価率表';

/** 残価率表の縦軸（経過年数）: RATE_TABLEから導出 */
const RATE_ELAPSED_YEARS = Object.keys(RATE_TABLE)
  .map(Number)
  .sort((a, b) => a - b);

/** 残価率表の横軸（耐用年数）: RATE_TABLEの全行に現れる列の和集合 */
const RATE_USEFUL_LIVES = [
  ...new Set(
    Object.values(RATE_TABLE).flatMap((row) => Object.keys(row).map(Number))
  ),
].sort((a, b) => a - b);

/** 残価率表: タイトル2行 + 空行1行の後にヘッダー行が来る（0-based） */
const RATE_HEADER_ROW = 3;
const RATE_DATA_START_ROW = RATE_HEADER_ROW + 1;

/** 残価率表の参照範囲（Excelの1-based行番号・列名） */
const RATE_REF = {
  headerRow: RATE_HEADER_ROW + 1,
  dataStartRow: RATE_DATA_START_ROW + 1,
  dataEndRow: RATE_DATA_START_ROW + RATE_ELAPSED_YEARS.length,
  firstLifeCol: XLSX.utils.encode_col(1),
  lastLifeCol: XLSX.utils.encode_col(RATE_USEFUL_LIVES.length),
} as const;

/**
 * 残価率（未償却残額割合）をINDEX/MATCHで残価率表から引く数式。
 * calculation.ts の getUndepreciatedRate と同じ判定順を再現する:
 *   経過年数 ≧ 耐用年数 → 0 ／ 経過年数 ≦ 0 → 1 ／ 表に無い組合せ → 0
 */
function undepreciatedRateFormula(excelRow: number): string {
  const sheet = `'${RATE_SHEET_NAME}'`;
  const { headerRow, dataStartRow, dataEndRow, firstLifeCol, lastLifeCol } = RATE_REF;
  const matrix = `${sheet}!$${firstLifeCol}$${dataStartRow}:$${lastLifeCol}$${dataEndRow}`;
  const elapsedAxis = `${sheet}!$A$${dataStartRow}:$A$${dataEndRow}`;
  const lifeAxis = `${sheet}!$${firstLifeCol}$${headerRow}:$${lastLifeCol}$${headerRow}`;
  const lookup = `INDEX(${matrix},MATCH(E${excelRow},${elapsedAxis},0),MATCH(F${excelRow},${lifeAxis},0))`;
  return `IF(E${excelRow}>=F${excelRow},0,IF(E${excelRow}<=0,1,IFERROR(${lookup},0)))`;
}


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
  options?: {
    bold?: boolean;
    fill?: boolean;
    format?: string;
    border?: XLSX.CellStyle['border'];
    alignment?: XLSX.CellStyle['alignment'];
  }
): XLSX.CellObject {
  const style: XLSX.CellStyle = {
    font: options?.bold ? BOLD_FONT : BASE_FONT,
    alignment: options?.alignment ?? { horizontal: 'right' },
    numFmt: options?.format ?? '#,##0',
  };
  if (options?.fill) style.fill = HEADER_FILL;
  if (options?.border) style.border = options.border;
  return { v: value, t: 'n', s: style };
}

function formulaNumberCell(
  formula: string,
  cachedValue: number,
  options?: { bold?: boolean; format?: string; border?: XLSX.CellStyle['border'] }
): XLSX.CellObject {
  const cell = numberCell(cachedValue, options);
  cell.f = formula;
  return cell;
}

/** 建物の償却額は定額法の数式、その他の残価率は残価率表への参照数式を出力 */
function depreciationFormulaCell(asset: Asset, row: number): XLSX.CellObject {
  const { valuationMethod } = CATEGORY_CONFIG[asset.category];

  if (valuationMethod === 'bookValue' || valuationMethod === 'none') {
    return textCell('-', { alignment: { horizontal: 'center' } });
  }

  const excelRow = row + 1;

  if (valuationMethod !== 'building') {
    return formulaNumberCell(
      undepreciatedRateFormula(excelRow),
      asset.depreciationAmountOrRate,
      { format: '0.000' }
    );
  }

  return formulaNumberCell(
    `IF(E${excelRow}>=F${excelRow},G${excelRow}*0.9,G${excelRow}*0.9*(E${excelRow}/F${excelRow}))`,
    asset.depreciationAmountOrRate
  );
}

function sumFormulaCell(
  column: number,
  startRow: number,
  endRow: number,
  cachedValue: number,
  options?: { bold?: boolean; border?: XLSX.CellStyle['border'] }
): XLSX.CellObject {
  const columnName = XLSX.utils.encode_col(column);
  return formulaNumberCell(
    `SUM(${columnName}${startRow + 1}:${columnName}${endRow + 1})`,
    cachedValue,
    options
  );
}

/** 相続税評価額をExcel数式で算出 */
function evaluationFormulaCell(asset: Asset, row: number): XLSX.CellObject {
  if (asset.evaluationAmount === null) {
    return textCell('-', { alignment: { horizontal: 'center' } });
  }

  const excelRow = row + 1;
  const config = CATEGORY_CONFIG[asset.category];
  let formula: string;

  if (asset.evaluationBasis === '3年内_簿価' || asset.evaluationBasis === '簿価') {
    formula = `J${excelRow}`;
  } else if (asset.evaluationBasis === '財産性なし') {
    formula = `G${excelRow}*0`;
  } else if (config.valuationMethod === 'building') {
    const rentalFactor = asset.isRental ? '*0.7' : '';
    formula = `ROUNDDOWN((G${excelRow}-H${excelRow})*0.7${rentalFactor},0)`;
  } else {
    const valuationFactor = config.multiply07 ? '*0.7' : '';
    const rentalFactor = asset.isRental && config.hasRental ? '*0.7' : '';
    formula = `ROUNDDOWN(G${excelRow}*H${excelRow}${valuationFactor}${rentalFactor},0)`;
  }

  return formulaNumberCell(formula, asset.evaluationAmount);
}

/** 計算可能なExcel日付セル */
function dateCell(dateStr: string): XLSX.CellObject {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return textCell(dateStr);

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  if (isNaN(date.getTime())) return textCell(dateStr);

  return {
    v: date,
    t: 'd',
    z: JAPANESE_ERA_DATE_FORMAT,
    s: {
      font: BASE_FONT,
      alignment: { horizontal: 'center' },
      numFmt: JAPANESE_ERA_DATE_FORMAT,
    },
  };
}

/** メインのExcel出力関数 */
export function exportToExcel(
  caseName: string,
  taxDate: string,
  assets: Asset[],
  /** Step3で入れ替えたカテゴリの表示順（未指定＝標準順） */
  labelOrder?: string[]
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
  ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = dateCell(taxDate);
  row++;

  // ---- Row 3: 3年以内（和暦表記） ----
  const within3YearsDate = calcWithin3YearsDate(taxDate);
  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell('3年以内', { bold: true });
  ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = textCell(formatWareki(within3YearsDate));
  row++;

  // ---- Row 4: 空行 ----
  row++;

  // ---- カテゴリラベル別セクション ----
  const labelGroups = groupByLabel(assets, labelOrder);
  for (const [label, categoryAssets] of labelGroups) {
    const category = categoryAssets[0]!.category;
    const config = CATEGORY_CONFIG[category];

    // カテゴリヘッダー行
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell(
      `【　${label}　】`,
      { bold: true }
    );
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: colCount - 1 } });
    row++;

    // カラムヘッダー行
    const headers = [...COLUMN_HEADERS];
    headers[7] = config.headerLabel; // 償却額 or 残価率
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
    const dataStartRow = row;
    let sumAcquisitionCost = 0;
    let sumEvaluationAmount = 0;
    let sumBookValue = 0;

    for (const asset of categoryAssets) {
      // A: NO
      ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = numberCell(asset.no, { format: '0' });

      // B: 名称
      ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = textCell(asset.name);

      // C: 取得年月
      ws[XLSX.utils.encode_cell({ r: row, c: 2 })] = dateCell(asset.acquisitionDate);

      // D: 課税時期
      ws[XLSX.utils.encode_cell({ r: row, c: 3 })] = dateCell(taxDate);

      // E: 経過年数
      ws[XLSX.utils.encode_cell({ r: row, c: 4 })] = numberCell(asset.elapsedYears, { format: '0' });

      // F: 耐用年数
      ws[XLSX.utils.encode_cell({ r: row, c: 5 })] = numberCell(asset.usefulLife, { format: '0' });

      // G: 取得価額
      ws[XLSX.utils.encode_cell({ r: row, c: 6 })] = numberCell(asset.acquisitionCost);

      // H: 建物の償却額はExcel数式、その他は残価率の数値
      ws[XLSX.utils.encode_cell({ r: row, c: 7 })] = depreciationFormulaCell(asset, row);

      // I: 相続税評価額（Excel数式）
      ws[XLSX.utils.encode_cell({ r: row, c: 8 })] = evaluationFormulaCell(asset, row);
      if (asset.evaluationAmount !== null) {
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
    const dataEndRow = row - 1;

    // 合計行（A列から全列に上罫線）
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell('', { border: TOP_BORDER });
    ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = textCell('合　計', {
      bold: true,
      border: TOP_BORDER,
    });
    for (let c = 2; c <= 5; c++) {
      ws[XLSX.utils.encode_cell({ r: row, c })] = textCell('', { border: TOP_BORDER });
    }
    ws[XLSX.utils.encode_cell({ r: row, c: 6 })] = sumFormulaCell(
      6,
      dataStartRow,
      dataEndRow,
      sumAcquisitionCost,
      { bold: true, border: TOP_BORDER }
    );
    ws[XLSX.utils.encode_cell({ r: row, c: 7 })] = textCell('', { border: TOP_BORDER });
    ws[XLSX.utils.encode_cell({ r: row, c: 8 })] = sumFormulaCell(
      8,
      dataStartRow,
      dataEndRow,
      sumEvaluationAmount,
      { bold: true, border: TOP_BORDER }
    );
    ws[XLSX.utils.encode_cell({ r: row, c: 9 })] = sumFormulaCell(
      9,
      dataStartRow,
      dataEndRow,
      sumBookValue,
      { bold: true, border: TOP_BORDER }
    );
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

  ws['!pageSetup'] = PAGE_SETUP;
  ws['!margins'] = MARGINS;

  // フッターにページ番号
  ws['!headerFooter'] = {
    oddFooter: '&C&P / &N',
  };

  // ---- ワークブック作成 ----
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '減価償却資産');

  // ---- 計算根拠シート ----
  const basisWs = createBasisSheet(assets, labelOrder);
  XLSX.utils.book_append_sheet(wb, basisWs, '計算根拠');

  // ---- 残価率表シート（本表H列の数式参照先） ----
  XLSX.utils.book_append_sheet(wb, createRateTableSheet(), RATE_SHEET_NAME);

  const dateStr = taxDate.replace(/-/g, '');
  XLSX.writeFile(wb, `${caseName}_減価償却資産評価_${dateStr}.xlsx`);
}

/**
 * 残価率表シートを作成（縦=経過年数 × 横=耐用年数のマトリクス）。
 * 利用者が本表の残価率を突き合わせて確認するための参照資料であり、
 * 同時に本表H列のINDEX/MATCH参照先も兼ねる。
 */
function createRateTableSheet(): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  const colCount = RATE_USEFUL_LIVES.length + 1; // A列(経過年数) + 耐用年数列

  const setCell = (r: number, c: number, cell: XLSX.CellObject) => {
    ws[XLSX.utils.encode_cell({ r, c })] = cell;
  };

  // ---- Row 1: タイトル ----
  setCell(0, 0, textCell('定率法 未償却残額表（平成24年4月1日以後取得分）', { bold: true }));
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } });

  // ---- Row 2: 軸の説明 ----
  setCell(
    1,
    0,
    textCell(
      '縦：経過年数（年）　横：耐用年数（年）　※空欄は経過年数が耐用年数に達した領域（残価率0）'
    )
  );
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } });

  // ---- Row 3: 空行 ----

  // ---- ヘッダー行: 耐用年数 ----
  const headerOptions = {
    bold: true,
    fill: true,
    border: HORIZONTAL_BORDER,
    alignment: { horizontal: 'center' as const },
  };
  setCell(
    RATE_HEADER_ROW,
    0,
    textCell('経過年数＼耐用年数', headerOptions)
  );
  RATE_USEFUL_LIVES.forEach((life, i) => {
    // MATCHで引くため文字列ではなく数値で出力する
    setCell(RATE_HEADER_ROW, i + 1, numberCell(life, { ...headerOptions, format: '0' }));
  });

  // ---- データ行 ----
  RATE_ELAPSED_YEARS.forEach((elapsed, rowIndex) => {
    const r = RATE_DATA_START_ROW + rowIndex;
    // A列: 経過年数（MATCHで引くため数値）
    setCell(
      r,
      0,
      numberCell(elapsed, {
        bold: true,
        fill: true,
        format: '0',
        alignment: { horizontal: 'center' },
      })
    );

    RATE_USEFUL_LIVES.forEach((life, i) => {
      const rate = RATE_TABLE[elapsed]?.[life];
      if (rate === undefined) return; // 償却済み領域は空欄
      setCell(r, i + 1, numberCell(rate, { format: '0.000' }));
    });
  });

  // ---- シート設定 ----
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: RATE_DATA_START_ROW + RATE_ELAPSED_YEARS.length - 1, c: colCount - 1 },
  });
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 18 },
    ...RATE_USEFUL_LIVES.map(() => ({ wch: 6.5 })),
  ];
  ws['!margins'] = MARGINS;
  // 注: xlsx-js-style は !pageSetup / !headerFooter を出力しないため設定しない

  return ws;
}

/** 計算根拠シートを作成（カテゴリ別・NO昇順） */
function createBasisSheet(
  assets: Asset[],
  labelOrder?: string[]
): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  let row = 0;
  const colCount = 4; // A~D: NO, 名称, 評価額, 計算根拠

  // タイトル
  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell('計算根拠一覧', { bold: true });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: colCount - 1 } });
  row++;
  row++; // 空行

  const basisGroups = groupByLabel(
    assets.filter((a) => a.evaluationAmount !== null),
    labelOrder
  );
  for (const [label, rawAssets] of basisGroups) {
    const catAssets = rawAssets.sort((a, b) => a.no - b.no);
    if (catAssets.length === 0) continue;

    // カテゴリヘッダー
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = textCell(
      label,
      { bold: true }
    );
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: colCount - 1 } });
    row++;

    // カラムヘッダー
    const headers = ['NO', '資産名称', '評価額', '計算根拠'];
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
    for (const asset of catAssets) {
      ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = numberCell(asset.no, { format: '0' });
      ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = textCell(asset.name);
      ws[XLSX.utils.encode_cell({ r: row, c: 2 })] = numberCell(asset.evaluationAmount!);
      ws[XLSX.utils.encode_cell({ r: row, c: 3 })] = textCell(
        getCalculationTooltip(asset).replace(/\n/g, '  ')
      );
      row++;
    }

    // 空行
    row++;
  }

  // シート設定
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(row - 1, 0), c: colCount - 1 },
  });
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 15 }, { wch: 80 }];
  ws['!pageSetup'] = PAGE_SETUP;
  ws['!margins'] = MARGINS;

  return ws;
}
