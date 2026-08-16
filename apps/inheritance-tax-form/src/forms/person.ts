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

/** 障害者の区分。第6表の2は一般障害者2列＋特別障害者1列の割付なので、区分まで持つ。 */
export const DISABILITY_GENERAL = 'general';
export const DISABILITY_SPECIAL = 'special';

export const DISABILITY_OPTIONS = [
  { value: DISABILITY_GENERAL, label: '一般障害者' },
  { value: DISABILITY_SPECIAL, label: '特別障害者' },
] as const;

/**
 * 用紙（第1表）には出ない属性。
 *
 * 「誰が未成年者控除・障害者控除の対象か」「誰が放棄したか」は他の様式（第2表・第6表・
 * 第9表・第10表）が必要とするのに、第1表の用紙には書く欄が無い。人に付く事実なので
 * 人物の画面で持ち、様式側は**候補を出すところまで**にとどめる（誰を書くかは利用者が決める）。
 */
export const PERSON_ATTRS: readonly PersonField[] = [
  {
    field: 'renounced', name: '相続の放棄', control: 'flag', checkLabel: '相続の放棄をした',
    note: '第2表の法定相続人の数は、放棄がなかったものとして数えます',
  },
  {
    field: 'disability', name: '障害者の区分', control: 'select', options: DISABILITY_OPTIONS,
    note: '第6表の2 障害者控除の候補になります',
  },
  {
    field: 'supporter', name: '扶養義務者', control: 'flag', checkLabel: '未成年者・障害者の扶養義務者である',
    note: '第6表の扶養義務者の候補になります',
  },
];

/** 氏名の選択肢1つ分（値は第11表の項番） */
export interface PersonOption {
  value: string;
  label: string;
}

export interface CandidateGroup {
  label: string;
  /** その人が候補かどうか（`people` の添字で聞く） */
  match: (index: number) => boolean;
}

/** 候補に当てはまらなかった人を入れる区分 */
const OTHERS = 'その他';

/**
 * 氏名欄の選択肢を「候補」と「その他」に分ける。
 * 属性から候補を出すだけで、選ぶのは利用者（自動では埋めない）。
 * 先に当てはまった区分に入れるので、区分は並べた順に優先される。
 */
export function candidateGroups(
  people: readonly PersonOption[],
  groups: readonly CandidateGroup[],
): { label: string; options: PersonOption[] }[] {
  const buckets = groups.map((group): { label: string; options: PersonOption[] } => ({ label: group.label, options: [] }));
  const others: PersonOption[] = [];
  people.forEach((person, index) => {
    const hit = groups.findIndex((group) => group.match(index));
    (hit < 0 ? others : buckets[hit]!.options).push(person);
  });
  return [
    ...buckets.filter((bucket) => bucket.options.length > 0),
    ...(others.length > 0 ? [{ label: OTHERS, options: others }] : []),
  ];
}

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
