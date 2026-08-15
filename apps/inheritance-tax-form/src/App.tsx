import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { GridForm, type GridCell } from './components/ui/GridForm';
import {
  COMMON, EDITION, TABLE1_FORM_CODE, TABLE1_NOTES, TABLE1_TITLE, TOTALS, buildTable1, taxOfficeOptions,
} from './forms/table1';
import {
  TABLE1CONT_CONFIRM_BOXES, TABLE1CONT_FORM_CODE, TABLE1CONT_NOTES, TABLE1CONT_TITLE, buildTable1Cont,
} from './forms/table1cont';
import {
  TABLE2_EDITION, TABLE2_FORM_CODE, TABLE2_JOINT_NOTES, TABLE2_NOTES, TABLE2_SUBTITLE, TABLE2_TITLE,
  buildTable2, lawPrefix,
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
import { usePrinting } from './hooks/usePrinting';
import { useZipPrefecture } from './hooks/useZipPrefecture';
import {
  hasTable112, table10Pages, table112Pages, table13Pages, table14Pages, table15Transferred,
  table42Pages, table4Pages, table88Pages, table9Pages,
} from './lib/calc';

/** 第1表の転記欄。様式の選択状態にかかわらず直接入力させず、クリックで転記元を開く。 */
const TABLE1_SOURCE_FOR_ROW: Readonly<Record<string, string>> = {
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
const TABLE1_TRANSFERRED_ROWS = Object.keys(TABLE1_SOURCE_FOR_ROW);

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
  { id: 'table11f1', label: '第11表の付表1', note: '財産の明細書（土地・家屋等用）' },
  { id: 'table11f2', label: '第11表の付表2', note: '財産の明細書（有価証券用）' },
  { id: 'table11f3', label: '第11表の付表3', note: '財産の明細書（現金・預貯金等用）' },
  { id: 'table11f4', label: '第11表の付表4', note: '財産の明細書（事業用・家庭用・その他）' },
  { id: 'table112', label: '第11の2表', note: '相続時精算課税適用財産の明細書' },
  { id: 'table1112f1', label: '第11・11の2表の付表1', note: '小規模宅地等についての課税価格の計算明細書' },
  { id: 'table1112f1c', label: '第11・11の2表の付表1（続）', note: '小規模宅地等の明細 4件目以降', auto: true },
  { id: 'table1112f1b', label: '第11・11の2表の付表1（別表１）', note: TABLE1112F1B_SUBTITLE },
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
  const rows = notes.split('\n').map((line) => line.match(/^(?:（注）)?[\u3000 ]*(\d+)[\u3000 ]+(.*)$/));
  const numbered = rows.every((row) => row !== null);
  const symbolNote = notes.match(/^([※＊])[\u3000 ]*(.*)$/s);
  return (
    <div className="gov-footnote">
      <span className="gov-footnote__notes">
        {numbered ? rows.map((row, index) => (
          <span className="gov-footnote__note-row" key={`${row![1]}-${index}`}>
            <span className="gov-footnote__note-prefix">{index === 0 ? '（注）' : ''}</span>
            <span className="gov-footnote__note-number">{row![1]}</span>
            <span className="gov-footnote__note-body">{row![2]}</span>
          </span>
        )) : symbolNote ? (
          <span className="gov-footnote__symbol-row">
            <span className="gov-footnote__symbol">{symbolNote[1]}</span>
            <span className="gov-footnote__note-body">{symbolNote[2]}</span>
          </span>
        ) : notes}
      </span>
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
  /** 転記欄（被相続人の氏名など）のクリックで入力元の様式へ移る */
  onNavigate: (formId: string) => void;
}

/** 第1表（続）1枚（財産を取得した人2人分） */
function ContPage({ page, g, u, onNavigate }: PageProps) {
  const a = 1 + page * 2;
  const b = a + 1;
  const cells = useMemo(() => {
    return buildTable1Cont(
      heirPrefix(a), heirLabel(a), heirPrefix(b), heirLabel(b),
      TABLE1_TRANSFERRED_ROWS, TABLE1_TRANSFERRED_ROWS, TABLE1_SOURCE_FOR_ROW,
    );
  }, [a, b]);
  return (
    <div className="gov-page">
      <GridForm
        cells={cells}
        g={g}
        u={u}
        formCode={TABLE1CONT_FORM_CODE}
        title={[TABLE1CONT_TITLE, `${heirLabel(a)}・${heirLabel(b)}`].join('　')}
        formId={`t1c${page}`}
        onNavigate={onNavigate}
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
function Table11Page({ page, g, u, detail, onNavigate }: Table11PageProps) {
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
        onNavigate={onNavigate}
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
function Table112Page({ heir, page, last, g, u, onNavigate }: Table112PageProps) {
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
        onNavigate={onNavigate}
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
function Table4Page({ page, whoOptions, g, u, onNavigate }: Table4PageProps) {
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
        onNavigate={onNavigate}
        footer={<Footnote notes={TABLE4_NOTES} edition={TABLE4_EDITION} />}
      />
    </div>
  );
}

/** 第4表の2 1枚（控除を受ける人3人分） */
function Table42Page({ page, whoOptions, g, u, onNavigate }: Table4PageProps) {
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
        onNavigate={onNavigate}
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
function Table9Page({ page, last, whoOptions, g, u, onNavigate }: Table9PageProps) {
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
        onNavigate={onNavigate}
        footer={<Footnote notes="" edition={TABLE9_EDITION} />}
      />
    </div>
  );
}

/** 第10表1枚（退職手当金などの明細5件・相続人5人分）。構成は第9表と同じ */
function Table10Page({ page, last, whoOptions, g, u, onNavigate }: Table9PageProps) {
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
        onNavigate={onNavigate}
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
function Table13Page({ page, last, whoOptions, g, u, onNavigate }: Table13PageProps) {
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
        onNavigate={onNavigate}
        footer={<Footnote notes="" edition={TABLE13_EDITION} />}
      />
    </div>
  );
}

/** 第14表1枚（1の明細4件・④4人分・2と3の明細2件ずつ） */
function Table14Page({ page, last, whoOptions, g, u, onNavigate }: Table13PageProps) {
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
        onNavigate={onNavigate}
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
function Table88Page({ page, whoOptions, autoCredit, autoSuccessive, g, u, onNavigate }: Table88PageProps) {
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
        onNavigate={onNavigate}
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
function Table15ContPage({ page, g, u, t15Transferred, onNavigate }: Table15ContPageProps) {
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
        onNavigate={onNavigate}
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
  /** 転記欄（被相続人の氏名など）のクリックで入力元の様式へ移る */
  onNavigate: (formId: string) => void;
}

/** 第11・11の2表の付表1／（続）1枚 */
function Table1112f1Page({ sheet, rows, linkedMask, whoOptions, g, u, onNavigate }: Table1112f1PageProps) {
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
        onNavigate={onNavigate}
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
  /** 転記欄（被相続人の氏名など）のクリックで入力元の様式へ移る */
  onNavigate: (formId: string) => void;
}

/** 第11・11の2表の付表1（別表1）1枚（一の宅地等1件・取得者2人分） */
function Table1112f1bPage({ sheet, whoOptions, g, u, onNavigate }: Table1112f1bPageProps) {
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
        onNavigate={onNavigate}
        footer={<Footnote notes="" edition={TABLE1112F1_EDITION} />}
      />
    </div>
  );
}

interface DetailPageProps extends PageProps {
  form: keyof typeof DETAIL_SPECS;
}

/** 付表（財産の明細書）1枚（財産8件分） */
function DetailPage({ form, page, g, u, onNavigate }: DetailPageProps) {
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
        onNavigate={onNavigate}
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
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) return saved !== 'closed';
    return !window.matchMedia('(max-width: 800px)').matches;
  } catch {
    return true;
  }
}

type PageControlProps = {
  page: number;
  total: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  detail?: ReactNode;
};

/** 画面上だけに表示するページ増減操作。各用紙の左上に置く。 */
function PageControl({
  page, total, onDecrease, onIncrease, decreaseDisabled, increaseDisabled, detail,
}: PageControlProps) {
  return (
    <div className="app-pagectl no-print">
      <span>ページ</span>
      <button type="button" className="app-btn" onClick={onDecrease} disabled={decreaseDisabled} aria-label="ページを減らす">−</button>
      <button type="button" className="app-btn" onClick={onIncrease} disabled={increaseDisabled} aria-label="ページを増やす">＋</button>
      <span>{page}/{total}ページ</span>
      {detail && <span className="app-pagectl__detail">{detail}</span>}
    </div>
  );
}

export default function App() {
  const {
    data, g, u, addHeir, removeHeir, addDetailPage, removeDetailPage, setDetailCount,
    toggleUsed, reset, exportJson, importJson, maxHeirs,
  } = useFormData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState('table1');
  const [sidebarOpen, setSidebarOpen] = useState(loadSidebarOpen);
  const { printing, print } = usePrinting();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? 'open' : 'closed');
    } catch {
      // privacy モード等では保存を諦める（開閉自体は続けられる）
    }
  }, [sidebarOpen]);

  // 提出先税務署の候補は被相続人の郵便番号（＝住所地）の都道府県で絞る。
  // 郵便番号が未入力・該当なしのときは全国の署を出す。
  const officePref = useZipPrefecture((data.common['zip_1'] ?? '') + (data.common['zip_2'] ?? ''));
  const officeOptions = useMemo(
    () => taxOfficeOptions(officePref, data.common.office ?? ''),
    [officePref, data.common.office],
  );
  const table1Cells = useMemo(
    () => buildTable1(heirPrefix(0), TABLE1_TRANSFERRED_ROWS, officeOptions, TABLE1_SOURCE_FOR_ROW),
    [officeOptions],
  );
  /** 第2表④で選べる第1表の人物。同じ人物は複数行で選べないよう、他行の選択肢から外す。 */
  const table2HeirOptions = useMemo(
    (): GridCell['options'][] => data.lawful.map((row, rowIndex) => {
      const selectedElsewhere = new Set(data.lawful.flatMap((candidate, index) => (
        index !== rowIndex && candidate.source !== undefined && candidate.source !== ''
          ? [candidate.source]
          : []
      )));
      const legacy = (row.source === undefined || row.source === '') && (row.name ?? '').trim() !== ''
        ? [{ value: 'manual', label: `${row.name}（旧入力）` }]
        : [];
      return [
        { value: '', label: '' },
        ...legacy,
        ...data.heirs.flatMap((heir, index) => {
          const value = String(index);
          if (selectedElsewhere.has(value)) return [];
          const name = (heir.name ?? '').trim();
          return [{ value, label: name === '' ? `${index + 1}人目（氏名未入力）` : name }];
        }),
      ];
    }),
    [data.heirs, data.lawful],
  );
  const table2Cells = useMemo(
    () => buildTable2(COMMON, TOTALS, table2HeirOptions),
    [table2HeirOptions],
  );
  /**
   * 放棄の有無を聞く相手（＝第2表④で第1表の人と結び付いている法定相続人）。
   * 第2表④は「放棄がなかったものとした場合」の一覧なので、様式そのものには放棄が出てこない。
   * 第9表・第10表2の非課税は「相続人（放棄した人を除く）の取得した」ものだけが対象なので、
   * 画面だけの入力として持つ。
   */
  const renounceRows = useMemo(
    () => data.lawful.flatMap((row, index) => {
      const source = row.source ?? '';
      if (!/^\d+$/.test(source)) return []; // 'manual'（旧入力）は第1表の人と結び付いていない
      const name = (data.heirs[Number(source)]?.name ?? '').trim();
      return [{ index, name: name === '' ? `${Number(source) + 1}人目（氏名未入力）` : name }];
    }),
    [data.heirs, data.lawful],
  );
  const table5Cells = useMemo(() => buildTable5(COMMON, TOTALS), []);
  const contPages = Math.ceil(Math.max(0, data.heirs.length - 1) / 2);
  const heirPages = 1 + contPages;
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
      <>
        <PageControl
          page={1}
          total={heirPages}
          onDecrease={removeHeir}
          onIncrease={addHeir}
          decreaseDisabled={data.heirs.length <= 1}
          increaseDisabled={data.heirs.length >= maxHeirs}
          detail={`財産を取得した人 ${data.heirs.length}人`}
        />
        <div className="gov-page">
          <GridForm
            cells={table1Cells}
            g={g}
            u={u}
            formCode={TABLE1_FORM_CODE}
            title={TABLE1_TITLE}
            formId="t1"
            onNavigate={setActive}
            footer={<Footnote notes={TABLE1_NOTES} />}
          />
        </div>
      </>
    ),
    table1cont: Array.from({ length: contPages }, (_, page) => (
      <div key={page} className="app-page-with-control">
        <PageControl
          page={page + 2}
          total={heirPages}
          onDecrease={removeHeir}
          onIncrease={addHeir}
          decreaseDisabled={data.heirs.length <= 1}
          increaseDisabled={data.heirs.length >= maxHeirs}
          detail={`財産を取得した人 ${data.heirs.length}人`}
        />
        <ContPage page={page} g={g} u={u} onNavigate={setActive} />
      </div>
    )),
    table2: (
      <>
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
          onNavigate={setActive}
          footer={
            <>
              <div className="gov-note">{TABLE2_NOTES}</div>
              <Footnote notes={TABLE2_JOINT_NOTES} edition={TABLE2_EDITION} />
            </>
          }
        />
      </div>
      {/* 相続の放棄。様式には印刷せず、第9表・第10表2の非課税の判定にだけ使う */}
      {renounceRows.length > 0 && (
        <div className="app-linkctl no-print">
          <span>相続の放棄をした人（第9表・第10表2の非課税の判定に使う。様式には印刷しない）</span>
          {renounceRows.map(({ index, name }) => (
            <label key={index}>
              <input
                type="checkbox"
                checked={g(`${lawPrefix(index)}renounced`) === '1'}
                onChange={(event) => u(`${lawPrefix(index)}renounced`, event.target.checked ? '1' : '')}
                aria-label={`${name}は相続を放棄した`}
              />
              {name}
            </label>
          ))}
        </div>
      )}
      </>
    ),
    table4: (
      <>
        {Array.from({ length: t4Pages }, (_, page) => (
          <div key={page} className="app-page-with-control">
            <PageControl page={page + 1} total={t4Pages} onDecrease={() => u('t4Pages', String(t4Pages - 1))} onIncrease={() => u('t4Pages', String(t4Pages + 1))} decreaseDisabled={t4Pages <= 1} increaseDisabled={t4Pages >= MAX_TABLE4_PAGES} detail={`加算の対象となる人${TABLE4_PERSONS}人／ページ`} />
            <Table4Page page={page} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />
          </div>
        ))}
      </>
    ),
    table42: (
      <>
        {Array.from({ length: t42Pages }, (_, page) => (
          <div key={page} className="app-page-with-control">
            <PageControl page={page + 1} total={t42Pages} onDecrease={() => u('t42Pages', String(t42Pages - 1))} onIncrease={() => u('t42Pages', String(t42Pages + 1))} decreaseDisabled={t42Pages <= 1} increaseDisabled={t42Pages >= MAX_TABLE42_PAGES} detail={`控除を受ける人${TABLE42_PERSONS}人／ページ`} />
            <Table42Page page={page} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />
          </div>
        ))}
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
          onNavigate={setActive}
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
          onNavigate={setActive}
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
          onNavigate={setActive}
          footer={<Footnote notes={TABLE7_NOTES} edition={TABLE7_EDITION} />}
        />
      </div>
    ),
    table88: (
      <>
        {Array.from({ length: t88Pages }, (_, page) => (
          <div key={page} className="app-page-with-control">
            <PageControl page={page + 1} total={t88Pages} onDecrease={() => u('t88Pages', String(t88Pages - 1))} onIncrease={() => u('t88Pages', String(t88Pages + 1))} decreaseDisabled={t88Pages <= 1} increaseDisabled={t88Pages >= MAX_TABLE88_PAGES} detail={`1・2とも${TABLE88_PERSONS}人／ページ`} />
            <Table88Page
              page={page}
              whoOptions={whoOptions}
              autoCredit={data.used.includes('table6')}
              autoSuccessive={data.used.includes('table7')}
              g={g}
              u={u}
              onNavigate={setActive}
            />
          </div>
        ))}
      </>
    ),
    table9: (
      <>
        {Array.from({ length: t9Pages }, (_, page) => (
          <div key={page} className="app-page-with-control">
            <PageControl page={page + 1} total={t9Pages} onDecrease={() => u('t9Pages', String(t9Pages - 1))} onIncrease={() => u('t9Pages', String(t9Pages + 1))} decreaseDisabled={t9Pages <= 1} increaseDisabled={t9Pages >= MAX_TABLE9_PAGES} detail={`保険金${TABLE9_ROWS}件・相続人${TABLE9_ROWS}人／ページ`} />
            <Table9Page page={page} last={page === t9Pages - 1} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />
          </div>
        ))}
      </>
    ),
    table10: (
      <>
        {Array.from({ length: t10Pages }, (_, page) => (
          <div key={page} className="app-page-with-control">
            <PageControl page={page + 1} total={t10Pages} onDecrease={() => u('t10Pages', String(t10Pages - 1))} onIncrease={() => u('t10Pages', String(t10Pages + 1))} decreaseDisabled={t10Pages <= 1} increaseDisabled={t10Pages >= MAX_TABLE10_PAGES} detail={`退職手当金${TABLE10_ROWS}件・相続人${TABLE10_ROWS}人／ページ`} />
            <Table10Page page={page} last={page === t10Pages - 1} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />
          </div>
        ))}
      </>
    ),
    table11: Array.from({ length: table11Pages }, (_, page) => (
      <Table11Page key={page} page={page} g={g} u={u} detail={detailUsed} onNavigate={setActive} />
    )),
    // 第11の2表は贈与を受けた人ごとに1枚以上。記入が1つも無い人の分は印刷しない。
    table112: data.heirs.map((heir, i) => {
      const sheets = table112Pages(heir);
      const setSheets = (n: number) => u(`${heirPrefix(i)}t112Pages`, String(n));
      return (
        <div key={i} className={hasTable112(heir) ? undefined : 'no-print'}>
          {Array.from({ length: sheets }, (_, page) => (
            <div key={page} className="app-page-with-control">
              <PageControl page={page + 1} total={sheets} onDecrease={() => setSheets(sheets - 1)} onIncrease={() => setSheets(sheets + 1)} decreaseDisabled={sheets <= 1} increaseDisabled={sheets >= MAX_TABLE112_PAGES} detail={`${heirLabel(i)}・年分${TABLE112_ROWS}行／ページ`} />
              <Table112Page heir={i} page={page} last={page === sheets - 1} g={g} u={u} onNavigate={setActive} />
            </div>
          ))}
        </div>
      );
    }),
    table1112f1: (
      <>
        <PageControl
          page={1}
          total={1 + f1ContPages}
          onDecrease={() => setDetailCount('table1112f1', f1Count - 1)}
          onIncrease={() => setDetailCount('table1112f1', f1Count + 1)}
          decreaseDisabled={f1Count <= TABLE1112F1_ROWS}
          detail={`小規模宅地等の明細 ${f1Count}件`}
        />
        <Table1112f1Page
          sheet={0}
          rows={TABLE1112F1_ROWS}
          linkedMask={f1LinkedMask.slice(0, TABLE1112F1_ROWS)}
          whoOptions={whoOptions}
          g={g}
          u={u}
          onNavigate={setActive}
        />
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
        <div key={page} className="app-page-with-control">
          <PageControl
            page={page + 2}
            total={1 + f1ContPages}
            onDecrease={() => setDetailCount('table1112f1', f1Count - 1)}
            onIncrease={() => setDetailCount('table1112f1', f1Count + 1)}
            decreaseDisabled={f1Count <= TABLE1112F1_ROWS}
            detail={`小規模宅地等の明細 ${f1Count}件`}
          />
          <Table1112f1Page
            sheet={page + 1}
            rows={TABLE1112F1_CONT_ROWS}
            linkedMask={f1LinkedMask.slice(first, first + TABLE1112F1_CONT_ROWS).padEnd(TABLE1112F1_CONT_ROWS, '0')}
            whoOptions={whoOptions}
            g={g}
            u={u}
            onNavigate={setActive}
          />
        </div>
      );
    }),
    table1112f1b: (
      <>
        {Array.from({ length: f1bCount }, (_, sheet) => (
          <div key={sheet} className="app-page-with-control">
            <PageControl page={sheet + 1} total={f1bCount} onDecrease={() => setDetailCount('table1112f1b', f1bCount - 1)} onIncrease={() => setDetailCount('table1112f1b', f1bCount + 1)} decreaseDisabled={f1bCount <= 1} detail={`一の宅地等 ${f1bCount}件`} />
            <Table1112f1bPage sheet={sheet} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />
          </div>
        ))}
      </>
    ),
    table13: (
      <>
        {Array.from({ length: t13Pages }, (_, page) => (
          <div key={page} className="app-page-with-control">
            <PageControl page={page + 1} total={t13Pages} onDecrease={() => u('t13Pages', String(t13Pages - 1))} onIncrease={() => u('t13Pages', String(t13Pages + 1))} decreaseDisabled={t13Pages <= Math.max(1, Math.ceil(data.heirs.length / TABLE13_PERSONS))} increaseDisabled={t13Pages >= MAX_TABLE13_PAGES} detail={`債務${TABLE13_DEBT_ROWS}件・葬式費用${TABLE13_FUNERAL_ROWS}件／ページ`} />
            <Table13Page page={page} last={page === t13Pages - 1} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />
          </div>
        ))}
      </>
    ),
    table14: (
      <>
        {Array.from({ length: t14Pages }, (_, page) => (
          <div key={page} className="app-page-with-control">
            <PageControl page={page + 1} total={t14Pages} onDecrease={() => u('t14Pages', String(t14Pages - 1))} onIncrease={() => u('t14Pages', String(t14Pages + 1))} decreaseDisabled={t14Pages <= 1} increaseDisabled={t14Pages >= MAX_TABLE14_PAGES} detail={`贈与${TABLE14_GIFT_ROWS}件・遺贈${TABLE14_BEQUEST_ROWS}件・寄附${TABLE14_DONATION_ROWS}件／ページ`} />
            <Table14Page page={page} last={page === t14Pages - 1} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />
          </div>
        ))}
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
      <Table15ContPage key={page} page={page} g={g} u={u} t15Transferred={t15Transferred} onNavigate={setActive} />
    )),
    ...Object.fromEntries(DETAIL_FORMS.map((id) => [id, (
      <>
        {Array.from({ length: detailPages(id) }, (_, page) => (
          <div key={page} className="app-page-with-control">
            <PageControl page={page + 1} total={detailPages(id)} onDecrease={() => removeDetailPage(id, DETAIL_GROUPS)} onIncrease={() => addDetailPage(id, DETAIL_GROUPS)} decreaseDisabled={detailPages(id) <= 1} detail={`財産${DETAIL_GROUPS}件／ページ`} />
            <DetailPage form={id} page={page} g={g} u={u} onNavigate={setActive} />
          </div>
        ))}
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
          <button type="button" className="app-btn" onClick={exportJson}>JSON保存</button>
          <button type="button" className="app-btn" onClick={() => fileRef.current?.click()}>JSON読込</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onPickFile} hidden aria-label="JSONファイルを選択" />
          <button type="button" className="app-btn app-btn--primary" onClick={print}>印刷</button>
          <button type="button" className="app-btn app-btn--danger" onClick={onReset}>クリア</button>
        </div>
      </header>

      <div className="mobile-hint no-print">A4横幅の様式です。横スクロールしてご覧ください。</div>

      <div className="app-body">
        <aside className={`app-sidebar no-print${sidebarOpen ? '' : ' app-sidebar--closed'}`}>
          <div className="app-sidebar__head">
            <span className="app-sidebar__title">
              <strong>様式を選択</strong>
              <small>チェックした様式を印刷</small>
            </span>
            <button
              type="button"
              className="app-sidebar__toggle"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? '様式一覧を閉じる' : '様式一覧を開く'}
              title={sidebarOpen ? '様式一覧を閉じる' : '様式一覧を開く'}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d={sidebarOpen ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
              </svg>
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
              {/* 画面には選択中の様式だけを置く。全様式を隠して置いておくと、
                  1文字打つたびに24様式ぶん（セル5,000個超）を描き直すことになる。 */}
              {active === form.id || (printing && used(form)) ? pages[form.id] : null}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
