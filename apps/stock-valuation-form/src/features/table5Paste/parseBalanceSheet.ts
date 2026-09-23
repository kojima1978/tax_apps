// 第5表「１．資産及び負債の金額」へ、決算書・試算表からコピーした明細を貼り付けて取り込む。
//
// 様式の欄は 科目／相続税評価額／帳簿価額／備考 の4列で、貼り付け元の列とは1対1に対応する。
// ここでやらないことを先に書いておく（どれも人が判断する部分で、機械が触ると事故になる）:
//
//   - 円と千円の換算はしない。様式の単位は千円なので、貼り付ける側で揃えてもらう
//     （桁が1000倍ずれて入るより、数字がそのまま入るほうが気づける）
//   - 科目を合算しない。まとめ方は評価の判断そのもので、通達上も科目ごとに並べる
//   - 端数処理をしない。小数が混じっていたらエラーにして取り込まない
//   - 備考（株式等・土地等）を推測しない。資産側は選択肢に完全一致する行だけ採用する
//   - 相続税評価額を帳簿価額から埋めない。同額でよいかは人が決めることで、
//     同額にしたいときは既存のセル右クリック（相続税評価額 → 帳簿価額にコピー）がある

import {
  type ColumnAssignment,
  type ExtractResult,
  type FieldDef,
  type PastedTable,
  type RowIssue,
  cellOf,
  guessAssignment,
  missingRequired,
  parseDecimal,
  toHalfWidth,
} from '@/features/pastedTable/parseTable';
import { isNonEvaluableAsset } from '@/components/tables/table5/Table5Grid';

/** 様式のフィールド接頭辞に合わせる（a_1_1 … / l_1_1 …）。 */
export type BalanceSheetSide = 'a' | 'l';

export type BalanceSheetField = 'name' | 'evaluated' | 'book' | 'note';

/**
 * 貼り付けに要求する列。
 *
 * 金額はどちらも必須にしない。試算表からのコピーは帳簿価額しか持っていないことが多く、
 * 相続税評価額は後から人が入れるため（両方とも列が決まっていない取り込みだけを弾く）。
 */
export const BALANCE_SHEET_FIELDS: ReadonlyArray<FieldDef<BalanceSheetField>> = [
  { key: 'name', label: '科目', required: true, kind: 'text', headerPattern: /科目|勘定|項目|名称/ },
  {
    key: 'evaluated',
    label: '相続税評価額',
    required: false,
    kind: 'integer',
    headerPattern: /相続税評価額|相続税|評価額/,
    // 「帳簿価額」を評価額側に吸わせない。
    headerExclude: /帳簿|簿価/,
  },
  { key: 'book', label: '帳簿価額', required: false, kind: 'integer', headerPattern: /帳簿|簿価/ },
  { key: 'note', label: '備考', required: false, kind: 'text', headerPattern: /備考|摘要/ },
];

/** 資産の備考は様式上の選択肢しか取らない（第5表の「株式等」「土地等」）。 */
const ASSET_NOTES: readonly string[] = ['株式等', '土地等'];

/** 見出し行とみられる科目名。貼り付け範囲に見出しが混ざっていても明細の1行にしない。 */
const HEADER_NAME = /^(科目|勘定科目|項目|名称|資産の部|負債の部)$/;

/** 合計・小計とみられる科目名。②に二重計上されるため取り込まない。 */
const TOTAL_NAME = /合計|小計|総計|^計$/;

export interface BalanceSheetRow {
  line: number;
  /** いずれも様式のセルへそのまま入れる文字列（単位は千円のまま）。 */
  name: string;
  evaluated: string;
  book: string;
  note: string;
}

export interface BalanceSheetResult extends ExtractResult<BalanceSheetRow> {
  /** 取り込むが一部の欄を落とした行（資産の備考が選択肢に無かった等）。 */
  notices: RowIssue[];
}

/**
 * 列の割り当てを推測する。
 *
 * 共通の推測は見出し行が頼りで、見出しの無い表では数値欄しか埋まらない。
 * 決算書のコピーは「科目 → 金額」の並びで見出しを含まないことが多いので、
 * 数字がひとつも無い列を科目とみなして補う。
 */
export function guessBalanceSheetAssignment(
  table: PastedTable,
  fields: ReadonlyArray<FieldDef<BalanceSheetField>>,
): ColumnAssignment<BalanceSheetField> {
  const assignment = guessAssignment(table, fields);
  if (assignment.name !== undefined) return assignment;

  const used = new Set<number | undefined>(Object.values(assignment));
  for (let column = 0; column < table.columnCount; column += 1) {
    if (used.has(column)) continue;
    const cells = table.rows.map(({ cells: row }) => (row[column] ?? '').trim());
    const hasText = cells.some((cell) => cell !== '' && parseDecimal(cell) === null);
    const hasNumber = cells.some((cell) => cell !== '' && parseDecimal(cell) !== null);
    if (hasText && !hasNumber) return { ...assignment, name: column };
  }
  return assignment;
}

type Amount = { text: string; reason?: undefined } | { text?: undefined; reason: string };

/** 金額セルの読み取り。空は空のまま返し、読めないときだけ理由を返す。 */
function readAmount(raw: string, label: string): Amount {
  const text = raw.trim();
  if (text === '') return { text: '' };

  const value = parseDecimal(text);
  if (value === null) return { reason: `${label}「${text}」が金額として読めません` };
  if (!Number.isInteger(value)) {
    return { reason: `${label}「${text}」に小数があります（千円単位に整えてから貼り付けてください）` };
  }
  return { text: String(value) };
}

export function extractBalanceSheetRows(
  table: PastedTable,
  assignment: ColumnAssignment<BalanceSheetField>,
  side: BalanceSheetSide,
): BalanceSheetResult {
  const rows: BalanceSheetRow[] = [];
  const skipped: RowIssue[] = [];
  const errors: RowIssue[] = [];
  const notices: RowIssue[] = [];

  const missing = missingRequired(BALANCE_SHEET_FIELDS, assignment);
  if (missing.length > 0) {
    const labels = missing.map((field) => field.label).join('・');
    return { rows, skipped, errors: [{ line: 0, reason: `${labels}の列が決まっていません` }], notices };
  }
  if (assignment.evaluated === undefined && assignment.book === undefined) {
    const reason = '相続税評価額か帳簿価額のどちらかは列を決めてください';
    return { rows, skipped, errors: [{ line: 0, reason }], notices };
  }

  for (const { line, cells } of table.rows) {
    const name = cellOf(cells, assignment, 'name');
    if (name === '') {
      skipped.push({ line, reason: '科目が空の行' });
      continue;
    }
    if (HEADER_NAME.test(toHalfWidth(name))) {
      skipped.push({ line, reason: `見出しとみられる行（${name}）` });
      continue;
    }
    if (TOTAL_NAME.test(name)) {
      skipped.push({ line, reason: `合計・小計とみられる行（${name}）：②に二重計上されるため取り込みません` });
      continue;
    }

    const evaluated = readAmount(cellOf(cells, assignment, 'evaluated'), '相続税評価額');
    const book = readAmount(cellOf(cells, assignment, 'book'), '帳簿価額');
    const failed = [evaluated, book].filter((amount) => amount.reason !== undefined);
    if (failed.length > 0) {
      errors.push({ line, reason: `${name}：${failed.map((amount) => amount.reason).join('、')}` });
      continue;
    }
    if (evaluated.text === '' && book.text === '') {
      skipped.push({ line, reason: `金額の無い行（区分の見出しとみられる：${name}）` });
      continue;
    }

    let note = cellOf(cells, assignment, 'note');
    if (note !== '' && side === 'a' && !ASSET_NOTES.includes(toHalfWidth(note))) {
      notices.push({ line, reason: `${name}：備考「${note}」は選択肢（株式等・土地等）に無いため空欄にしました` });
      note = '';
    }
    // 繰延資産・繰延税金資産は「財産性が無ければ記載しない」欄（記載方法等 第5表 2⑴ホ）。
    // 財産性の有無は科目名では決まらないので、落とさずに取り込んで確認だけ促す。
    if (side === 'a' && isNonEvaluableAsset(name)) {
      notices.push({
        line,
        reason: `${name}：財産性が無ければ評価の対象とならないため記載しません（記載方法等 第５表 2⑴ホ）。取り込みますが要否をご確認ください`,
      });
    }

    rows.push({ line, name, evaluated: evaluated.text ?? '', book: book.text ?? '', note });
  }

  return { rows, skipped, errors, notices };
}

/** 末尾に足すか、その部（資産または負債）をまるごと入れ替えるか。 */
export type ApplyMode = 'append' | 'replace';

export interface ApplyPlanOptions {
  /** 取り込む側の現在の全行（4列×総行数）。 */
  existing: ReadonlyArray<ReadonlyArray<string>>;
  incoming: readonly BalanceSheetRow[];
  mode: ApplyMode;
  /** 反対側（資産に対する負債）で使われている最終行。続紙を減らしすぎないために見る。 */
  otherUsed: number;
  mainRows: number;
  contRows: number;
  maxPages: number;
}

export interface ApplyPlan {
  /** 書き込む全行。ページ数ぶんちょうどの長さで、余りは空行。 */
  rows: string[][];
  pages: number;
  /** 収まりきらない行数。0 でなければ取り込まない（黙って切り捨てない）。 */
  overflow: number;
  capacity: number;
}

/** 値の入っている最終行（1始まり、無ければ0）。 */
export function lastUsedRow(rows: ReadonlyArray<ReadonlyArray<string>>): number {
  let last = 0;
  rows.forEach((row, index) => {
    if (row.some((value) => value.trim() !== '')) last = index + 1;
  });
  return last;
}

/**
 * 取り込んだ結果の行と、必要な続紙の枚数を決める。
 *
 * 続紙は足りなければ増やし、余れば減らす（入れ替えで行数が減ったときに空の続紙が
 * 印刷されないように）。ただし反対側がまだ使っている続紙は残す。
 */
export function planApply(options: ApplyPlanOptions): ApplyPlan {
  const { existing, incoming, mode, otherUsed, mainRows, contRows, maxPages } = options;
  const totalRowsOf = (pages: number) => mainRows + Math.max(0, pages - 1) * contRows;

  const kept = mode === 'replace' ? [] : existing.slice(0, lastUsedRow(existing));
  const merged = [
    ...kept.map((row) => [row[0] ?? '', row[1] ?? '', row[2] ?? '', row[3] ?? '']),
    ...incoming.map((row) => [row.name, row.evaluated, row.book, row.note]),
  ];

  const needed = Math.max(merged.length, otherUsed);
  let pages = 1;
  while (totalRowsOf(pages) < needed && pages < maxPages) pages += 1;

  const capacity = totalRowsOf(pages);
  return {
    rows: Array.from({ length: capacity }, (_, index) => merged[index] ?? ['', '', '', '']),
    pages,
    overflow: Math.max(0, merged.length - capacity),
    capacity,
  };
}
