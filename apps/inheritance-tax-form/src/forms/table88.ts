/**
 * 相続税の申告書 第8の8表「税額控除額及び納税猶予税額の内訳書」。
 *
 * 「1 税額控除額」と「2 納税猶予税額」は行数と見出しが違うだけで**列の割付が完全に同じ**なので、
 * 第5表・第6表・第7表と同じく1つの組み立て（`section`）に諸元を渡して2回呼ぶ。
 * 1枚に2人分。枚数は表全体で1つ（共通欄 `t88Pages`）で、件数からは導出しない。
 *
 * 1の①②は第6表、③は第7表からの転記なので自動計算。④（第8表）は転記元が24帳票の
 * 対象外なので手入力で、その様式を使っていないときは①②③も手入力に戻る
 * （`autoCredit` / `autoSuccessive`）。
 *
 * 2は転記元（第8表2・第8の2表〜第8の6表）がどれも対象外で、金額の根拠をこのアプリでは
 * 作れないため段ごと未対応にしてある（`unsupported`）。氏名・金額とも入力させず灰色で出す。
 *
 * 罫線の位置は様式PNG（150dpi）の実測px。
 * 上端 203.5px（被相続人欄の上辺）〜下端 1693.5px（2の（注）の下辺）、
 * 左端 65.5px 〜 右端 1172.5px を 0〜100％ に写す。
 */

import type { GridCell } from '../components/ui/GridForm';
import { code, label, mk } from './geometry';

export const TABLE88_FORM_CODE = 'NTA0KSE088010010';
export const TABLE88_TITLE = '相続税の申告書　第8の8表';
export const TABLE88_SUBTITLE = '税額控除額及び納税猶予税額の内訳書';
export const TABLE88_EDITION = '（令和5年1月分以降用）（R8.7）';

/** 様式1枚に記入できる人数（1・2とも2人） */
export const TABLE88_PERSONS = 2;

/** 1 税額控除額 の①〜④（⑤は合計） */
export const TABLE88_CREDIT_ROWS = 4;

/** 2 納税猶予税額 の①〜⑦（⑧は合計） */
export const TABLE88_DEFERRAL_ROWS = 7;

/** 様式の枠外に印字されている注記（第8の8表は枠外注記が無い） */
export const TABLE88_NOTES = '';

const TOP = 203.5;
const BOTTOM = 1693.5;
const LEFT = 65.5;
const RIGHT = 1172.5;

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export const TABLE88_ASPECT = `${RIGHT - LEFT} / ${BOTTOM - TOP}`;

/** 実測px → ％（縦） */
const row = (a: number, b: number): [number, number] => [
  ((a - TOP) / (BOTTOM - TOP)) * 100,
  ((b - TOP) / (BOTTOM - TOP)) * 100,
];
/** 実測px → ％（横） */
const col = (a: number, b: number): [number, number] => [
  ((a - LEFT) / (RIGHT - LEFT)) * 100,
  ((b - LEFT) / (RIGHT - LEFT)) * 100,
];

/** 列の縦罫線（1・2で共通）。1人目と2人目でコード枠＋入力の並びが繰り返される。 */
const X = {
  LBL: 426.5,  // 行見出しの右端 ＝ 丸番号の左端
  NUM: 448.5,  // 丸番号の右端 ＝ 1人目のコード枠の左端
  V1: 470.5,   // 1人目のコード枠の右端 ＝ 入力の左端
  C2: 810.5,   // 1人目の入力の右端 ＝ 2人目のコード枠の左端
  V2: 832.5,   // 2人目のコード枠の右端 ＝ 入力の左端
} as const;

/** 人ごとの［コード枠の左端, 入力の左端, 入力の右端］ */
const COLS: readonly (readonly [number, number, number])[] = [
  [X.NUM, X.V1, X.C2],
  [X.C2, X.V2, RIGHT],
];

/** 被相続人欄（右上）の縦罫線 */
const DX = { L: 683.5, CODE: 832.5, INPUT: 853.5 } as const;

/** 様式のコード（E02・G01 のように系列ごとに2桁で振られる） */
const cd = (series: string, n: number): string => `${series}${String(n).padStart(2, '0')}`;

/** 丸番号（1は⑤まで、2は⑧まで） */
const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'] as const;

// ---------------------------------------------------------------- 印字されている文言

const HEAD1 = '1　税額控除額';
const LEAD1 = '　この表は、「未成年者控除」、「障害者控除」、「相次相続控除」又は「外国税額控除」の適用を受ける人が第1表の「⑫・⑬\n'
  + '以外の税額控除額⑭」欄に記入する金額の計算のために使用します。';
const NOTE1 = '（注）　各人の⑤欄の金額を第1表のその人の「⑫・⑬以外の税額控除額⑭」欄に転記します。';

const ROWS1 = [
  '未成年者控除額\n（第6表1②、③又は⑥）',
  '障害者控除額\n（第6表2②、③又は⑥）',
  '相次相続控除額\n（第7表⑬又は⑱）',
  '外国税額控除額\n（第8表1⑧）',
  '合　　　　　　計\n（①＋②＋③＋④）',
] as const;

const HEAD2 = '2　納税猶予税額';
const LEAD2 = '　この表は、次の相続税の特例の適用を受ける人が第1表の「納税猶予税額⑳」欄に記入する金額の計算のために使用します。\n'
  + '⑴　農地等についての納税猶予及び免除等（租税特別措置法第70条の6第1項）\n'
  + '⑵　非上場株式等についての納税猶予及び免除（租税特別措置法第70条の7の2第1項又は第70条の7の4第1項）\n'
  + '⑶　非上場株式等についての納税猶予及び免除の特例（租税特別措置法第70条の7の6第1項又は第70条の7の8第1項）\n'
  + '⑷　山林についての納税猶予及び免除（租税特別措置法第70条の6の6第1項）\n'
  + '⑸　医療法人の持分についての納税猶予及び免除（租税特別措置法第70条の7の12第1項）\n'
  + '⑹　特定の美術品についての納税猶予及び免除（租税特別措置法第70条の6の7第1項）\n'
  + '⑺　個人の事業用資産についての納税猶予及び免除（租税特別措置法第70条の6の10第1項）';
const NOTE2: NonNullable<GridCell['numberedNotes']> = [
  {
    number: '1',
    body: '上記⑴〜⑺の特例又は医療法人の持分についての相続税の税額控除'
      + '（租税特別措置法第70条の7の13第1項）のうち2以上の特例の適用を受ける人がいる場合は、'
      + 'その人の①〜⑦欄には、第8の7表の「3　納税猶予税額等」のうち①〜⑦欄に対応する欄の金額を転記します。',
  },
  {
    number: '2',
    body: '各人の⑧欄の金額を第1表のその人の「納税猶予税額⑳」欄に転記します。',
  },
];

const ROWS2 = [
  '農地等納税猶予税額\n（第8表2⑦）',
  '株式等納税猶予税額\n（第8の2表2A）',
  '特例株式等納税猶予税額\n（第8の2の2表2A）',
  '山林納税猶予税額\n（第8の3表2⑧）',
  '医療法人持分納税猶予税額\n（第8の4表2A）',
  '美術品納税猶予税額\n（第8の5表2A）',
  '事業用資産納税猶予税額\n（第8の6表2A）',
  '合　　　　　　計\n（①＋②＋③＋④＋⑤＋⑥＋⑦）',
] as const;

// ---------------------------------------------------------------- 組み立て

/** 段ごとの行位置（実測px）。1と2で比例しないので実測値をそのまま持つ。 */
interface SectionY {
  /** 章見出し */
  head: [number, number];
  /** 説明文 */
  lead: [number, number];
  /** 説明文までを囲む枠の下端 ＝ (氏名)帯の上端 */
  headBox: number;
  /** (氏名)帯 */
  nameHead: [number, number];
  /** 氏名の入力 */
  name: [number, number];
  /** 金額行の境界（行数＋1個） */
  rows: readonly number[];
  /** （注） */
  note: [number, number];
}

/** 1つの段（1 税額控除額／2 納税猶予税額）の諸元 */
interface Section {
  /** フィールドの識別子（'a'＝税額控除額／'b'＝納税猶予税額） */
  k: string;
  head: string;
  lead: string;
  /** 説明文の文字サイズ（2は9行あるので小さくする） */
  leadSize: number;
  /** （注）。番号付きのものは配列で渡すとぶら下げ字下げになる */
  note: string | NonNullable<GridCell['numberedNotes']>;
  /** 行見出し（丸番号は並び順に振る） */
  labels: readonly string[];
  /** Eコード（氏名欄）の起点 */
  eBase: number;
  /** Gコード（金額欄）の起点。1人分の行数だけ間隔があく */
  gBase: number;
  /** 行ごとの保存先（'c'＝手入力／'t'＝自動計算）。呼び出し時に転記元の様式の有無で決まる */
  scope: (i: number) => string;
  /**
   * 段ごと未対応（＝この段に必要な様式をこのアプリで作れない）。
   * 中途半端に手入力させると根拠の無い数字が申告書に載るので、氏名も金額も入力させず灰色にする。
   */
  unsupported?: boolean;
  y: SectionY;
}

/** 氏名の行（(氏名)帯＋項番選択）。左の見出し列は2行まとめて斜線。 */
function nameRows(s: Section, common: string, page: number, options: GridCell['options']): GridCell[] {
  const head = row(s.y.nameHead[0], s.y.nameHead[1]);
  const name = row(s.y.name[0], s.y.name[1]);
  return [
    mk(row(s.y.nameHead[0], s.y.name[1]), col(LEFT, X.NUM), { diagonal: 'bltr' }),
    ...COLS.flatMap(([c, v, r], j): GridCell[] => [
      label(head, col(c, r), '（氏名）', { align: 'left' }),
      code(name, col(c, v), cd('E', s.eBase + j)),
      mk(name, col(v, r), {
        kind: 'input',
        field: `${common}t88${s.k}p${page}c${j}no`,
        ariaLabel: `${j + 1}人目の氏名`,
        options,
        align: 'left',
        readOnly: s.unsupported,
      }),
    ]),
  ];
}

/** 金額の行（①〜⑤／①〜⑧）。転記になっている行と合計行は読み取り専用。 */
function valueRows(s: Section, common: string, totals: string, page: number): GridCell[] {
  return s.labels.flatMap((text, i) => {
    const y = row(s.y.rows[i]!, s.y.rows[i + 1]!);
    const no = NUMS[i]!;
    const name = text.split('\n')[0]!;
    return [
      label(y, col(LEFT, X.LBL), text, { fontSize: 8 }),
      label(y, col(X.LBL, X.NUM), no, { fontSize: 10, semanticRole: 'rowheader' }),
      ...COLS.flatMap(([c, v, r], j): GridCell[] => {
        const scope = s.scope(i);
        return [
          code(y, col(c, v), cd('G', s.gBase + j * s.labels.length + i)),
          mk(y, col(v, r), {
            kind: 'input',
            field: `${scope === 't' ? totals : common}t88${s.k}p${page}c${j}v${i + 1}`,
            ariaLabel: `${j + 1}人目の${no}${name}`,
            commaInteger: true,
            readOnly: scope === 't' || s.unsupported,
          }),
        ];
      }),
    ];
  });
}

/** 1つの段を組み立てる */
function section(s: Section, common: string, totals: string, page: number, options: GridCell['options']): GridCell[] {
  return [
    // 章見出し・説明文（枠は1つで、中身は罫線なしのラベルを重ねる）
    mk(row(s.y.head[0], s.y.headBox), col(LEFT, RIGHT), {}),
    label(row(s.y.head[0], s.y.head[1]), col(LEFT, DX.L), s.head, { noBorder: true, align: 'left', bold: true, fontSize: 9 }),
    label(row(s.y.head[0], s.y.head[1]), col(DX.L, RIGHT), '（単位：円）', { noBorder: true, align: 'right', fontSize: 8 }),
    label(row(s.y.lead[0], s.y.lead[1]), col(LEFT, RIGHT), s.lead, { noBorder: true, align: 'left', fontSize: s.leadSize }),

    ...nameRows(s, common, page, options),
    ...valueRows(s, common, totals, page),
    typeof s.note === 'string'
      ? label(row(s.y.note[0], s.y.note[1]), col(LEFT, RIGHT), s.note, { align: 'left', fontSize: 7 })
      : mk(row(s.y.note[0], s.y.note[1]), col(LEFT, RIGHT), {
          kind: 'label', numberedNotes: s.note, align: 'left', alignItems: 'flex-start', fontSize: 7,
        }),
  ];
}

/**
 * 第8の8表のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 氏名の項番と手入力の金額
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— 転記になる行と合計
 * @param page 0始まりの枚数
 * @param autoCredit 第6表を使っているか（1の①②が転記になる）
 * @param autoSuccessive 第7表を使っているか（1の③が転記になる）
 * @param options 氏名の選択肢（値はその人のID。計算へ渡る前に「何人目か」へ直される）
 */
export function buildTable88(
  common: string, totals: string, page: number,
  autoCredit: boolean, autoSuccessive: boolean, options: GridCell['options'],
): GridCell[] {
  const credit: Section = {
    k: 'a',
    head: HEAD1,
    lead: LEAD1,
    leadSize: 7.5,
    note: NOTE1,
    labels: ROWS1,
    eBase: 2,
    gBase: 1,
    // ①②は第6表、③は第7表からの転記。④は第8表が対象外なので手入力、⑤は合計
    scope: (i) => {
      if (i === 4) return 't';
      if (i === 3) return 'c';
      return (i === 2 ? autoSuccessive : autoCredit) ? 't' : 'c';
    },
    y: {
      head: [254, 288],
      lead: [288, 351.5],
      headBox: 351.5,
      nameHead: [351.5, 387],
      name: [387, 446],
      rows: [446, 505, 564, 623, 682, 741],
      note: [741, 775],
    },
  };
  const deferral: Section = {
    k: 'b',
    head: HEAD2,
    lead: LEAD2,
    leadSize: 7,
    note: NOTE2,
    labels: ROWS2,
    eBase: 4,
    gBase: 11,
    // ①〜⑦の転記元（第8表2・第8の2表〜第8の6表）はどれも対象外の様式なので、この段は丸ごと未対応
    scope: (i) => (i === ROWS2.length - 1 ? 't' : 'c'),
    unsupported: true,
    y: {
      head: [798.5, 832],
      lead: [832, 1005],
      headBox: 1048,
      nameHead: [1048, 1084],
      name: [1084, 1143],
      rows: [1143, 1202, 1261, 1320, 1379, 1438, 1497, 1556, 1615],
      note: [1615, BOTTOM],
    },
  };
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    label(row(TOP, 254), col(DX.L, DX.CODE), '被相続人'),
    code(row(TOP, 254), col(DX.CODE, DX.INPUT), 'E01'),
    mk(row(TOP, 254), col(DX.INPUT, RIGHT), {
      kind: 'input',
      field: `${common}name`,
      ariaLabel: '被相続人の氏名',
      align: 'left',
      fontSize: 10,
      readOnly: true,
      navigateToForm: 'table1',
    }),

    ...section(credit, common, totals, page, options),
    // 1と2の枠の間（罫線の無い帯）
    mk(row(775, 798.5), col(LEFT, RIGHT), { noBorder: true }),
    ...section(deferral, common, totals, page, options),
  ];
}
