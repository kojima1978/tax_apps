import type { TableId, TableProps } from '@/types/form';
import { readWarekiDate } from '@/lib/wareki';
import { calcTable4 } from '@/components/tables/table4/calcTable4';

/**
 * 入力値どうしの食い違い（1件）。
 * エラーではなく「確認事項」として出す ── 計算は止めず、様式どおりの記載ならそのままで構わない。
 */
export interface ConsistencyIssue {
  /** 移動先の表（表示上のタブ。データの保存先バケットとは別） */
  tab: TableId;
  /** 移動先の入力欄（手で直せる欄を指す。自動計算欄は指さない） */
  field: string;
  /** どの欄の話か（一覧に出す見出し） */
  where: string;
  /** 何が食い違っているか */
  message: string;
}

const parseNum = (value: string): number | null => {
  const text = value.replace(/,/g, '').trim();
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};

/** 空欄（判定不能）は false。両方そろっているときだけ比べる */
const over = (a: number | null, b: number | null): boolean => a !== null && b !== null && a > b;

/** 「問題なし」を出してよいか（＝チェック対象の欄に何か入っているか）の判定に使う欄 */
const WATCHED: ReadonlyArray<readonly [TableId, string]> = [
  ['table1_1', '①'], ['table1_1', '③'], ['table1_1', '⑤'], ['table1_1', '⑥'], ['table1_1', 'f63'],
  ['table1_1', 'f14_y'], ['table1_1', 'f15_from_y'], ['table1_1', 'f15_to_y'],
  ['table2', 'f85_y'],
  ['table4', 'f28'], ['table4', 'f29'], ['table4', 'f32'], ['table4', 'f33'], ['table4', 'f36'], ['table4', 'f37'],
  ['table4', 'e18'], ['table4', 'e25'],
];

/** 年配当金額（⑥）と非経常的な配当金額（⑦）の3期分。⑦は⑥のうちの金額なので⑥を超えない */
const DIVIDEND_ROWS = [
  { period: '直前期', total: 'f28', extra: 'f29' },
  { period: '直前々期', total: 'f32', extra: 'f33' },
  { period: '直前々期の前期', total: 'f36', extra: 'f37' },
] as const;

/**
 * 入力値の整合チェック。様式の記載を妨げないよう、あくまで「確認事項」の一覧を返す。
 * 移動先には手入力できる欄を指定する（自動計算欄へ飛ばしても直せないため）。
 * 表示は「第４表の１」でもデータは table4 に入るので、読み出しはバケット側で行う。
 */
export function consistencyIssues(getField: TableProps['getField']): ConsistencyIssue[] {
  const num = (table: TableId, field: string) => parseNum(getField(table, field));
  const issues: ConsistencyIssue[] = [];
  const add = (tab: TableId, field: string, where: string, message: string) =>
    issues.push({ tab, field, where, message });

  // ── 第1表の1：議決権数・株式数 ──
  const votes1 = num('table1_1', '①');       // 納税義務者グループの議決権数（株主行からの自動集計）
  const votes3 = num('table1_1', '③');       // 筆頭株主グループの議決権数（手入力）
  const shares5 = num('table1_1', '⑤');      // 発行済株式数
  const votes6 = num('table1_1', '⑥');       // 議決権の総数
  const selfShares = num('table1_1', 'f63'); // 自己株式数

  if (over(votes1, votes6)) {
    add('table1_1', '⑥', '第１表の１ ⑥ 議決権の総数',
      '納税義務者グループの議決権数（①）が議決権の総数（⑥）を超えています。');
  }
  if (over(votes3, votes6)) {
    add('table1_1', '③', '第１表の１ ③ 筆頭株主グループの議決権数',
      '筆頭株主グループの議決権数（③）が議決権の総数（⑥）を超えています。');
  }
  if (over(votes1, votes3)) {
    add('table1_1', '③', '第１表の１ ③ 筆頭株主グループの議決権数',
      '納税義務者グループの議決権数（①）が筆頭株主グループ（③）を上回っています。納税義務者のグループが筆頭であれば、③には①と同じ数を入れます。');
  }
  if (over(selfShares, shares5)) {
    add('table1_1', 'f63', '第１表の１ 自己株式の株式数',
      '自己株式数が発行済株式数（⑤）を超えています。');
  }
  if (shares5 !== null && over(votes6, shares5 - (selfShares ?? 0))) {
    add('table1_1', '⑥', '第１表の１ ⑥ 議決権の総数',
      '議決権の総数（⑥）が「発行済株式数（⑤）－自己株式数」を超えています。自己株式に議決権はありません。');
  }

  // ── 日付の前後関係（直前期は課税時期の直前に終了した事業年度） ──
  const t1 = (field: string) => getField('table1_1', field);
  const taxDate = readWarekiDate(t1, 'f14');
  const prevFrom = readWarekiDate(t1, 'f15_from');
  const prevTo = readWarekiDate(t1, 'f15_to');
  const openDate = readWarekiDate((field) => getField('table2', field), 'f85');

  if (prevFrom && prevTo && prevFrom.getTime() > prevTo.getTime()) {
    add('table1_1', 'f15_from_y', '第１表の１ 直前期（自）',
      '直前期の「自」が「至」より後になっています。');
  }
  if (taxDate && prevTo && prevTo.getTime() >= taxDate.getTime()) {
    add('table1_1', 'f15_to_y', '第１表の１ 直前期（至）',
      '直前期の末日が課税時期以後になっています。直前期は課税時期の直前に終了した事業年度です。');
  }
  if (taxDate && openDate && openDate.getTime() > taxDate.getTime()) {
    add('table2', 'f85_y', '第２表 開業年月日',
      '開業年月日が課税時期より後になっています。');
  }

  // ── 第4表の1：非経常的な配当金額（⑦）は年配当金額（⑥）のうちの金額 ──
  for (const row of DIVIDEND_ROWS) {
    if (over(num('table4', row.extra), num('table4', row.total))) {
      add('table4_1', row.extra, `第４表の１ ⑦ 非経常的な配当金額（${row.period}）`,
        `${row.period}の非経常的な配当金額（⑦）が年配当金額（⑥）を超えています。⑦は⑥のうちの金額です。`);
    }
  }

  // ── 第4表の1：Ⓒ（比準要素）とⒸ₁（判定要素）で年利益金額の採り方が違う ──
  // 用途が違う欄なので別々に選べる（連動規定は無い）。ただし完成した明細書の上では
  // どちらを採ったか分からなくなるため、意図した組み合わせかを一度確認できるよう残す。
  const t4 = calcTable4(getField);
  if (t4.cvSide !== undefined && t4.c1baseSide !== undefined && t4.cvSide !== t4.c1baseSide) {
    const how = (side: 'left' | 'right') => (side === 'left' ? '直前期の利益金額' : '直前期末以前2年間の平均額');
    add('table4_1', 'e18', '第４表の１ １株（50円）当たりの年利益金額',
      `Ⓒは「${how(t4.cvSide)}」、Ⓒ₁は「${how(t4.c1baseSide)}」を基にしています。`
      + 'Ⓒ（類似業種比準価額の比準要素）とⒸ₁（比準要素数１の会社の判定要素）は納税義務者が別々に選べるため'
      + '誤りではありませんが、意図した組み合わせかご確認ください。');
  }

  return issues;
}

/** チェック対象の欄に1つでも入力があるか（空の帳票に「問題なし」を出さないための判定） */
export function hasCheckableInput(getField: TableProps['getField']): boolean {
  return WATCHED.some(([table, field]) => getField(table, field).trim() !== '');
}
