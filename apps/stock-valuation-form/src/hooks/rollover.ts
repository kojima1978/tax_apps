import type { FormData } from '@/types/form';

// ══ 翌事業年度更新 ══
// 新しい事業年度の評価に移行するためにデータを繰り越す。
// ・課税時期・直前期の日付を1年進める
// ・期別データ（直前期/直前々期/直前々期の前期）を1期ずらして順送り（直前期欄は空欄に）
// ・毎年入れ直す数値（第5表の金額、会社規模判定、価額修正・権利関係、類似業種の株価）はクリア
// ・会社情報・株主構成・業種目番号・第5表の科目などは維持
// 適用後は normalizeFormData を通すこと（表間連動と類似業種マスタの再連動が走る）。

/** 和暦年の文字列を+1する（空欄・数値でない場合はそのまま） */
function bumpYear(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  const n = Number(trimmed);
  if (trimmed === '' || !Number.isInteger(n)) return value;
  return String(n + 1);
}

/** table 内の複数フィールドを空欄にする */
function clearFields(table: Record<string, string>, fields: readonly string[]): Record<string, string> {
  const next = { ...table };
  for (const f of fields) if (next[f] !== undefined && next[f] !== '') next[f] = '';
  return next;
}

/** [移動先←移動元] の順送り。先頭（最新期）は空欄になる */
function shift(table: Record<string, string>, chain: ReadonlyArray<readonly [string, string]>): Record<string, string> {
  const next = { ...table };
  // 古い期から順に上書き（chain は [より古い期 ← 新しい期] の順で並べる）
  for (const [to, from] of chain) {
    next[to] = table[from] ?? '';
  }
  return next;
}

// 第4表の1の期別フィールド（直前期→直前々期→直前々期の前期）
const T4_SHIFT: ReadonlyArray<readonly [string, string]> = [
  // 配当（⑥年配当金額/⑦非経常的な配当金額）
  ['f36', 'f32'], ['f37', 'f33'],
  ['f32', 'f28'], ['f33', 'f29'],
  // 利益（⑪〜⑮）
  ['e32', 'e25'], ['e33', 'e26'], ['e34', 'e27'], ['e35', 'e28'], ['e36', 'e29'],
  ['e25', 'e18'], ['e26', 'e19'], ['e27', 'e20'], ['e28', 'e21'], ['e29', 'e22'],
  // 純資産（⑰資本金等/⑱利益積立金額。n52 は①連動の自動転記なので触らない）
  ['n56', 'n52'], ['n57', 'n53'],
];
const T4_CLEAR = [
  'f28', 'f29',                                // 配当 直前期
  'e18', 'e19', 'e20', 'e21', 'e22',           // 利益 直前期
  'n53',                                       // 利益積立金額 直前期
  'mod_div', 'mod_div_sen', 'mod_pay', 'mod_pay_sen', 'mod_ratio', 'mod_ratio2', // 第4表の2 比準価額の修正
] as const;

// 第7表の1（受取配当金等収受割合: 直前期→直前々期）＋第7表の2の修正欄＋⑩⑪の上書き
const T7_SHIFT: ReadonlyArray<readonly [string, string]> = [
  ['f11', 'f10'], ['f14', 'f13'],
];
const T7_CLEAR = [
  'f10', 'f13',
  '⑩', '⑪',
  'mod_div', 'mod_div_sen', 'mod_pay', 'mod_pay_sen', 'mod_ratio', 'mod_ratio2',
] as const;

// 第1表の2（会社規模判定: 直前期末基準の数値）
const T1_2_CLEAR = ['f22', 'f24', 'emp_regular', 'emp_hours', 'f28'] as const;

// 第3表（株式の価額の修正・株式に関する権利）
const T3_CLEAR = [
  'mod1_div', 'mod1_div_sen', 'mod2_pay', 'mod2_ratio', 'mod2_ratio2',
  'exp_div', 'exp_div_sen', 'exp_tax', 'exp_tax_sen', 'r22_pay',
  'right_haito', 'right_wariate', 'right_kabunushi', 'right_musho',
] as const;

// 第6表（同上）
const T6_CLEAR = [
  'mod9_div', 'mod9_div_sen', 'mod10_pay', 'mod10_ratio', 'mod10_ratio2',
  'exp_div', 'exp_div_sen', 'exp_tax', 'exp_tax_sen', 'r24_pay',
  'right_haito', 'right_wariate', 'right_kabunushi', 'right_musho',
] as const;

// 第7表の3（S2の⑱⑲の上書き）
const T8_CLEAR = ['⑱', '⑲'] as const;

// 第5表: 資産・負債の金額列（相続税評価額_2/帳簿価額_3）。科目_1と備考_4は維持。
const T5_MAX_ROWS = 38; // 本表15行＋続紙23行
function clearTable5Amounts(table: Record<string, string>): Record<string, string> {
  const fields: string[] = ['_sel'];
  for (let row = 1; row <= T5_MAX_ROWS; row++) {
    for (const prefix of ['a', 'l']) {
      fields.push(`${prefix}_${row}_2`, `${prefix}_${row}_3`);
    }
  }
  return clearFields(table, fields);
}

// 第4表の期別データは第3表・第6表の配当還元欄と表間連動しているため、
// 順送り後の値を連動先にも同期する（normalizeLinkedFields は「最初の非空値」を全体に
// 配るので、片側だけ書き換えると古い値が復活してしまう）。
const DIVIDEND_LINKS: ReadonlyArray<readonly ['table3' | 'table6', string, string]> = [
  ['table3', 'f55', 'f28'], ['table3', 'f56', 'f29'], ['table3', 'f59', 'f32'], ['table3', 'f60', 'f33'],
  ['table6', 'f61', 'f28'], ['table6', 'f62', 'f29'], ['table6', 'f66', 'f32'], ['table6', 'f67', 'f33'],
];

/** 翌事業年度更新（純粋関数）。適用後は normalizeFormData を通すこと。 */
export function rolloverFormData(data: FormData): FormData {
  // 日付を1年進める（課税時期・直前期 自/至）
  const table1_1 = { ...data.table1_1 };
  for (const f of ['f14_y', 'f15_from_y', 'f15_to_y']) {
    const bumped = bumpYear(table1_1[f]);
    if (bumped !== undefined) table1_1[f] = bumped;
  }

  // 第4表: 期別の順送り＋直前期・修正欄のクリア
  const table4 = clearFields(shift(data.table4, T4_SHIFT), T4_CLEAR);

  // 第3表・第6表: 修正/権利のクリア＋第4表の配当欄との連動同期
  let table3 = clearFields(data.table3, T3_CLEAR);
  let table6 = clearFields(data.table6, T6_CLEAR);
  for (const [tableId, target, source] of DIVIDEND_LINKS) {
    const value = table4[source] ?? '';
    if (tableId === 'table3') table3 = { ...table3, [target]: value };
    else table6 = { ...table6, [target]: value };
  }

  return {
    ...data,
    table1_1,
    table1_2: clearFields(data.table1_2, T1_2_CLEAR),
    table3,
    table4,
    table5: clearTable5Amounts(data.table5),
    table6,
    table7: clearFields(shift(data.table7, T7_SHIFT), T7_CLEAR),
    table8: clearFields(data.table8, T8_CLEAR),
  };
}
