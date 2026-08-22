/**
 * 相続税の申告書 第11・11の2表の付表1「小規模宅地等についての課税価格の計算明細書」と
 * その（続）。
 *
 * 本表と（続）は**同じ版を切り貼りして作られている**。縦罫線は（続）の方が一律 35px 左に
 * あるだけで、表の幅は 1118px / 1119px とほぼ同じ。そのため `col()`（本表の px 基準）を
 * 両者で共用し、様式ごとに違うのは上下端と行の並びだけとした（`SHEET` / `CONT`）。
 * 構造上の違いも1つしかない — 本表には冒頭の「この表は、…」欄と末尾の「限度面積要件」の
 * 判定欄があり、（続）には無い。明細は本表3件・（続）5件で、コードは用紙ごとに振り直す。
 *
 * 罫線の位置は様式PDF（150dpi）の実測px。
 * 本表: 上端 171.5px 〜 下端 1657px、左端 95px 〜 右端 1213px。
 * （続）: 上端 197.5px 〜 下端 1687px（左右は本表の px をそのまま使う）。
 */

import type { Fraction, GridCell } from '../components/ui/GridForm';
import { code, label, mk } from './geometry';

export const TABLE1112F1_FORM_CODE = 'NTA0KSE112010030';
export const TABLE1112F1_TITLE = '相続税の申告書　第11・11の2表の付表1';
export const TABLE1112F1_SUBTITLE = '小規模宅地等についての課税価格の計算明細書';
export const TABLE1112F1_EDITION = '（令和6年1月分以降用）（R8.7）';

export const TABLE1112F1C_FORM_CODE = 'NTA0KSE113010030';
export const TABLE1112F1C_TITLE = '相続税の申告書　第11・11の2表の付表1（続）';
export const TABLE1112F1C_SUBTITLE = '小規模宅地等についての課税価格の計算明細書（続）';

/** 本表1枚に記入できる小規模宅地等の明細の件数 */
export const TABLE1112F1_ROWS = 3;
/** （続）1枚に記入できる件数 */
export const TABLE1112F1_CONT_ROWS = 5;
/** 1枚に記入できる同意者の人数（本表・（続）とも6人） */
export const TABLE1112F1_AGREE = 6;

/** ⑨ 減額割合（小規模宅地等の種類 1〜4）。様式には印字済みで入力欄が無い。 */
export const TABLE1112F1_RATE: Record<string, number> = { 1: 0.8, 2: 0.8, 3: 0.8, 4: 0.5 };

/** 小規模宅地等の種類（様式には1〜4の番号だけを記入する） */
export const KIND_OPTIONS: GridCell['options'] = [
  '',
  { value: '1', label: '1　特定居住用宅地等' },
  { value: '2', label: '2　特定事業用宅地等' },
  { value: '3', label: '3　特定同族会社事業用宅地等' },
  { value: '4', label: '4　貸付事業用宅地等' },
];

const LEFT = 95;
const RIGHT = 1213;

/** 実測px → ％（横）。本表・（続）で共用する。 */
const col = (a: number, b: number): [number, number] => [
  ((a - LEFT) / (RIGHT - LEFT)) * 100,
  ((b - LEFT) / (RIGHT - LEFT)) * 100,
];

/** 縦罫線の実測px */
const X = {
  L: 95,      // 表の左端
  BAND: 116,  // 同意欄の左余白／限度面積欄の左余白の右端
  SEL: 159,   // 縦帯「選択した小規模宅地等」の右端 ＝ 種類のコード枠の左端
  KC: 181,    // 種類のコード枠の右端
  KIND: 245,  // 種類欄の右端 ＝ ①〜④の丸番号の左端
  N1: 267,    // ①〜④の丸番号の右端
  C1: 288,    // 左半分のコード枠の右端
  NAME: 525,  // ①取得者の氏名の右端 ＝ 事業内容の左端
  C2: 546,    // 事業内容のコード枠の右端
  MID: 697,   // 左半分の右端
  N2: 718,    // ⑤〜⑧の丸番号の右端
  C3: 740,    // 右半分のコード枠の右端
  R: 1213,    // 表の右端
} as const;

/** 被相続人欄（右上）の縦割り */
const DEC = { L: 761, CODE: 933, INPUT: 955 } as const;

/** 同意欄の氏名（コード枠の左端・右端・入力の右端）×3人 */
const AGREE_X: readonly (readonly [number, number, number])[] = [
  [159, 181, 503], [503, 525, 847], [847, 869, 1213],
];

/** 明細ブロック内の左半分（②③④）の丸番号 */
const LEFT_MARKS = ['②', '③', '④'] as const;
/** 同 右半分（⑥⑦⑧） */
const RIGHT_MARKS = ['⑥', '⑦', '⑧'] as const;

/** 限度面積欄の種類別の列（コード枠の左端・右端・列の右端） */
const LIMIT_X: readonly (readonly [number, number, number])[] = [
  [353, 374, 568], [568, 589, 783], [783, 804, 998], [998, 1019, 1213],
];
const LIMIT_KINDS = ['1　特定居住用宅地等', '2　特定事業用宅地等', '3　特定同族会社事業用宅地等', '4　貸付事業用宅地等'] as const;
/** ⑨減額割合。様式では横線を挟んだ縦の分数で印字されている */
const LIMIT_RATES: readonly Fraction[] = [
  { top: '80', bottom: '100' }, { top: '80', bottom: '100' },
  { top: '80', bottom: '100' }, { top: '50', bottom: '100' },
];

const INTRO = 'この表は、小規模宅地等の特例（租税特別措置法第69条の4第1項）の適用を受ける場合に記入します。'
  + 'なお、被相続人から、相続、遺贈又は相続時精算課税に係る贈与により取得した財産のうちに、'
  + '「特定計画山林の特例」の対象となり得る財産又は「個人の事業用資産についての相続税の納税猶予及び免除」の'
  + '対象となり得る宅地等その他一定の財産がある場合には、第11・11の2表の付表2を、'
  + '「特定事業用資産の特例」の対象となり得る財産がある場合には、第11・11の2表の付表2の2を作成します'
  + '（第11・11の2表の付表2又は付表2の2を作成する場合には、この表の「1　特例の適用にあたっての同意」欄の記入を要しません。）。\n'
  + '（注）　この表の1又は2の各欄に記入しきれない場合には、第11・11の2表の付表1（続）を使用します。';

const AGREE_LEAD = 'この欄は、小規模宅地等の特例の対象となり得る宅地等を取得した全ての人が次の内容に同意する場合に、'
  + 'その宅地等を取得した全ての人の氏名を記入します。';
const AGREE_TEXT = '私（私たち）は、「2　小規模宅地等の明細」の①欄の取得者が、'
  + '小規模宅地等の特例の適用を受けるものとして選択した宅地等又はその一部'
  + '（「2　小規模宅地等の明細」の⑤欄で選択した宅地等）の全てが限度面積要件を満たすものであることを確認の上、'
  + 'その取得者が小規模宅地等の特例の適用を受けることに同意します。';
const AGREE_NOTE = '（注）小規模宅地等の特例の対象となり得る宅地等を取得した全ての人の同意がなければ、'
  + 'この特例の適用を受けることはできません。';

const DETAIL_LEAD = 'この欄は、小規模宅地等の特例の対象となり得る宅地等を取得した人のうち、'
  + 'その特例の適用を受ける人が選択した小規模宅地等の明細等を記載し、相続税の課税価格に算入する価額を計算します。';
const DETAIL_KIND_NOTE = '「小規模宅地等の種類」欄は、選択した小規模宅地等の種類に応じて次の1〜4の番号を記入します。\n'
  + '　小規模宅地等の種類：1　特定居住用宅地等、2　特定事業用宅地等、3　特定同族会社事業用宅地等、4　貸付事業用宅地等';

const NOTES: NonNullable<GridCell['numberedNotes']> = [
  { number: '1', body: '①欄の「事業内容」は、選択した小規模宅地等が被相続人等の事業用宅地等（小規模宅地等の種類が2、3又は4）である場合に、相続開始の直前にその宅地等の上で行われていた被相続人等の事業について、例えば、飲食サービス業、法律事務所、貸家などのように具体的に記入します。' },
  { number: '2', body: '小規模宅地等を選択する一の宅地等が共有である場合又は一の宅地等が貸家建付地である場合において、その評価額の計算上「賃貸割合」が1でないときには、第11・11の2表の付表1（別表1）を作成します。' },
  { number: '3', body: '小規模宅地等を選択する宅地等が、配偶者居住権に基づく敷地利用権又は配偶者居住権の目的となっている建物の敷地の用に供される宅地等である場合には、第11・11の2表の付表1（別表1の2）を作成します。' },
  { number: '4', body: '⑧欄の金額を第11表の付表1の「財産の明細」の「価額」欄に転記します。' },
];

const LIMIT_LEAD = '　　上記「2　小規模宅地等の明細」の⑤欄で選択した宅地等の全てが限度面積要件を満たすものであることを、'
  + 'この表の各欄を記入することにより判定します。';
const LIMIT_NOTE = '（注）　限度面積は、小規模宅地等の種類（「4　貸付事業用宅地等」の選択の有無）に応じて、'
  + '⑪欄（イ又はロ）により判定を行います。「限度面積要件」を満たす場合に限り、この特例の適用を受けることができます。';

/** 用紙ごとに違うのは上下端と行の並びだけ */
interface F1Sheet {
  top: number;
  bottom: number;
  /** 「この表は、…」欄（本表のみ） */
  intro?: readonly [number, number];
  /** 「1 特例の適用にあたっての同意」の見出し＋説明 */
  agreeHead: readonly [number, number];
  /** 同意文 */
  agreeText: readonly [number, number];
  /** 氏名2行（3人ずつ） */
  names: readonly [readonly [number, number], readonly [number, number]];
  agreeNote: readonly [number, number];
  /** 「2 小規模宅地等の明細」の見出し＋説明 */
  detailHead: readonly [number, number];
  /** 明細の見出し帯（4本の横罫線＋下端） */
  legend: readonly [number, number, number, number, number];
  /** 明細ブロックの上端 */
  blocks: readonly number[];
  /** ブロック内の小行の上端（ブロック上端からの相対px・末尾はブロックの高さ） */
  sub: readonly [number, number, number, number, number, number];
  /** （注）1〜4 */
  notes: readonly [number, number];
  /** 「限度面積要件」の判定欄を持つか（本表のみ） */
  limit?: boolean;
}

const SHEET: F1Sheet = {
  top: 171.5,
  bottom: 1657,
  intro: [200, 296.5],
  agreeHead: [296.5, 345],
  agreeText: [345, 386],
  names: [[386, 421], [421, 456.5]],
  agreeNote: [456.5, 484.5],
  detailHead: [484.5, 596],
  legend: [596, 624, 662.5, 692, 719],
  blocks: [719, 882.5, 1046],
  sub: [0, 22.5, 57.5, 93, 128, 163.5],
  notes: [1209.5, 1318.5],
  limit: true,
};

const CONT: F1Sheet = {
  top: 197.5,
  bottom: 1687,
  agreeHead: [225.5, 282],
  agreeText: [282, 329],
  names: [[329, 364], [364, 399.5]],
  agreeNote: [399.5, 427.5],
  detailHead: [427.5, 535.5],
  legend: [535.5, 573, 633.5, 671.5, 709],
  blocks: [709, 872.5, 1036, 1199.5, 1363],
  sub: [0, 22.5, 58, 93, 128.5, 163.5],
  notes: [1526.5, 1687],
};

/** 用紙の設定（0＝本表、1以降＝（続）） */
const sheetOf = (sheet: number): F1Sheet => (sheet === 0 ? SHEET : CONT);

/** 表の縦横比（GridForm の aspectRatio に渡す） */
export function table1112f1Aspect(sheet: number): string {
  const s = sheetOf(sheet);
  return `${RIGHT - LEFT} / ${s.bottom - s.top}`;
}

/** その用紙の先頭の明細番号（本表3件・以降5件ずつ） */
export function table1112f1First(sheet: number): number {
  return sheet === 0 ? 0 : TABLE1112F1_ROWS + (sheet - 1) * TABLE1112F1_CONT_ROWS;
}

/** 様式のコード（E02・G01 のように系列ごとに2桁で振られる） */
const cd = (series: string, n: number): string => `${series}${String(n).padStart(2, '0')}`;

/** この用紙に載る明細1件 */
export interface F1Item {
  /** フィールド接頭辞（'table1112f1#0.' など） */
  prefix: string;
  /** 通し番号（自動計算欄 `t.f1d{index}…` の添字） */
  index: number;
  /** アクセシブル名の主語 */
  label: string;
  /** 別表1と結び付いているか（③④が転記になり読み取り専用になる） */
  linked: boolean;
}

interface Ctx {
  row: (a: number, b: number) => [number, number];
  common: string;
  totals: string;
  whoOptions: GridCell['options'];
}

/** 「1 …」「2 …」の章見出し（太字の見出しと、その下に続く説明文） */
function sectionHead(
  ctx: Ctx, span: readonly [number, number], ratio: number, heading: string, lead: string, leadRatio = 1,
): GridCell[] {
  const at = (r: number): number => span[0] + (span[1] - span[0]) * r;
  const split = at(ratio);
  return [
    mk(ctx.row(span[0], span[1]), col(X.L, X.R), {}),
    label(ctx.row(span[0], split), col(X.L, X.R), heading, { noBorder: true, align: 'left', bold: true, fontSize: 9 }),
    label(ctx.row(split, at(leadRatio)), col(X.L, X.R), lead, { noBorder: true, align: 'left', fontSize: 7 }),
  ];
}

/** 1 特例の適用にあたっての同意（氏名6人分）。同意者は用紙をまたぐ1本の一覧として持つ。 */
function agreeRows(ctx: Ctx, s: F1Sheet, sheet: number): GridCell[] {
  const first = sheet * TABLE1112F1_AGREE;
  return [
    ...sectionHead(ctx, s.agreeHead, 0.55, '1　特例の適用にあたっての同意', AGREE_LEAD),
    // 同意文と氏名2行の左にある細い余白（罫線だけがある列）
    mk(ctx.row(s.agreeText[0], s.names[1][1]), col(X.L, X.BAND), {}),
    label(ctx.row(s.agreeText[0], s.agreeText[1]), col(X.BAND, X.R), AGREE_TEXT, { align: 'left', fontSize: 7 }),
    label(ctx.row(s.names[0][0], s.names[1][1]), col(X.BAND, X.SEL), '氏名'),
    ...s.names.flatMap((y, r): GridCell[] => AGREE_X.flatMap(([c0, c1, c2], k): GridCell[] => {
      const no = first + r * AGREE_X.length + k;
      return [
        code(ctx.row(y[0], y[1]), col(c0, c1), cd('E', 2 + r * AGREE_X.length + k)),
        mk(ctx.row(y[0], y[1]), col(c1, c2), {
          kind: 'input', field: `${ctx.common}f1ag${no}`, ariaLabel: `同意した人${no + 1}の氏名`,
          options: ctx.whoOptions, align: 'left',
        }),
      ];
    })),
    label(ctx.row(s.agreeNote[0], s.agreeNote[1]), col(X.L, X.R), AGREE_NOTE, { align: 'left', fontSize: 7 }),
  ];
}

/** 明細の見出し帯（左の縦帯・種類の見出し・①〜⑧の項目名） */
function legendRows(ctx: Ctx, s: F1Sheet): GridCell[] {
  const [y0, y1, y2, y3, y4] = s.legend;
  const blockEnd = s.blocks[s.blocks.length - 1]! + s.sub[5];
  const rows = [ctx.row(y0, y1), ctx.row(y1, y2), ctx.row(y2, y3), ctx.row(y3, y4)];
  const lefts = ['②　所在地番', '③　取得者の持分に応ずる宅地等の面積（㎡）', '④　取得者の持分に応ずる宅地等の価額（円）'];
  const rights = [
    '⑤　③のうち小規模宅地等（「限度面積要件」を満たす宅地等）の面積（㎡）',
    '⑥　④のうち小規模宅地等（④×⑤/③）の価額（円）',
    '⑦　課税価格の計算に当たって減額される金額（円）　（⑥×⑨）',
    '⑧　課税価格に算入する価額（円）　（④−⑦）',
  ];
  return [
    label(ctx.row(y0, blockEnd), col(X.L, X.SEL), '選択した小規模宅地等'),
    // 見出しと注記は様式では1マス（罫線で分かれていない）
    label(ctx.row(y0, y4), col(X.SEL, X.KIND), '小規模宅地等の種類\n\n（1〜4の番号を\n記入します。）', { fontSize: 7 }),
    label(rows[0]!, col(X.KIND, X.NAME), '①　特例の適用を受ける取得者の氏名', { align: 'left', fontSize: 7 }),
    label(rows[0]!, col(X.NAME, X.MID), '事業内容', { fontSize: 7 }),
    ...lefts.map((text, i) => label(rows[i + 1]!, col(X.KIND, X.MID), text, { align: 'left', fontSize: 7 })),
    ...rights.map((text, i) => label(rows[i]!, col(X.MID, X.R), text, { align: 'left', fontSize: 7 })),
  ];
}

/** 明細1件分のブロック（左に①〜④、右に⑤〜⑧） */
function detailBlock(ctx: Ctx, s: F1Sheet, n: number, item: F1Item): GridCell[] {
  const top = s.blocks[n]!;
  const y = (a: number, b: number): [number, number] => ctx.row(top + s.sub[a]!, top + s.sub[b]!);
  const full = y(0, 5);
  const p = item.prefix;
  const t = `${ctx.totals}f1d${item.index}`;
  const who = item.label;
  /** 左半分（②③④）／右半分（⑥⑦⑧）の3行 */
  const bodyRows: readonly [number, number][] = [y(2, 3), y(3, 4), y(4, 5)];
  return [
    // 小規模宅地等の種類（ブロック全体を通した1マス）
    code(full, col(X.SEL, X.KC), cd('G', 1 + n * 5)),
    mk(full, col(X.KC, X.KIND), {
      kind: 'input', field: `${p}kind`, ariaLabel: `${who}の小規模宅地等の種類`,
      options: KIND_OPTIONS, compactSelectedOption: true, align: 'center', fontSize: 9,
    }),

    // ①（丸番号は氏名の見出し行と入力行にまたがる）
    label(y(0, 2), col(X.KIND, X.N1), '①'),
    label(y(0, 1), col(X.N1, X.NAME), '取得者の氏名', { fontSize: 7 }),
    label(y(0, 1), col(X.NAME, X.MID), '事業内容', { fontSize: 7 }),
    code(y(1, 2), col(X.N1, X.C1), cd('E', 8 + n * 3)),
    mk(y(1, 2), col(X.C1, X.NAME), {
      kind: 'input', field: `${p}who`, ariaLabel: `${who}の取得者の氏名`, options: ctx.whoOptions, align: 'left',
    }),
    code(y(1, 2), col(X.NAME, X.C2), cd('E', 9 + n * 3)),
    mk(y(1, 2), col(X.C2, X.MID), {
      kind: 'input', field: `${p}biz`, ariaLabel: `${who}の事業内容`, align: 'left',
    }),

    // ②所在地番・③面積・④価額（③④は別表1と結び付けた明細では転記になる）
    ...LEFT_MARKS.map((mark, i) => label(bodyRows[i]!, col(X.KIND, X.N1), mark)),
    code(bodyRows[0]!, col(X.N1, X.C1), cd('E', 10 + n * 3)),
    mk(bodyRows[0]!, col(X.C1, X.MID), {
      kind: 'input', field: `${p}place`, ariaLabel: `${who}の所在地番`, align: 'left',
    }),
    code(bodyRows[1]!, col(X.N1, X.C1), cd('C', 1 + n * 2)),
    mk(bodyRows[1]!, col(X.C1, X.MID), item.linked
      ? { kind: 'input', field: `${t}v3`, ariaLabel: `${who}の取得者の持分に応ずる宅地等の面積`, decimalPlaces: 2, readOnly: true }
      : { kind: 'input', field: `${p}area`, ariaLabel: `${who}の取得者の持分に応ずる宅地等の面積`, decimalPlaces: 2 }),
    code(bodyRows[2]!, col(X.N1, X.C1), cd('G', 2 + n * 5)),
    mk(bodyRows[2]!, col(X.C1, X.MID), item.linked
      ? { kind: 'input', field: `${t}v4`, ariaLabel: `${who}の取得者の持分に応ずる宅地等の価額`, commaInteger: true, readOnly: true }
      : { kind: 'input', field: `${p}value`, ariaLabel: `${who}の取得者の持分に応ずる宅地等の価額`, commaInteger: true }),

    // ⑤選択した面積（⑤の丸番号は2行分）と、⑥⑦⑧の自動計算
    label(y(0, 2), col(X.MID, X.N2), '⑤'),
    code(y(0, 2), col(X.N2, X.C3), cd('C', 2 + n * 2)),
    mk(y(0, 2), col(X.C3, X.R), {
      kind: 'input', field: `${p}sel`, ariaLabel: `${who}の③のうち小規模宅地等の面積`, decimalPlaces: 2,
    }),
    ...RIGHT_MARKS.flatMap((mark, i): GridCell[] => [
      label(bodyRows[i]!, col(X.MID, X.N2), mark),
      code(bodyRows[i]!, col(X.N2, X.C3), cd('G', 3 + i + n * 5)),
      mk(bodyRows[i]!, col(X.C3, X.R), {
        kind: 'input', field: `${t}v${6 + i}`, ariaLabel: `${who} ${mark}`, commaInteger: true, readOnly: true,
      }),
    ]),
  ];
}

/** ○「限度面積要件」の判定（本表のみ） */
function limitRows(ctx: Ctx): GridCell[] {
  const t = ctx.totals;
  /**
   * イ・ロの入力欄。様式では「コード枠＋記入枠」が閉じた長方形で、単位（㎡≦330㎡ など）は
   * その外側に印字されている。x はコード枠の左端・記入枠の左端・記入枠の右端・欄の右端。
   */
  const limitCell = (
    y: [number, number], x: readonly [number, number, number, number], codeName: string, key: string,
    unit: GridCell['rightLabel'], name: string, over: string,
  ): GridCell[] => [
    code(y, col(x[0], x[1]), codeName),
    mk(y, col(x[1], x[2]), {
      kind: 'input', field: `${t}${key}`, ariaLabel: name, decimalPlaces: 2, readOnly: true,
      highlightWhen: (g) => g(`${t}${over}`) === '1',
    }),
    // 単位は記入枠の外。上辺と左辺は様式に無いので描かず、行の下罫線と縦罫線だけ残す
    mk(y, col(x[2], x[3]), { kind: 'label', rightLabel: unit, noBorderTop: true, noBorderLeft: true }),
  ];
  const iA = [353, 374, 481.5, 568] as const;
  const iB = [568, 589, 847, 998] as const;
  const roA = [353, 374, 524.5, 632] as const;
  const roB = [632, 653.5, 804, 912] as const;
  const roC = [912, 933, 1083.5, 1213] as const;
  return [
    ...sectionHead(ctx, [1324, 1372.5], 0.55, '○　「限度面積要件」の判定', LIMIT_LEAD),

    // 小規模宅地等の区分／種類／⑨減額割合（⑨は印字のみで入力欄が無い）
    label(ctx.row(1372.5, 1397), col(X.L, 353), '小規模宅地等の区分'),
    label(ctx.row(1372.5, 1397), col(353, 568), '被相続人等の居住用宅地等'),
    label(ctx.row(1372.5, 1397), col(568, X.R), '被相続人等の事業用宅地等'),
    mk(ctx.row(1397, 1464.5), col(X.L, X.BAND), {}),
    label(ctx.row(1397, 1421), col(X.BAND, 353), '小規模宅地等の種類'),
    label(ctx.row(1421, 1464.5), col(X.BAND, 353), '⑨　減額割合'),
    ...LIMIT_X.flatMap(([left, , right], k): GridCell[] => [
      label(ctx.row(1397, 1421), col(left, right), LIMIT_KINDS[k]!, { fontSize: 7 }),
      mk(ctx.row(1421, 1464.5), col(left, right), { kind: 'label', fraction: LIMIT_RATES[k]! }),
    ]),

    // ⑩ ⑤の小規模宅地等の面積の合計（全枚数を通した種類ごとの合計）
    label(ctx.row(1464.5, 1500), col(X.L, X.BAND), '⑩'),
    label(ctx.row(1464.5, 1500), col(X.BAND, 353), '⑤の小規模宅地等の面積の合計\n（㎡）', { align: 'left', fontSize: 7 }),
    ...LIMIT_X.flatMap(([c0, c1, c2], k): GridCell[] => [
      code(ctx.row(1464.5, 1500), col(c0, c1), cd('C', 7 + k)),
      mk(ctx.row(1464.5, 1500), col(c1, c2), {
        kind: 'input', field: `${t}f1a${k + 1}`, ariaLabel: `${LIMIT_KINDS[k]!} ⑩`, decimalPlaces: 2, readOnly: true,
      }),
    ]),

    // ⑪ 限度面積（4 貸付事業用宅地等の選択が無ければイ、あればロだけを埋める）
    mk(ctx.row(1500, 1619), col(X.L, 138), {}),
    label(ctx.row(1500, 1523.5), col(X.L, 138), '⑪', { noBorder: true }),
    label(ctx.row(1523.5, 1619), col(X.L, 138), '限度面積', { noBorder: true, forceVertical: true }),

    label(ctx.row(1500, 1559.5), col(138, 181), 'イ'),
    label(ctx.row(1500, 1559.5), col(181, 353), '小規模宅地等のうちに\n4　貸付事業用宅地等が\nない場合', { align: 'left', fontSize: 7 }),
    // 見出し〔…〕の下に罫線は無い（1523.5 の横線は記入枠の上辺だけ）
    label(ctx.row(1500, 1523.5), col(353, 568), '〔1の⑩の面積〕', { align: 'left', fontSize: 7, noBorderBottom: true }),
    label(ctx.row(1500, 1523.5), col(568, 998), '〔2の⑩及び3の⑩の面積の合計〕', { align: 'left', fontSize: 7, noBorderBottom: true }),
    ...limitCell(ctx.row(1523.5, 1559.5), iA, 'C11', 'f1i1', '㎡　≦　330㎡', '⑪イ 1の⑩の面積', 'f1ovI1'),
    ...limitCell(ctx.row(1523.5, 1559.5), iB, 'C12', 'f1i2', '㎡　≦　400㎡', '⑪イ 2の⑩及び3の⑩の面積の合計', 'f1ovI2'),
    mk(ctx.row(1500, 1559.5), col(998, X.R), { diagonal: 'bltr' }),

    label(ctx.row(1559.5, 1619), col(138, 181), 'ロ'),
    label(ctx.row(1559.5, 1619), col(181, 353), '小規模宅地等のうちに\n4　貸付事業用宅地等が\nある場合', { align: 'left', fontSize: 7 }),
    // ロの見出しは3つの〔…〕が1本の帯に並ぶ（間に縦罫線が無い）ので、帯を1枚敷いて文字を重ねる
    mk(ctx.row(1559.5, 1583), col(353, X.R), { noBorderBottom: true }),
    label(ctx.row(1559.5, 1583), col(353, 632), '〔1の⑩の面積〕', { noBorder: true, align: 'left', fontSize: 7 }),
    label(ctx.row(1559.5, 1583), col(632, 912), '〔2の⑩及び3の⑩の面積の合計〕', { noBorder: true, align: 'left', fontSize: 7 }),
    label(ctx.row(1559.5, 1583), col(912, X.R), '〔4の⑩の面積〕', { noBorder: true, align: 'left', fontSize: 7 }),
    ...limitCell(ctx.row(1583, 1619), roA, 'C13', 'f1o1', ['㎡　×', { top: '200', bottom: '330' }, '　＋'], '⑪ロ 1の⑩の面積', 'f1ovO'),
    ...limitCell(ctx.row(1583, 1619), roB, 'C14', 'f1o2', ['㎡　×', { top: '200', bottom: '400' }, '　＋'], '⑪ロ 2の⑩及び3の⑩の面積の合計', 'f1ovO'),
    ...limitCell(ctx.row(1583, 1619), roC, 'C15', 'f1o3', '㎡　≦　200㎡', '⑪ロ 4の⑩の面積', 'f1ovO'),

    label(ctx.row(1619, 1657), col(X.L, X.R), LIMIT_NOTE, { align: 'left', fontSize: 7 }),
  ];
}

/**
 * 第11・11の2表の付表1（本表・（続））のセルを組み立てる。
 * @param common 共通欄のフィールド接頭辞（'c.'）— 被相続人の氏名と同意者の一覧
 * @param totals 自動計算欄のフィールド接頭辞（'t.'）— ⑥⑦⑧・⑩・⑪
 * @param sheet 0＝本表、1以降＝（続）の枚数
 * @param items この用紙に載る明細（本表3件・（続）5件。不足分も接頭辞だけは渡す）
 * @param whoOptions 氏名欄の選択肢（値はその人のID。計算へ渡る前に「何人目か」へ直される）
 */
export function buildTable1112f1(
  common: string, totals: string, sheet: number, items: F1Item[], whoOptions: GridCell['options'],
): GridCell[] {
  const s = sheetOf(sheet);
  const row = (a: number, b: number): [number, number] => [
    ((a - s.top) / (s.bottom - s.top)) * 100,
    ((b - s.top) / (s.bottom - s.top)) * 100,
  ];
  const ctx: Ctx = { row, common, totals, whoOptions };
  const decY = row(s.top, s.intro?.[0] ?? s.agreeHead[0]);
  return [
    // 被相続人（第1表の氏名と同じ欄を共有する）
    mk(decY, col(X.L, DEC.L), { noBorder: true }),
    label(decY, col(DEC.L, DEC.CODE), '被相続人'),
    code(decY, col(DEC.CODE, DEC.INPUT), 'E01'),
    mk(decY, col(DEC.INPUT, X.R), {
      kind: 'input', field: `${common}name`, ariaLabel: '被相続人の氏名', align: 'left', fontSize: 10,
      readOnly: true, navigateToForm: 'table1',
    }),

    ...(s.intro ? [label(row(s.intro[0], s.intro[1]), col(X.L, X.R), INTRO, { align: 'left', fontSize: 7 })] : []),
    ...agreeRows(ctx, s, sheet),
    // 2の説明文は種類の注記（0.52から）の上の帯に収める
    ...sectionHead(ctx, s.detailHead, 0.24, '2　小規模宅地等の明細', DETAIL_LEAD, 0.52),
    label(
      row(s.detailHead[0] + (s.detailHead[1] - s.detailHead[0]) * 0.52, s.detailHead[1]),
      col(X.KIND, X.R), DETAIL_KIND_NOTE, { noBorder: true, align: 'left', fontSize: 7 },
    ),
    // 注記から種類欄へ下りる矢印（様式では注記の左端から折れて下を指す）
    label(
      row(s.detailHead[0] + (s.detailHead[1] - s.detailHead[0]) * 0.52, s.detailHead[1]),
      col(X.SEL, X.KIND), '↓', { noBorder: true, align: 'center', fontSize: 12 },
    ),
    ...legendRows(ctx, s),
    ...items.flatMap((item, n) => detailBlock(ctx, s, n, item)),
    mk(row(s.notes[0], s.notes[1]), col(X.L, X.R), { kind: 'label', numberedNotes: NOTES, align: 'left', fontSize: 7 }),
    ...(s.limit === true ? [mk(row(1318.5, 1324), col(X.L, X.R), { noBorder: true }), ...limitRows(ctx)] : []),
  ];
}
