import type { RowSortColumn } from '../components/RowSortPanel';
import { TABLE11F1_SHARE, TABLE11F1_SPEC } from './table11f1';
import { TABLE11F2_SHARE, TABLE11F2_SPEC } from './table11f2';
import { TABLE11F3_SHARE, TABLE11F3_SPEC } from './table11f3';
import { TABLE11F4_SHARE, TABLE11F4_SPEC } from './table11f4';
import { TABLE1112F1B_SUBTITLE } from './table1112f1b';
import { TABLE9_DETAIL_FORM } from './table9';
import { TABLE10_DETAIL_FORM } from './table10';
import { TABLE13_DEBT_FORM, TABLE13_FUNERAL_FORM } from './table13';
import { TABLE14_BEQUEST_FORM, TABLE14_DONATION_FORM, TABLE14_GIFT_FORM } from './table14';
import { TABLE11F1_UNIT, detailValue, remapTable14Confirm, type Values } from '../lib/calc';

/**
 * 様式の登録簿。様式を足したときに書き足す表をここへ集めてある
 * （画面の一覧と印刷順・付表の割付・並べ替えの作り方・転記元の対応）。
 */

/** 第1表の転記欄。様式の選択状態にかかわらず直接入力させず、クリックで転記元を開く。 */
export const TABLE1_SOURCE_FOR_ROW: Readonly<Record<string, string>> = {
  v1: 'table11',
  v2: 'table112',
  v3: 'table13',
  v5: 'table14',
  v11: 'table4',
  v12: 'table42',
  v13: 'table5',
  v14: 'table88',
  v17: 'table112',
};
export const TABLE1_TRANSFERRED_ROWS = Object.keys(TABLE1_SOURCE_FOR_ROW);

/**
 * 用紙の枚数の上限。
 * 1枚に載る人数・件数は様式ごとに違うが、上限を分ける理由は無い
 * （どの様式も「押し間違いで際限なく増えない」ためだけに要る）。
 */
export const MAX_PAGES = 10;

/** 画面左の一覧と印刷順を決める様式の登録簿。様式を足したらここに1行追加する。 */
export interface FormMeta {
  id: string;
  label: string;
  note: string;
  /** 常に使用する様式（チェックを外せない） */
  required?: boolean;
  /** 人数に応じて自動で付く様式（チェックを持たない） */
  auto?: boolean;
}

export const FORMS: FormMeta[] = [
  { id: 'table1', label: '第1表', note: '相続税の申告書', required: true },
  { id: 'table1cont', label: '第1表（続）', note: '財産を取得した人 2人目以降', auto: true },
  { id: 'table2', label: '第2表', note: '相続税の総額の計算書' },
  { id: 'table4', label: '第4表', note: '相続税額の加算金額の計算書' },
  { id: 'table42', label: '第4表の2', note: '暦年課税分の贈与税額控除額の計算書' },
  { id: 'table5', label: '第5表', note: '配偶者に対する相続税額の軽減額の計算書' },
  { id: 'table6', label: '第6表', note: '未成年者控除額・障害者控除額の計算書' },
  { id: 'table7', label: '第7表', note: '相次相続控除額の計算書' },
  { id: 'table88', label: '第8の8表', note: '税額控除額及び納税猶予税額の内訳書' },
  { id: 'table9', label: '第9表', note: '生命保険金などの明細書' },
  { id: 'table10', label: '第10表', note: '退職手当金などの明細書' },
  { id: 'table11', label: '第11表', note: '相続税がかかる財産の合計表' },
  { id: 'table11f1', label: '第11表の付表1', note: '財産の明細書（土地・家屋等用）' },
  { id: 'table11f1calc', label: '（補助資料）', note: '第11表の付表1　単価（円）又は倍数の計算根拠' },
  { id: 'table11f2', label: '第11表の付表2', note: '財産の明細書（有価証券用）' },
  { id: 'table11f3', label: '第11表の付表3', note: '財産の明細書（現金・預貯金等用）' },
  { id: 'table11f4', label: '第11表の付表4', note: '財産の明細書（事業用・家庭用・その他）' },
  { id: 'table112', label: '第11の2表', note: '相続時精算課税適用財産の明細書' },
  { id: 'table1112f1', label: '第11・11の2表の付表1', note: '小規模宅地等についての課税価格の計算明細書' },
  { id: 'table1112f1c', label: '第11・11の2表の付表1（続）', note: '小規模宅地等の明細 4件目以降', auto: true },
  { id: 'table1112f1b', label: '第11・11の2表の付表1（別表１）', note: TABLE1112F1B_SUBTITLE },
  { id: 'table13', label: '第13表', note: '債務及び葬式費用の明細書' },
  { id: 'assetTaxWorksheet', label: '（補助資料）', note: '資産別税負担一覧（内部検討用）' },
  { id: 'table14', label: '第14表', note: '純資産価額に加算される暦年課税分の贈与財産価額等の明細書' },
  { id: 'table15', label: '第15表', note: '相続財産の種類別価額表' },
  { id: 'table15cont', label: '第15表（続）', note: '財産を取得した人 2人目以降', auto: true },
];

/** 付表（財産の明細書）の様式ID → 割付。様式を足したらここに1行追加する。 */
export const DETAIL_SPECS = {
  table11f1: { spec: TABLE11F1_SPEC, share: TABLE11F1_SHARE },
  table11f2: { spec: TABLE11F2_SPEC, share: TABLE11F2_SHARE },
  table11f3: { spec: TABLE11F3_SPEC, share: TABLE11F3_SHARE },
  table11f4: { spec: TABLE11F4_SPEC, share: TABLE11F4_SHARE },
} as const;

export type DetailForm = keyof typeof DETAIL_SPECS;

/** 付表は様式IDと枚数以外の作りが同じなので、レジストリから画面を組み立てる */
export const DETAIL_FORMS = Object.keys(DETAIL_SPECS) as DetailForm[];

/** 資産別補助資料に出す、付表1〜4の見分けやすい名称。 */
export function assetDescription(form: DetailForm, item: Values): string {
  const values = form === 'table11f1'
    ? [item.kind, [item.pref, item.city, item.town, item.lot].filter(Boolean).join(' ')]
    : form === 'table11f2'
      ? [item.kind, item.issue, [item.broker, item.branch].filter(Boolean).join(' ')]
      : form === 'table11f3'
        ? [item.kind, [item.bank, item.branch].filter(Boolean).join(' '), item.account]
        : [item.kind, item.assetName, item.place];
  return values.map((value) => value?.trim()).filter(Boolean).join('／') || '（名称未入力）';
}

export const ASSET_CATEGORY: Readonly<Record<DetailForm, string>> = {
  table11f1: '土地・家屋等',
  table11f2: '有価証券',
  table11f3: '現金・預貯金等',
  table11f4: 'その他の財産',
};

/** 並べ替え画面の作り方。様式ごとに違うのは見出しと一覧に拾う欄だけ。 */
export interface RowSortTarget {
  /** 用紙の上に出すボタンの文字（1つの様式に明細が2つ以上あるので区別が要る） */
  button: string;
  heading: string;
  subtitle: string;
  columns: readonly RowSortColumn[];
  amountOf: (item: Values) => string;
}

/** 金額の欄がそのまま1件の価額になる様式（付表だけは1件が複数の欄に分かれる） */
const amtOf = (item: Values): string => item.amt ?? '';

/** 明細を並べ替えられる様式。明細を持つ様式を足したらここに1行追加する。 */
export const ROW_SORTS: Readonly<Record<string, RowSortTarget>> = {
  ...Object.fromEntries(DETAIL_FORMS.map((id): [string, RowSortTarget] => [id, {
    button: '並べ替え',
    heading: '財産の並べ替え',
    subtitle: DETAIL_SPECS[id].spec.subtitle.replace('\n', ''),
    // 単価欄は他の欄から作る表示専用なので、明細には値が入っていない（一覧に出しても空になる）
    columns: DETAIL_SPECS[id].spec.rows.flat().flatMap((field): RowSortColumn[] => (
      field.field === undefined || field.field === TABLE11F1_UNIT
        ? [] : [{ field: field.field, name: field.name ?? field.field }]
    )),
    amountOf: (item) => detailValue(id, item),
  }])),
  [TABLE9_DETAIL_FORM]: {
    button: '並べ替え',
    heading: '保険金などの並べ替え',
    subtitle: '第9表 1 保険金などの明細',
    columns: [{ field: 'name', name: '保険会社等' }, { field: 'addr', name: '所在地' }],
    amountOf: amtOf,
  },
  [TABLE10_DETAIL_FORM]: {
    button: '並べ替え',
    heading: '退職手当金などの並べ替え',
    subtitle: '第10表 1 退職手当金などの明細',
    columns: [
      { field: 'title', name: '名称' }, { field: 'name', name: '勤務先会社等' }, { field: 'addr', name: '所在地' },
    ],
    amountOf: amtOf,
  },
  [TABLE13_DEBT_FORM]: {
    button: '債務の並べ替え',
    heading: '債務の並べ替え',
    subtitle: '第13表 1 債務の明細',
    columns: [
      { field: 'kind', name: '種類' }, { field: 'item', name: '細目' },
      { field: 'name', name: '債権者' }, { field: 'addr', name: '住所' },
    ],
    amountOf: amtOf,
  },
  [TABLE13_FUNERAL_FORM]: {
    button: '葬式費用の並べ替え',
    heading: '葬式費用の並べ替え',
    subtitle: '第13表 2 葬式費用の明細',
    columns: [{ field: 'name', name: '支払先' }, { field: 'addr', name: '住所' }],
    amountOf: amtOf,
  },
  [TABLE14_GIFT_FORM]: {
    button: '1の並べ替え',
    heading: '贈与財産の並べ替え',
    subtitle: '第14表 1 暦年課税分の贈与財産の明細',
    columns: [
      { field: 'kind', name: '種類' }, { field: 'item', name: '細目' }, { field: 'place', name: '所在場所等' },
    ],
    amountOf: amtOf,
  },
  [TABLE14_BEQUEST_FORM]: {
    button: '2の並べ替え',
    heading: '遺贈した財産の並べ替え',
    subtitle: '第14表 2 出資持分の定めのない法人などに遺贈した財産の明細',
    columns: [
      { field: 'kind', name: '種類' }, { field: 'item', name: '細目' }, { field: 'corp', name: '法人など' },
    ],
    amountOf: amtOf,
  },
  [TABLE14_DONATION_FORM]: {
    button: '3の並べ替え',
    heading: '寄附した財産の並べ替え',
    subtitle: '第14表 3 特定の公益法人などに寄附した相続財産の明細',
    columns: [
      { field: 'kind', name: '種類' }, { field: 'item', name: '細目' }, { field: 'corp', name: '公益法人等' },
    ],
    amountOf: amtOf,
  },
};

/**
 * 共通欄が明細の行を番号で名指ししている様式。並べ替えたら番号も追従させる。
 * （行そのものが値を持つ様式は、ここに載せる必要が無い。）
 */
export const ROW_SORT_REMAPS: Readonly<Record<string, (common: Values, indexOf: (i: number) => number) => Values>> = {
  [TABLE14_GIFT_FORM]: remapTable14Confirm,
};
