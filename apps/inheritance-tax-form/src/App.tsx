import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { GridForm, type GridCell } from './components/ui/GridForm';
import {
  COMMON, EDITION, TABLE1_FORM_CODE, TABLE1_NOTES, TABLE1_TITLE, TOTALS, buildTable1, taxOfficeOptions,
} from './forms/table1';
import { TAX_OFFICE_PREFS } from './data/taxOffices';
import {
  TABLE1CONT_CONFIRM_BOXES, TABLE1CONT_FORM_CODE, TABLE1CONT_NOTES, TABLE1CONT_TITLE, buildTable1Cont,
} from './forms/table1cont';
import {
  TABLE2_EDITION, TABLE2_FORM_CODE, TABLE2_JOINT_NOTES, TABLE2_NOTES, TABLE2_SUBTITLE, TABLE2_TITLE, buildTable2,
} from './forms/table2';
import {
  TABLE11_FORM_CODE, TABLE11_ROWS, TABLE11_SUBTITLE, TABLE11_TITLE, buildTable11,
} from './forms/table11';
import {
  TABLE112_FORM_CODE, TABLE112_ROWS, TABLE112_SUBTITLE, TABLE112_TITLE, buildTable112,
} from './forms/table112';
import {
  TABLE13_ASPECT, TABLE13_DEBT_ROWS, TABLE13_FORM_CODE, TABLE13_FUNERAL_ROWS, TABLE13_EDITION,
  TABLE13_PERSONS, TABLE13_SUBTITLE, TABLE13_TITLE, buildTable13,
} from './forms/table13';
import {
  TABLE14_ASPECT, TABLE14_BEQUEST_ROWS, TABLE14_DONATION_ROWS, TABLE14_EDITION, TABLE14_FORM_CODE,
  TABLE14_GIFT_ROWS, TABLE14_SUBTITLE, TABLE14_TITLE, buildTable14,
} from './forms/table14';
import {
  TABLE15CONT_FORM_CODE, TABLE15CONT_PERSONS, TABLE15CONT_SUBTITLE, TABLE15CONT_TITLE,
  TABLE15_ASPECT, TABLE15_EDITION, TABLE15_FORM_CODE, TABLE15_SUBTITLE, TABLE15_TITLE,
  buildTable15,
} from './forms/table15';
import {
  TABLE1112F1C_FORM_CODE, TABLE1112F1C_SUBTITLE, TABLE1112F1C_TITLE, TABLE1112F1_CONT_ROWS,
  TABLE1112F1_EDITION, TABLE1112F1_FORM_CODE, TABLE1112F1_ROWS, TABLE1112F1_SUBTITLE,
  TABLE1112F1_TITLE, buildTable1112f1, table1112f1Aspect, table1112f1First,
} from './forms/table1112f1';
import {
  TABLE1112F1B_ASPECT, TABLE1112F1B_FORM_CODE, TABLE1112F1B_OWNERS, TABLE1112F1B_SUBTITLE,
  TABLE1112F1B_TITLE, buildTable1112f1b,
} from './forms/table1112f1b';
import {
  TABLE10_ASPECT, TABLE10_EDITION, TABLE10_FORM_CODE, TABLE10_ROWS, TABLE10_SUBTITLE, TABLE10_TITLE,
  buildTable10,
} from './forms/table10';
import {
  TABLE9_ASPECT, TABLE9_EDITION, TABLE9_FORM_CODE, TABLE9_ROWS, TABLE9_SUBTITLE, TABLE9_TITLE, buildTable9,
} from './forms/table9';
import {
  TABLE4_ASPECT, TABLE4_EDITION, TABLE4_FORM_CODE, TABLE4_NOTES, TABLE4_PERSONS, TABLE4_SUBTITLE,
  TABLE4_TITLE, buildTable4,
} from './forms/table4';
import {
  TABLE42_ASPECT, TABLE42_EDITION, TABLE42_FORM_CODE, TABLE42_NOTES, TABLE42_PERSONS, TABLE42_SUBTITLE,
  TABLE42_TITLE, buildTable42,
} from './forms/table42';
import {
  TABLE5_ASPECT, TABLE5_EDITION, TABLE5_FORM_CODE, TABLE5_NOTES, TABLE5_SUBTITLE, TABLE5_TITLE, buildTable5,
} from './forms/table5';
import {
  TABLE6_ASPECT, TABLE6_EDITION, TABLE6_FORM_CODE, TABLE6_NOTES, TABLE6_SUBTITLE, TABLE6_TITLE, buildTable6,
} from './forms/table6';
import {
  TABLE7_ASPECT, TABLE7_EDITION, TABLE7_FORM_CODE, TABLE7_NOTES, TABLE7_SUBTITLE, TABLE7_TITLE, buildTable7,
} from './forms/table7';
import {
  TABLE88_ASPECT, TABLE88_EDITION, TABLE88_FORM_CODE, TABLE88_NOTES, TABLE88_PERSONS, TABLE88_SUBTITLE,
  TABLE88_TITLE, buildTable88,
} from './forms/table88';
import { DETAIL_GROUPS, buildDetail, detailAspect } from './forms/detail';
import { TABLE11F1_SHARE, TABLE11F1_SPEC } from './forms/table11f1';
import { TABLE11F2_SHARE, TABLE11F2_SPEC } from './forms/table11f2';
import { TABLE11F3_SHARE, TABLE11F3_SPEC } from './forms/table11f3';
import { TABLE11F4_SHARE, TABLE11F4_SPEC } from './forms/table11f4';
import { detailLabel, detailPrefix, heirLabel, heirPrefix, useFormData } from './hooks/useFormData';
import {
  hasTable112, spouseIndex, table10Pages, table112Pages, table13Pages, table14Pages, table15Transferred,
  table42Pages, table4Pages, table88Pages, table9Pages,
} from './lib/calc';

/** 様式ID → その様式を使うときに第1表が転記欄になる行。様式を足したらここに1行追加する。 */
const TRANSFERRED_BY_FORM: Record<string, readonly string[]> = {
  table4: ['v11'],    // ⑪ ← 第4表⑥
  table42: ['v12'],   // ⑫ ← 第4表の2㉕
  table11: ['v1'],    // ① ← 第11表2③
  table112: ['v2', 'v17'], // ② ← 第11の2表1⑧ ／ ⑰ ← 同1⑨
  table13: ['v3'],    // ③ ← 第13表3⑦
  table14: ['v5'],    // ⑤ ← 第14表1④
  table88: ['v14', 'v20'], // ⑭ ← 第8の8表1⑤ ／ ⑳ ← 同2⑧
};

/** 第11の2表の枚数の上限（1人分・1枚に年分6行） */
const MAX_TABLE112_PAGES = 10;

/** 第13表の枚数の上限 */
const MAX_TABLE13_PAGES = 10;

/** 第4表の枚数の上限（1枚に加算の対象となる人4人分） */
const MAX_TABLE4_PAGES = 10;

/** 第4表の2の枚数の上限（1枚に控除を受ける人3人分） */
const MAX_TABLE42_PAGES = 10;

/** 第14表の枚数の上限（1枚に1の明細4件・2と3の明細2件ずつ） */
const MAX_TABLE14_PAGES = 10;

/** 第8の8表の枚数の上限（1枚に2人分） */
const MAX_TABLE88_PAGES = 10;

/** 第9表の枚数の上限 */
const MAX_TABLE9_PAGES = 10;

/** 第10表の枚数の上限 */
const MAX_TABLE10_PAGES = 10;

/** 画面左の一覧と印刷順を決める様式の登録簿。様式を足したらここに1行追加する。 */
interface FormMeta {
  id: string;
  label: string;
  note: string;
  /** 常に使用する様式（チェックを外せない） */
  required?: boolean;
  /** 人数に応じて自動で付く様式（チェックを持たない） */
  auto?: boolean;
}

const FORMS: FormMeta[] = [
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
  { id: 'table112', label: '第11の2表', note: '相続時精算課税適用財産の明細書' },
  { id: 'table11f1', label: '第11表の付表1', note: '財産の明細書（土地・家屋等用）' },
  { id: 'table11f2', label: '第11表の付表2', note: '財産の明細書（有価証券用）' },
  { id: 'table11f3', label: '第11表の付表3', note: '財産の明細書（現金・預貯金等用）' },
  { id: 'table11f4', label: '第11表の付表4', note: '財産の明細書（事業用・家庭用・その他）' },
  { id: 'table1112f1', label: '第11・11の2表の付表1', note: '小規模宅地等についての課税価格の計算明細書' },
  { id: 'table1112f1c', label: '同（続）', note: '小規模宅地等の明細 4件目以降', auto: true },
  { id: 'table1112f1b', label: '同（別表1）', note: '一の宅地等ごとの取得者別の面積・評価額' },
  { id: 'table13', label: '第13表', note: '債務及び葬式費用の明細書' },
  { id: 'table14', label: '第14表', note: '純資産価額に加算される暦年課税分の贈与財産価額等の明細書' },
  { id: 'table15', label: '第15表', note: '相続財産の種類別価額表' },
  { id: 'table15cont', label: '第15表（続）', note: '財産を取得した人 2人目以降', auto: true },
];

/** 付表（財産の明細書）の様式ID → 割付。様式を足したらここに1行追加する。 */
const DETAIL_SPECS = {
  table11f1: { spec: TABLE11F1_SPEC, share: TABLE11F1_SHARE },
  table11f2: { spec: TABLE11F2_SPEC, share: TABLE11F2_SHARE },
  table11f3: { spec: TABLE11F3_SPEC, share: TABLE11F3_SHARE },
  table11f4: { spec: TABLE11F4_SPEC, share: TABLE11F4_SHARE },
} as const;

/** 付表は様式IDと枚数以外の作りが同じなので、レジストリから画面を組み立てる */
const DETAIL_FORMS = Object.keys(DETAIL_SPECS) as (keyof typeof DETAIL_SPECS)[];

/** 様式の枠外に印字されている注記と適用年分 */
function Footnote({ notes, edition = EDITION }: { notes: string; edition?: string }) {
  return (
    <div className="gov-footnote">
      <span>{notes}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{edition}</span>
    </div>
  );
}

/** 第1表（続）の罫線表の下に並ぶ「※確認」欄 */
function ConfirmBoxes() {
  return (
    <div style={{ position: 'relative', height: 13, marginTop: 2 }}>
      {TABLE1CONT_CONFIRM_BOXES.map((box) => (
        <div
          key={box.left}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: `${box.left}%`, width: `${box.width}%`,
            border: '0.5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: box.code ? 6 : 7, lineHeight: 1,
          }}
        >
          {box.text ?? box.code ?? ''}
        </div>
      ))}
    </div>
  );
}

interface PageProps {
  page: number;
  g: (field: string) => string;
  u: (field: string, value: string) => void;
}

interface ContPageProps extends PageProps {
  /** 他の様式からの転記になっている行（読み取り専用にする） */
  transferred: readonly string[];
  /** 配偶者の列だけの転記行（⑬を含む） */
  transferredSpouse: readonly string[];
  /** 配偶者の相続人番号（0起点。いなければ −1） */
  spouse: number;
}

/** 第1表（続）1枚（財産を取得した人2人分） */
function ContPage({ page, g, u, transferred, transferredSpouse, spouse }: ContPageProps) {
  const a = 1 + page * 2;
  const b = a + 1;
  const cells = useMemo(() => {
    const pick = (i: number) => (i === spouse ? transferredSpouse : transferred);
    return buildTable1Cont(heirPrefix(a), heirLabel(a), heirPrefix(b), heirLabel(b), pick(a), pick(b));
  }, [a, b, spouse, transferred, transferredSpouse]);
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE1CONT_FORM_CODE}
        title={[TABLE1CONT_TITLE, `${heirLabel(a)}・${heirLabel(b)}`].join('　')}
        formId={`t1c${page}`}
        footer={
          <>
            <div className="gov-aside">※の項目は記入する必要がありません。</div>
            <ConfirmBoxes />
            <Footnote notes={TABLE1CONT_NOTES} />
          </>
        }
      />
    </div>
  );
}

interface Table11PageProps extends PageProps {
  /** 付表を使う場合は2①が付表からの転記になる */
  detail: boolean;
}

/** 第11表1枚（財産を取得した人10人分） */
function Table11Page({ page, g, u, detail }: Table11PageProps) {
  const cells = useMemo(
    () => buildTable11(COMMON, Array.from({ length: TABLE11_ROWS }, (_, i) => {
      const index = page * TABLE11_ROWS + i;
      return { prefix: heirPrefix(index), label: heirLabel(index) };
    }), detail),
    [page, detail],
  );
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE11_FORM_CODE}
        title={TABLE11_TITLE}
        subtitle={TABLE11_SUBTITLE}
        aspectRatio="1073 / 1579"
        formId={`t11p${page}`}
        footer={<Footnote notes="" />}
      />
    </div>
  );
}

interface Table112PageProps extends PageProps {
  /** 何人目の分か（この様式は贈与を受けた人ごとに1枚以上書く） */
  heir: number;
  /** その人の最終ページ（⑧⑨⑩の合計はページをまたぐので最終ページにだけ出す） */
  last: boolean;
}

/** 第11の2表1枚（1人分・年分6行＋財産の明細6行） */
function Table112Page({ heir, page, last, g, u }: Table112PageProps) {
  const cells = useMemo(
    () => buildTable112(COMMON, heirPrefix(heir), heirLabel(heir), page, last),
    [heir, page, last],
  );
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE112_FORM_CODE}
        title={TABLE112_TITLE}
        subtitle={TABLE112_SUBTITLE}
        aspectRatio="1167.5 / 1420"
        formId={`t112h${heir}p${page}`}
        footer={<Footnote notes="" />}
      />
    </div>
  );
}

interface Table4PageProps extends PageProps {
  /** 氏名の選択肢（項番を値に、氏名を表示に持つ） */
  whoOptions: GridCell['options'];
}

/** 第4表1枚（加算の対象となる人4人分） */
function Table4Page({ page, whoOptions, g, u }: Table4PageProps) {
  const cells = useMemo(() => buildTable4(COMMON, TOTALS, page, whoOptions), [page, whoOptions]);
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE4_FORM_CODE}
        title={TABLE4_TITLE}
        subtitle={TABLE4_SUBTITLE}
        aspectRatio={TABLE4_ASPECT}
        formId={`t4p${page}`}
        footer={<Footnote notes={TABLE4_NOTES} edition={TABLE4_EDITION} />}
      />
    </div>
  );
}

/** 第4表の2 1枚（控除を受ける人3人分） */
function Table42Page({ page, whoOptions, g, u }: Table4PageProps) {
  const cells = useMemo(() => buildTable42(COMMON, TOTALS, page, whoOptions), [page, whoOptions]);
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE42_FORM_CODE}
        title={TABLE42_TITLE}
        subtitle={TABLE42_SUBTITLE}
        aspectRatio={TABLE42_ASPECT}
        formId={`t42p${page}`}
        footer={<Footnote notes={TABLE42_NOTES} edition={TABLE42_EDITION} />}
      />
    </div>
  );
}

interface Table9PageProps extends PageProps {
  /** ⒷとⒷに基づく②③の合計は全枚数の通算なので、最終ページにだけ出す */
  last: boolean;
  /** 氏名の選択肢（項番を値に、氏名を表示に持つ） */
  whoOptions: GridCell['options'];
}

/** 第9表1枚（保険金の明細5件・相続人5人分） */
function Table9Page({ page, last, whoOptions, g, u }: Table9PageProps) {
  const cells = useMemo(
    () => buildTable9(COMMON, TOTALS, page, last, whoOptions),
    [page, last, whoOptions],
  );
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE9_FORM_CODE}
        title={TABLE9_TITLE}
        subtitle={TABLE9_SUBTITLE}
        aspectRatio={TABLE9_ASPECT}
        formId={`t9p${page}`}
        footer={<Footnote notes="" edition={TABLE9_EDITION} />}
      />
    </div>
  );
}

/** 第10表1枚（退職手当金などの明細5件・相続人5人分）。構成は第9表と同じ */
function Table10Page({ page, last, whoOptions, g, u }: Table9PageProps) {
  const cells = useMemo(
    () => buildTable10(COMMON, TOTALS, page, last, whoOptions),
    [page, last, whoOptions],
  );
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE10_FORM_CODE}
        title={TABLE10_TITLE}
        subtitle={TABLE10_SUBTITLE}
        aspectRatio={TABLE10_ASPECT}
        formId={`t10p${page}`}
        footer={<Footnote notes="" edition={TABLE10_EDITION} />}
      />
    </div>
  );
}

interface Table13PageProps extends PageProps {
  /** 3の「債務などを承継した人」は1枚に4人分。最終ページにだけ（各人の合計）を出す */
  last: boolean;
  /** 「負担する人の氏名」の選択肢（項番を値に、氏名を表示に持つ） */
  whoOptions: GridCell['options'];
}

/** 第13表1枚（債務4件・葬式費用5件・承継した人4人分） */
function Table13Page({ page, last, whoOptions, g, u }: Table13PageProps) {
  const cells = useMemo(
    () => buildTable13(COMMON, TOTALS, Array.from({ length: TABLE13_PERSONS }, (_, i) => {
      const index = page * TABLE13_PERSONS + i;
      return { prefix: heirPrefix(index), label: heirLabel(index) };
    }), page, last, whoOptions),
    [page, last, whoOptions],
  );
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE13_FORM_CODE}
        title={TABLE13_TITLE}
        subtitle={TABLE13_SUBTITLE}
        aspectRatio={TABLE13_ASPECT}
        formId={`t13p${page}`}
        footer={<Footnote notes="" edition={TABLE13_EDITION} />}
      />
    </div>
  );
}

/** 第14表1枚（1の明細4件・④4人分・2と3の明細2件ずつ） */
function Table14Page({ page, last, whoOptions, g, u }: Table13PageProps) {
  const cells = useMemo(() => buildTable14(COMMON, TOTALS, page, last, whoOptions), [page, last, whoOptions]);
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE14_FORM_CODE}
        title={TABLE14_TITLE}
        subtitle={TABLE14_SUBTITLE}
        aspectRatio={TABLE14_ASPECT}
        formId={`t14p${page}`}
        footer={<Footnote notes="" edition={TABLE14_EDITION} />}
      />
    </div>
  );
}

interface Table88PageProps extends PageProps {
  /** 「氏名」の選択肢（項番を値に、氏名を表示に持つ） */
  whoOptions: GridCell['options'];
  /** 第6表を使っているか（1の①②が転記になり読み取り専用になる） */
  autoCredit: boolean;
  /** 第7表を使っているか（同じく1の③） */
  autoSuccessive: boolean;
}

/** 第8の8表1枚（1 税額控除額・2 納税猶予税額とも2人分） */
function Table88Page({ page, whoOptions, autoCredit, autoSuccessive, g, u }: Table88PageProps) {
  const cells = useMemo(
    () => buildTable88(COMMON, TOTALS, page, autoCredit, autoSuccessive, whoOptions),
    [page, autoCredit, autoSuccessive, whoOptions],
  );
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE88_FORM_CODE}
        title={TABLE88_TITLE}
        subtitle={TABLE88_SUBTITLE}
        aspectRatio={TABLE88_ASPECT}
        formId={`t88p${page}`}
        footer={<Footnote notes={TABLE88_NOTES} edition={TABLE88_EDITION} />}
      />
    </div>
  );
}

interface Table15ContPageProps extends PageProps {
  /** 他の様式からの転記になっている欄（丸番号。読み取り専用にする） */
  t15Transferred: ReadonlySet<string>;
}

/** 第15表（続）1枚（財産を取得した人2人分。1人目は第15表の右列に載るので2人目から） */
function Table15ContPage({ page, g, u, t15Transferred }: Table15ContPageProps) {
  const a = 1 + page * TABLE15CONT_PERSONS;
  const b = a + 1;
  const cells = useMemo(
    () => buildTable15(COMMON, [
      { prefix: heirPrefix(a), label: heirLabel(a), nameCode: 'E02' },
      { prefix: heirPrefix(b), label: heirLabel(b), nameCode: 'E03' },
    ], t15Transferred),
    [a, b, t15Transferred],
  );
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE15CONT_FORM_CODE}
        title={[TABLE15CONT_TITLE, `${heirLabel(a)}・${heirLabel(b)}`].join('　')}
        subtitle={TABLE15CONT_SUBTITLE}
        aspectRatio={TABLE15_ASPECT}
        formId={`t15c${page}`}
        footer={<Footnote notes="" edition={TABLE15_EDITION} />}
      />
    </div>
  );
}

interface Table1112f1PageProps {
  g: (field: string) => string;
  u: (field: string, value: string) => void;
  /** 0＝本表、1以降＝（続）の何枚目か */
  sheet: number;
  /** この用紙に載る明細の件数（本表3件・（続）5件） */
  rows: number;
  /** 明細ごとに別表1と結び付いているか。'0'/'1' の並びにして useMemo を効かせる */
  linkedMask: string;
  whoOptions: GridCell['options'];
}

/** 第11・11の2表の付表1／（続）1枚 */
function Table1112f1Page({ sheet, rows, linkedMask, whoOptions, g, u }: Table1112f1PageProps) {
  const first = table1112f1First(sheet);
  const cells = useMemo(
    () => buildTable1112f1(COMMON, TOTALS, sheet, Array.from({ length: rows }, (_, i) => ({
      prefix: detailPrefix('table1112f1', first + i),
      index: first + i,
      label: detailLabel(first + i),
      linked: linkedMask[i] === '1',
    })), whoOptions),
    [sheet, first, rows, linkedMask, whoOptions],
  );
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={sheet === 0 ? TABLE1112F1_FORM_CODE : TABLE1112F1C_FORM_CODE}
        title={sheet === 0 ? TABLE1112F1_TITLE : TABLE1112F1C_TITLE}
        subtitle={sheet === 0 ? TABLE1112F1_SUBTITLE : TABLE1112F1C_SUBTITLE}
        aspectRatio={table1112f1Aspect(sheet)}
        formId={`t1112f1s${sheet}`}
        footer={<Footnote notes="" edition={TABLE1112F1_EDITION} />}
      />
    </div>
  );
}

interface Table1112f1bPageProps {
  g: (field: string) => string;
  u: (field: string, value: string) => void;
  /** 何枚目（＝一の宅地等の何件目）か */
  sheet: number;
  whoOptions: GridCell['options'];
}

/** 第11・11の2表の付表1（別表1）1枚（一の宅地等1件・取得者2人分） */
function Table1112f1bPage({ sheet, whoOptions, g, u }: Table1112f1bPageProps) {
  const cells = useMemo(
    () => buildTable1112f1b(COMMON, TOTALS, detailPrefix('table1112f1b', sheet), sheet, whoOptions),
    [sheet, whoOptions],
  );
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE1112F1B_FORM_CODE}
        title={`${TABLE1112F1B_TITLE} ${sheet + 1}件目`}
        subtitle={TABLE1112F1B_SUBTITLE}
        aspectRatio={TABLE1112F1B_ASPECT}
        formId={`t1112f1b${sheet}`}
        footer={<Footnote notes="" edition={TABLE1112F1_EDITION} />}
      />
    </div>
  );
}

interface DetailPageProps extends PageProps {
  form: keyof typeof DETAIL_SPECS;
}

/** 付表（財産の明細書）1枚（財産8件分） */
function DetailPage({ form, page, g, u }: DetailPageProps) {
  const { spec, share } = DETAIL_SPECS[form];
  const cells = useMemo(
    () => buildDetail(spec, share, COMMON, Array.from({ length: DETAIL_GROUPS }, (_, i) => {
      const index = page * DETAIL_GROUPS + i;
      return { prefix: detailPrefix(form, index), label: detailLabel(index) };
    })),
    [spec, share, form, page],
  );
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={spec.formCode}
        title={spec.title}
        subtitle={spec.subtitle}
        aspectRatio={detailAspect(spec)}
        formId={`${form}p${page}`}
        footer={<Footnote notes="" />}
      />
    </div>
  );
}

/**
 * サイドバーの開閉状態の保存先。申告内容（inheritance-tax-form:v1）とは別キーにして、
 * JSON保存/読込・クリアの対象から外す（画面の見た目であって申告内容ではないため）。
 */
const SIDEBAR_KEY = 'inheritance-tax-form:sidebar';

function loadSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'closed';
  } catch {
    return true;
  }
}

export default function App() {
  const {
    data, g, u, addHeir, removeHeir, addDetailPage, removeDetailPage, setDetailCount,
    toggleUsed, reset, exportJson, importJson, maxHeirs,
  } = useFormData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState('table1');
  const [sidebarOpen, setSidebarOpen] = useState(loadSidebarOpen);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? 'open' : 'closed');
    } catch {
      // privacy モード等では保存を諦める（開閉自体は続けられる）
    }
  }, [sidebarOpen]);

  // 使用する様式によって第1表の一部が転記欄になるため、その行を読み取り専用にする
  const transferred = useMemo(
    () => data.used.flatMap((id) => TRANSFERRED_BY_FORM[id] ?? []),
    [data.used],
  );
  // 第5表の㋩は配偶者の⑬への転記なので、配偶者の列だけ⑬を読み取り専用にする
  const spouse = useMemo(
    () => (data.used.includes('table5') ? spouseIndex(data.heirs) : -1),
    [data.used, data.heirs],
  );
  const transferredSpouse = useMemo(() => [...transferred, 'v13'], [transferred]);
  // 提出先税務署の候補（都道府県で絞る。都道府県は用紙の外で選ぶ画面だけの操作）
  const officePref = data.common.officePref ?? '';
  const officeOptions = useMemo(
    () => taxOfficeOptions(officePref, data.common.office ?? ''),
    [officePref, data.common.office],
  );
  const table1Cells = useMemo(
    () => buildTable1(heirPrefix(0), spouse === 0 ? transferredSpouse : transferred, officeOptions),
    [spouse, transferred, transferredSpouse, officeOptions],
  );
  const table2Cells = useMemo(() => buildTable2(COMMON, TOTALS), []);
  const table5Cells = useMemo(() => buildTable5(COMMON, TOTALS), []);
  const contPages = Math.ceil(Math.max(0, data.heirs.length - 1) / 2);
  const table11Pages = Math.max(1, Math.ceil(data.heirs.length / TABLE11_ROWS));
  /** 付表の枚数（明細の件数から決まる。1枚は必ず出す） */
  const detailPages = (form: string): number => Math.max(1, Math.ceil((data.details[form]?.length ?? 0) / DETAIL_GROUPS));
  /** 付表を1つでも使うなら、第11表2①は付表からの転記になる */
  const detailUsed = Object.keys(DETAIL_SPECS).some((id) => data.used.includes(id));
  /** 第13表の枚数（3の承継した人が1枚に4人分しか入らないので人数でも増える） */
  const t13Pages = table13Pages(data.common, data.heirs.length);
  /** 第4表の枚数（加算の対象になるかは続柄だけでは決まらないので人数からは決めない） */
  const t4Pages = table4Pages(data.common);
  /** 第4表の2の枚数（贈与税を納めているかは相続人の一覧からは分からないので人数からは決めない） */
  const t42Pages = table42Pages(data.common);
  /** 第14表の枚数（3つの節がそれぞれ別の件数を持つので表全体で1つ） */
  const t14Pages = table14Pages(data.common);
  /** 第8の8表の枚数（控除・猶予の対象者は相続人の一覧からは分からないので人数からは決めない） */
  const t88Pages = table88Pages(data.common);
  /** 第9表の枚数（明細も相続人も1枚に5件ずつ） */
  const t9Pages = table9Pages(data.common);
  /** 第10表の枚数（第9表と同じく1枚に5件ずつ） */
  const t10Pages = table10Pages(data.common);
  /** 第13表の「負担する人の氏名」。値は項番（1始まり）で、印字は氏名になる */
  const whoOptions = useMemo(
    (): GridCell['options'] => ['', ...data.heirs.map((heir, i) => ({ value: String(i + 1), label: heir.name ?? '' }))],
    [data.heirs],
  );
  /** 第6表の氏名欄も選択式（③⑤の相続税額を第1表から自動転記するため） */
  const table6Cells = useMemo(() => buildTable6(COMMON, TOTALS, whoOptions), [whoOptions]);
  /** 第7表の氏名欄も選択式（⑩の純資産価額を第1表から自動転記するため） */
  const table7Cells = useMemo(() => buildTable7(COMMON, TOTALS, whoOptions), [whoOptions]);
  /** 第15表で他の様式からの転記になっている欄（丸番号） */
  const t15Transferred = useMemo(() => new Set(table15Transferred(data.used)), [data.used]);
  /** 第15表（続）の枚数（第15表に1人目まで載るので、2人目以降を2人ずつ） */
  const t15ContPages = data.used.includes('table15')
    ? Math.ceil(Math.max(0, data.heirs.length - 1) / TABLE15CONT_PERSONS)
    : 0;
  const table15Cells = useMemo(
    () => buildTable15(COMMON, [
      { prefix: TOTALS, label: '各人の合計' },
      { prefix: heirPrefix(0), label: heirLabel(0), nameCode: 'E02' },
    ], t15Transferred),
    [t15Transferred],
  );

  /** 第11・11の2表の付表1の明細の件数（本表1枚分は常に出す） */
  const f1Count = Math.max(TABLE1112F1_ROWS, data.details.table1112f1?.length ?? 0);
  /** （続）の枚数（本表に3件載るので4件目から5件ずつ） */
  const f1ContPages = data.used.includes('table1112f1')
    ? Math.ceil(Math.max(0, f1Count - TABLE1112F1_ROWS) / TABLE1112F1_CONT_ROWS)
    : 0;
  /** 別表1の枚数（一の宅地等1件＝1枚） */
  const f1bCount = Math.max(1, data.details.table1112f1b?.length ?? 0);
  /**
   * 明細の「対応する別表1」の選択肢。値は `枚数-取得者` で、
   * 選ぶとその取得者の「2 選択特例対象宅地等」が明細の③④に転記される。
   */
  const f1LinkOptions = useMemo(
    () => Array.from({ length: f1bCount }, (_, s) => Array.from(
      { length: TABLE1112F1B_OWNERS },
      (_unused, b) => ({ value: `${s}-${b}`, label: `別表1 ${s + 1}件目・取得者${b + 1}` }),
    )).flat(),
    [f1bCount],
  );
  /** 明細ごとに別表1と結び付いているか（③④を読み取り専用にする） */
  const f1LinkedMask = useMemo(
    () => Array.from({ length: f1Count }, (_, i) => ((data.details.table1112f1?.[i]?.link ?? '') === '' ? '0' : '1')).join(''),
    [f1Count, data.details.table1112f1],
  );

  /** 自動で付く様式の枚数（0枚なら提出しない） */
  const autoPages: Record<string, number> = {
    table1cont: contPages, table15cont: t15ContPages, table1112f1c: f1ContPages,
  };

  /** その様式を提出する（＝印刷する）か */
  const used = (form: FormMeta): boolean => {
    if (form.required) return true;
    if (form.auto) return (autoPages[form.id] ?? 0) > 0;
    return data.used.includes(form.id);
  };

  const pages: Record<string, ReactNode> = {
    table1: (
      <div className="gov-page">
        <GridForm
          cells={table1Cells}
          g={g}
          u={u}
          formCode={TABLE1_FORM_CODE}
          title={TABLE1_TITLE}
          formId="t1"
          footer={<Footnote notes={TABLE1_NOTES} />}
        />
        <div className="app-linkctl no-print">
          <label>
            提出先税務署の都道府県
            <select
              value={officePref}
              onChange={(e) => u(`${COMMON}officePref`, e.target.value)}
              aria-label="提出先税務署を絞り込む都道府県"
            >
              <option value="">全国</option>
              {TAX_OFFICE_PREFS.map((pref) => <option key={pref} value={pref}>{pref}</option>)}
            </select>
          </label>
          <span>で税務署の候補を絞ります（この選択は印刷されません）。</span>
        </div>
      </div>
    ),
    table1cont: Array.from({ length: contPages }, (_, page) => (
      <ContPage
        key={page}
        page={page}
        g={g}
        u={u}
        transferred={transferred}
        transferredSpouse={transferredSpouse}
        spouse={spouse}
      />
    )),
    table2: (
      <div className="gov-page">
        <GridForm
          cells={table2Cells}
          g={g}
          u={u}
          formCode={TABLE2_FORM_CODE}
          title={TABLE2_TITLE}
          subtitle={TABLE2_SUBTITLE}
          aspectRatio="1065 / 1311.5"
          formId="t2"
          footer={
            <>
              <div className="gov-note">{TABLE2_NOTES}</div>
              <Footnote notes={TABLE2_JOINT_NOTES} edition={TABLE2_EDITION} />
            </>
          }
        />
      </div>
    ),
    table4: (
      <>
        {Array.from({ length: t4Pages }, (_, page) => (
          <Table4Page key={page} page={page} whoOptions={whoOptions} g={g} u={u} />
        ))}
        <div className="app-pagectl no-print">
          <button type="button" className="app-btn" onClick={() => u('t4Pages', String(t4Pages - 1))} disabled={t4Pages <= 1}>−</button>
          {t4Pages}枚（加算の対象となる人{TABLE4_PERSONS}人／枚）
          <button type="button" className="app-btn" onClick={() => u('t4Pages', String(t4Pages + 1))} disabled={t4Pages >= MAX_TABLE4_PAGES}>＋</button>
        </div>
      </>
    ),
    table42: (
      <>
        {Array.from({ length: t42Pages }, (_, page) => (
          <Table42Page key={page} page={page} whoOptions={whoOptions} g={g} u={u} />
        ))}
        <div className="app-pagectl no-print">
          <button type="button" className="app-btn" onClick={() => u('t42Pages', String(t42Pages - 1))} disabled={t42Pages <= 1}>−</button>
          {t42Pages}枚（控除を受ける人{TABLE42_PERSONS}人／枚）
          <button type="button" className="app-btn" onClick={() => u('t42Pages', String(t42Pages + 1))} disabled={t42Pages >= MAX_TABLE42_PAGES}>＋</button>
        </div>
      </>
    ),
    table5: (
      <div className="gov-page">
        <GridForm
          cells={table5Cells}
          g={g}
          u={u}
          formCode={TABLE5_FORM_CODE}
          title={TABLE5_TITLE}
          subtitle={TABLE5_SUBTITLE}
          aspectRatio={TABLE5_ASPECT}
          formId="t5"
          footer={<Footnote notes={TABLE5_NOTES} edition={TABLE5_EDITION} />}
        />
      </div>
    ),
    table6: (
      <div className="gov-page">
        <GridForm
          cells={table6Cells}
          g={g}
          u={u}
          formCode={TABLE6_FORM_CODE}
          title={TABLE6_TITLE}
          subtitle={TABLE6_SUBTITLE}
          aspectRatio={TABLE6_ASPECT}
          formId="t6"
          footer={<Footnote notes={TABLE6_NOTES} edition={TABLE6_EDITION} />}
        />
      </div>
    ),
    table7: (
      <div className="gov-page">
        <GridForm
          cells={table7Cells}
          g={g}
          u={u}
          formCode={TABLE7_FORM_CODE}
          title={TABLE7_TITLE}
          subtitle={TABLE7_SUBTITLE}
          aspectRatio={TABLE7_ASPECT}
          formId="t7"
          footer={<Footnote notes={TABLE7_NOTES} edition={TABLE7_EDITION} />}
        />
      </div>
    ),
    table88: (
      <>
        {Array.from({ length: t88Pages }, (_, page) => (
          <Table88Page
            key={page}
            page={page}
            whoOptions={whoOptions}
            autoCredit={data.used.includes('table6')}
            autoSuccessive={data.used.includes('table7')}
            g={g}
            u={u}
          />
        ))}
        <div className="app-pagectl no-print">
          <button type="button" className="app-btn" onClick={() => u('t88Pages', String(t88Pages - 1))} disabled={t88Pages <= 1}>−</button>
          {t88Pages}枚（1・2とも{TABLE88_PERSONS}人／枚）
          <button type="button" className="app-btn" onClick={() => u('t88Pages', String(t88Pages + 1))} disabled={t88Pages >= MAX_TABLE88_PAGES}>＋</button>
        </div>
      </>
    ),
    table9: (
      <>
        {Array.from({ length: t9Pages }, (_, page) => (
          <Table9Page key={page} page={page} last={page === t9Pages - 1} whoOptions={whoOptions} g={g} u={u} />
        ))}
        <div className="app-pagectl no-print">
          <button type="button" className="app-btn" onClick={() => u('t9Pages', String(t9Pages - 1))} disabled={t9Pages <= 1}>−</button>
          {t9Pages}枚（保険金{TABLE9_ROWS}件・相続人{TABLE9_ROWS}人／枚）
          <button type="button" className="app-btn" onClick={() => u('t9Pages', String(t9Pages + 1))} disabled={t9Pages >= MAX_TABLE9_PAGES}>＋</button>
        </div>
      </>
    ),
    table10: (
      <>
        {Array.from({ length: t10Pages }, (_, page) => (
          <Table10Page key={page} page={page} last={page === t10Pages - 1} whoOptions={whoOptions} g={g} u={u} />
        ))}
        <div className="app-pagectl no-print">
          <button type="button" className="app-btn" onClick={() => u('t10Pages', String(t10Pages - 1))} disabled={t10Pages <= 1}>−</button>
          {t10Pages}枚（退職手当金{TABLE10_ROWS}件・相続人{TABLE10_ROWS}人／枚）
          <button type="button" className="app-btn" onClick={() => u('t10Pages', String(t10Pages + 1))} disabled={t10Pages >= MAX_TABLE10_PAGES}>＋</button>
        </div>
      </>
    ),
    table11: Array.from({ length: table11Pages }, (_, page) => (
      <Table11Page key={page} page={page} g={g} u={u} detail={detailUsed} />
    )),
    // 第11の2表は贈与を受けた人ごとに1枚以上。記入が1つも無い人の分は印刷しない。
    table112: data.heirs.map((heir, i) => {
      const sheets = table112Pages(heir);
      const setSheets = (n: number) => u(`${heirPrefix(i)}t112Pages`, String(n));
      return (
        <div key={i} className={hasTable112(heir) ? undefined : 'no-print'}>
          {Array.from({ length: sheets }, (_, page) => (
            <Table112Page key={page} heir={i} page={page} last={page === sheets - 1} g={g} u={u} />
          ))}
          <div className="app-pagectl no-print">
            <button type="button" className="app-btn" onClick={() => setSheets(sheets - 1)} disabled={sheets <= 1}>−</button>
            {heirLabel(i)} {sheets}枚（年分{TABLE112_ROWS}行／枚）
            <button type="button" className="app-btn" onClick={() => setSheets(sheets + 1)} disabled={sheets >= MAX_TABLE112_PAGES}>＋</button>
          </div>
        </div>
      );
    }),
    table1112f1: (
      <>
        <Table1112f1Page
          sheet={0}
          rows={TABLE1112F1_ROWS}
          linkedMask={f1LinkedMask.slice(0, TABLE1112F1_ROWS)}
          whoOptions={whoOptions}
          g={g}
          u={u}
        />
        <div className="app-pagectl no-print">
          <button
            type="button"
            className="app-btn"
            onClick={() => setDetailCount('table1112f1', f1Count - 1)}
            disabled={f1Count <= TABLE1112F1_ROWS}
          >
            −
          </button>
          小規模宅地等の明細 {f1Count}件（本表{TABLE1112F1_ROWS}件・（続）{TABLE1112F1_CONT_ROWS}件／枚）
          <button type="button" className="app-btn" onClick={() => setDetailCount('table1112f1', f1Count + 1)}>＋</button>
        </div>
        {/* 明細と別表1の対応づけ。選ぶと③④が別表1から転記されて読み取り専用になる */}
        <div className="app-linkctl no-print">
          {Array.from({ length: f1Count }, (_, i) => (
            <label key={i}>
              {detailLabel(i)}の別表1
              <select
                value={data.details.table1112f1?.[i]?.link ?? ''}
                onChange={(event) => u(`${detailPrefix('table1112f1', i)}link`, event.target.value)}
                aria-label={`${detailLabel(i)}に対応する別表1`}
              >
                <option value="">使わない（③④は手入力）</option>
                {f1LinkOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </>
    ),
    table1112f1c: Array.from({ length: f1ContPages }, (_, page) => {
      const first = table1112f1First(page + 1);
      return (
        <Table1112f1Page
          key={page}
          sheet={page + 1}
          rows={TABLE1112F1_CONT_ROWS}
          linkedMask={f1LinkedMask.slice(first, first + TABLE1112F1_CONT_ROWS).padEnd(TABLE1112F1_CONT_ROWS, '0')}
          whoOptions={whoOptions}
          g={g}
          u={u}
        />
      );
    }),
    table1112f1b: (
      <>
        {Array.from({ length: f1bCount }, (_, sheet) => (
          <Table1112f1bPage key={sheet} sheet={sheet} whoOptions={whoOptions} g={g} u={u} />
        ))}
        <div className="app-pagectl no-print">
          <button
            type="button"
            className="app-btn"
            onClick={() => setDetailCount('table1112f1b', f1bCount - 1)}
            disabled={f1bCount <= 1}
          >
            −
          </button>
          一の宅地等 {f1bCount}件（1件＝1枚・取得者{TABLE1112F1B_OWNERS}人／枚）
          <button type="button" className="app-btn" onClick={() => setDetailCount('table1112f1b', f1bCount + 1)}>＋</button>
        </div>
      </>
    ),
    table13: (
      <>
        {Array.from({ length: t13Pages }, (_, page) => (
          <Table13Page key={page} page={page} last={page === t13Pages - 1} whoOptions={whoOptions} g={g} u={u} />
        ))}
        <div className="app-pagectl no-print">
          <button
            type="button"
            className="app-btn"
            onClick={() => u('t13Pages', String(t13Pages - 1))}
            disabled={t13Pages <= Math.max(1, Math.ceil(data.heirs.length / TABLE13_PERSONS))}
          >
            −
          </button>
          明細 {t13Pages}枚（債務{TABLE13_DEBT_ROWS}件・葬式費用{TABLE13_FUNERAL_ROWS}件／枚）
          <button type="button" className="app-btn" onClick={() => u('t13Pages', String(t13Pages + 1))} disabled={t13Pages >= MAX_TABLE13_PAGES}>＋</button>
        </div>
      </>
    ),
    table14: (
      <>
        {Array.from({ length: t14Pages }, (_, page) => (
          <Table14Page key={page} page={page} last={page === t14Pages - 1} whoOptions={whoOptions} g={g} u={u} />
        ))}
        <div className="app-pagectl no-print">
          <button type="button" className="app-btn" onClick={() => u('t14Pages', String(t14Pages - 1))} disabled={t14Pages <= 1}>−</button>
          明細 {t14Pages}枚（1の贈与{TABLE14_GIFT_ROWS}件・2の遺贈{TABLE14_BEQUEST_ROWS}件・3の寄附{TABLE14_DONATION_ROWS}件／枚）
          <button type="button" className="app-btn" onClick={() => u('t14Pages', String(t14Pages + 1))} disabled={t14Pages >= MAX_TABLE14_PAGES}>＋</button>
        </div>
      </>
    ),
    table15: (
      <div className="gov-page">
        <GridForm
          cells={table15Cells}
          g={g}
          u={u}
          formCode={TABLE15_FORM_CODE}
          title={TABLE15_TITLE}
          subtitle={TABLE15_SUBTITLE}
          aspectRatio={TABLE15_ASPECT}
          formId="t15"
          footer={<Footnote notes="" edition={TABLE15_EDITION} />}
        />
      </div>
    ),
    table15cont: Array.from({ length: t15ContPages }, (_, page) => (
      <Table15ContPage key={page} page={page} g={g} u={u} t15Transferred={t15Transferred} />
    )),
    ...Object.fromEntries(DETAIL_FORMS.map((id) => [id, (
      <>
        {Array.from({ length: detailPages(id) }, (_, page) => (
          <DetailPage key={page} form={id} page={page} g={g} u={u} />
        ))}
        <div className="app-pagectl no-print">
          <button type="button" className="app-btn" onClick={() => removeDetailPage(id, DETAIL_GROUPS)} disabled={detailPages(id) <= 1}>−</button>
          明細 {detailPages(id)}枚（財産{DETAIL_GROUPS}件／枚）
          <button type="button" className="app-btn" onClick={() => addDetailPage(id, DETAIL_GROUPS)}>＋</button>
        </div>
      </>
    )])),
  };

  const onPickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!await importJson(file)) window.alert('このファイルは読み込めませんでした。');
  };

  const onReset = () => {
    if (window.confirm('入力内容をすべて消去します。よろしいですか？')) reset();
  };

  return (
    <div className="app-shell">
      <header className="app-topbar no-print">
        <div className="app-title">
          相続税の申告書
          <small>入力内容はこのブラウザに自動保存されます</small>
        </div>
        <div className="app-toolbar">
          <span className="app-count">
            財産を取得した人
            <button type="button" className="app-btn" onClick={removeHeir} disabled={data.heirs.length <= 1} aria-label="財産を取得した人を1人減らす">−</button>
            {data.heirs.length}人
            <button type="button" className="app-btn" onClick={addHeir} disabled={data.heirs.length >= maxHeirs} aria-label="財産を取得した人を1人増やす">＋</button>
          </span>
          <button type="button" className="app-btn" onClick={exportJson}>JSON保存</button>
          <button type="button" className="app-btn" onClick={() => fileRef.current?.click()}>JSON読込</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onPickFile} hidden aria-label="JSONファイルを選択" />
          <button type="button" className="app-btn app-btn--primary" onClick={() => window.print()}>印刷</button>
          <button type="button" className="app-btn app-btn--danger" onClick={onReset}>クリア</button>
        </div>
      </header>

      <div className="mobile-hint no-print">A4横幅の様式です。横スクロールしてご覧ください。</div>

      <div className="app-body">
        <aside className={`app-sidebar no-print${sidebarOpen ? '' : ' app-sidebar--closed'}`}>
          <div className="app-sidebar__head">
            <span className="app-sidebar__title">様式</span>
            <button
              type="button"
              className="app-sidebar__toggle"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? '様式一覧を閉じる' : '様式一覧を開く'}
              title={sidebarOpen ? '様式一覧を閉じる' : '様式一覧を開く'}
            >
              {sidebarOpen ? '«' : '»'}
            </button>
          </div>
          <ul className="form-list">
            {FORMS.map((form) => (
              <li key={form.id} className={`form-item${active === form.id ? ' form-item--active' : ''}`}>
                <input
                  type="checkbox"
                  className="form-item__check"
                  checked={used(form)}
                  disabled={form.required || form.auto}
                  onChange={() => toggleUsed(form.id)}
                  aria-label={`${form.label}を使用する`}
                />
                <button type="button" className="form-item__btn" onClick={() => setActive(form.id)}>
                  <span className="form-item__label">{form.label}</span>
                  <small>{form.note}</small>
                </button>
              </li>
            ))}
          </ul>
          <p className="form-list__hint">チェックした様式だけを印刷します。第1表（続）・第15表（続）は財産を取得した人が2人以上のときに自動で付きます。</p>
        </aside>

        <main className="app-main">
          {FORMS.map((form) => (
            <section
              key={form.id}
              className={[
                'form-pages',
                active === form.id ? '' : 'form-pages--hidden',
                used(form) ? '' : 'form-pages--unused',
              ].filter(Boolean).join(' ')}
            >
              {pages[form.id]}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
