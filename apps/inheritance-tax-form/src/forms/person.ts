/**
 * 「財産を取得した人」1人分の基本情報の定義。
 *
 * 用紙（第1表・第1表（続））の人物欄は1人分が縦1列に細長く割り付けられていて、
 * 2人目からは別の用紙に移る。人を登録するという作業に対して用紙の割付が合っていないので、
 * 入力はこの定義から作る画面（`PersonPanel`）へ一本化し、用紙は結果の表示と
 * クリックの入口だけにする（付表の明細と同じ考え方）。
 *
 * 用紙側のセルは `personColumn`（geometry.ts）が作る。両者の欄がずれないよう、
 * フィールド名の一致は `person.test.ts` で機械的に突き合わせている。
 */

import { DAY_OPTIONS, ERA_OPTIONS, ERA_YEAR_OPTIONS, MONTH_OPTIONS, RELATION_OPTIONS } from '../data/codes';

/** 入力欄の種類 */
export type PersonControl =
  | 'text'      // 自由入力
  | 'select'    // 選択式
  | 'flag'      // 該当するときだけ「1」を入れる欄（チェックボックスで扱う）
  | 'birth'     // 生年月日（元号・年・月・日）＋年齢（自動）
  | 'zip'       // 郵便番号（保存は field_1 / field_2）
  | 'tel'       // 電話番号（保存は field_1 / field_2 / field_3）
  | 'address'   // 住所（上段 field ／ 下段 field2）
  | 'causes';   // 取得原因（相続・遺贈・相続時精算課税に係る贈与）

export interface PersonField {
  /** 接頭辞（'h0.'）を除いたフィールド名。複合欄は保存時に接尾辞が付く */
  field: string;
  /** 画面の見出し */
  name: string;
  control: PersonControl;
  options?: readonly { value: string; label: string }[];
  /** チェックボックスに添える文言（省略時は見出しと同じ） */
  checkLabel?: string;
  /** 欄の右に添える説明 */
  note?: string;
}

/** 生年月日の4欄。用紙の並び（元号・年・月・日）のまま。 */
export const PERSON_BIRTH_PARTS = [
  { field: 'birthEra', name: '元号', options: ERA_OPTIONS },
  { field: 'birthY', name: '年', options: ERA_YEAR_OPTIONS },
  { field: 'birthM', name: '月', options: MONTH_OPTIONS },
  { field: 'birthD', name: '日', options: DAY_OPTIONS },
] as const;

/** 取得原因。様式では該当する欄に「1」と記入する。 */
export const PERSON_CAUSES = [
  { field: 'cause1', name: '相続' },
  { field: 'cause2', name: '遺贈' },
  { field: 'cause3', name: '相続時精算課税に係る贈与' },
] as const;

/** 郵便番号・電話番号の桁の割り（用紙側の複合欄と同じ区切り・同じ桁数にする） */
export const PERSON_ZIP_PARTS = [
  { suffix: '_1', name: '上3桁', maxLength: 3 },
  { suffix: '_2', name: '下4桁', maxLength: 4 },
] as const;

export const PERSON_TEL_PARTS = [
  { suffix: '_1', name: '市外局番', maxLength: 5 },
  { suffix: '_2', name: '市内局番', maxLength: 4 },
  { suffix: '_3', name: '加入者番号', maxLength: 4 },
] as const;

/** 住所欄の2段（上段は郵便番号から補う部分、下段は丁目以下） */
export const PERSON_ADDRESS_PARTS = [
  { suffix: '', name: '都道府県・市区町村・町域' },
  { suffix: '2', name: '丁目・番地・建物名' },
] as const;

/** 基本情報の入力欄。並びは用紙（第1表の人物欄）の上から下の順。 */
export const PERSON_FIELDS: readonly PersonField[] = [
  { field: 'furigana', name: 'フリガナ', control: 'text' },
  { field: 'name', name: '氏名', control: 'text' },
  { field: 'myNumber', name: '個人番号又は法人番号', control: 'text' },
  { field: 'birth', name: '生年月日', control: 'birth' },
  { field: 'zip', name: '郵便番号', control: 'zip', note: '7桁そろうと住所の上段を補います' },
  { field: 'address', name: '住所', control: 'address' },
  { field: 'tel', name: '電話番号', control: 'tel' },
  { field: 'relation', name: '被相続人との続柄', control: 'select', options: RELATION_OPTIONS },
  { field: 'job', name: '職業', control: 'text' },
  { field: 'cause', name: '財産の取得原因', control: 'causes' },
  {
    field: 'ref', name: '参考記載', control: 'flag', checkLabel: '参考として記載する',
    note: '様式の「参考記載」欄に1を記入します',
  },
];

/** 複合欄が持つ用紙側のフィールド名（用紙のセル1つ＝ここの1つ） */
const CONTROL_FIELDS: Record<PersonControl, (field: string) => string[]> = {
  text: (field) => [field],
  select: (field) => [field],
  flag: (field) => [field],
  // 年齢は相続開始日から自動で出す欄。用紙にも枠があるので突き合わせの対象に含める
  birth: () => [...PERSON_BIRTH_PARTS.map((part) => part.field), 'age'],
  zip: (field) => [field],
  tel: (field) => [field],
  address: (field) => [field],
  causes: () => PERSON_CAUSES.map((cause) => cause.field),
};

/** この画面が扱う用紙側のフィールド名（接頭辞なし） */
export function personFieldNames(): string[] {
  return PERSON_FIELDS.flatMap((field) => CONTROL_FIELDS[field.control](field.field));
}

/** 用紙の人物欄をクリックしたときに返す識別子。接頭辞（'h0.'）をそのまま載せる。 */
const PERSON_ACTION = 'person:';

export const personAction = (prefix: string): string => `${PERSON_ACTION}${prefix}`;

/** `personAction` で作った識別子から接頭辞を取り出す（別の action なら undefined） */
export const personActionPrefix = (action: string): string | undefined => (
  action.startsWith(PERSON_ACTION) ? action.slice(PERSON_ACTION.length) : undefined
);
