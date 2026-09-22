import { useCallback, useMemo } from 'react';
import { ConfirmBoxes, FormPage } from './pageShell';
import type { GridCell } from './ui/GridForm';
import { DETAIL_SPECS, TABLE1_SOURCE_FOR_ROW, TABLE1_TRANSFERRED_ROWS, type DetailForm } from '../forms/registry';
import { buildDetail, detailAspect, type DetailItem } from '../forms/detail';
import type { FormRow } from '../forms/geometry';
import { COMMON, TOTALS } from '../forms/table1';
import {
  TABLE1CONT_FORM_CODE, TABLE1CONT_NOTES, TABLE1CONT_TITLE, buildTable1Cont,
} from '../forms/table1cont';
import {
  TABLE11_FORM_CODE, TABLE11_ROWS, TABLE11_SUBTITLE, TABLE11_TITLE, buildTable11,
} from '../forms/table11';
import {
  TABLE112_FORM_CODE, TABLE112_SUBTITLE, TABLE112_TITLE, buildTable112,
} from '../forms/table112';
import {
  TABLE4_ASPECT, TABLE4_EDITION, TABLE4_FORM_CODE, TABLE4_NOTES, TABLE4_SUBTITLE, TABLE4_TITLE, buildTable4,
} from '../forms/table4';
import {
  TABLE42_ASPECT, TABLE42_EDITION, TABLE42_FORM_CODE, TABLE42_NOTES, TABLE42_SUBTITLE, TABLE42_TITLE, buildTable42,
} from '../forms/table42';
import {
  TABLE9_ASPECT, TABLE9_DETAIL_FORM, TABLE9_EDITION, TABLE9_FORM_CODE, TABLE9_ROWS, TABLE9_SUBTITLE,
  TABLE9_TITLE, buildTable9,
} from '../forms/table9';
import {
  TABLE10_ASPECT, TABLE10_DETAIL_FORM, TABLE10_EDITION, TABLE10_FORM_CODE, TABLE10_ROWS, TABLE10_SUBTITLE,
  TABLE10_TITLE, buildTable10,
} from '../forms/table10';
import {
  TABLE13_ASPECT, TABLE13_DEBT_FORM, TABLE13_DEBT_ROWS, TABLE13_EDITION, TABLE13_FORM_CODE,
  TABLE13_FUNERAL_FORM, TABLE13_FUNERAL_ROWS, TABLE13_PERSONS, TABLE13_SUBTITLE, TABLE13_TITLE, buildTable13,
} from '../forms/table13';
import {
  TABLE14_ASPECT, TABLE14_BEQUEST_FORM, TABLE14_BEQUEST_ROWS, TABLE14_DONATION_FORM,
  TABLE14_DONATION_ROWS, TABLE14_EDITION, TABLE14_FORM_CODE, TABLE14_GIFT_FORM, TABLE14_GIFT_ROWS,
  TABLE14_SUBTITLE, TABLE14_TITLE, buildTable14,
} from '../forms/table14';
import {
  TABLE88_ASPECT, TABLE88_EDITION, TABLE88_FORM_CODE, TABLE88_NOTES, TABLE88_SUBTITLE,
  TABLE88_TITLE, buildTable88,
} from '../forms/table88';
import {
  TABLE15CONT_FORM_CODE, TABLE15CONT_PERSONS, TABLE15CONT_SUBTITLE, TABLE15CONT_TITLE,
  TABLE15_ASPECT, TABLE15_EDITION, buildTable15,
} from '../forms/table15';
import {
  TABLE1112F1C_FORM_CODE, TABLE1112F1C_SUBTITLE, TABLE1112F1C_TITLE, TABLE1112F1_EDITION,
  TABLE1112F1_FORM_CODE, TABLE1112F1_SUBTITLE, TABLE1112F1_TITLE, buildTable1112f1,
  table1112f1Aspect, table1112f1First,
} from '../forms/table1112f1';
import {
  TABLE1112F1B_ASPECT, TABLE1112F1B_FORM_CODE, TABLE1112F1B_SUBTITLE, TABLE1112F1B_TITLE, buildTable1112f1b,
} from '../forms/table1112f1b';
import { detailLabel, detailPrefix, heirLabel, heirPrefix } from '../hooks/useFormData';

/**
 * 様式ごとの用紙1枚。
 * 枚数の決め方と用紙の並べ方は App.tsx が持ち、ここは「1枚に何を載せるか」だけを持つ。
 */

interface PageProps {
  page: number;
  g: (field: string) => string;
  u: (field: string, value: string) => void;
  /** 転記欄（被相続人の氏名など）のクリックで入力元の様式へ移る */
  onNavigate: (formId: string) => void;
}

interface ContPageProps extends PageProps {
  /** 人物ブロックのクリック（基本情報の入力は別画面に一本化してある） */
  onAction: (action: string) => void;
}

/** 第1表（続）1枚（財産を取得した人2人分） */
export function ContPage({ page, g, u, onNavigate, onAction }: ContPageProps) {
  const a = 1 + page * 2;
  const b = a + 1;
  const cells = useMemo(() => {
    return buildTable1Cont(
      heirPrefix(a), heirLabel(a), heirPrefix(b), heirLabel(b),
      TABLE1_TRANSFERRED_ROWS, TABLE1_TRANSFERRED_ROWS, TABLE1_SOURCE_FOR_ROW,
    );
  }, [a, b]);
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE1CONT_FORM_CODE}
      title={[TABLE1CONT_TITLE, `${heirLabel(a)}・${heirLabel(b)}`].join('　')}
      formId={`t1c${page}`}
      onNavigate={onNavigate}
      onAction={onAction}
      notes={TABLE1CONT_NOTES}
      beforeFootnote={(
        <>
          <div className="gov-aside">※の項目は記入する必要がありません。</div>
          <ConfirmBoxes />
        </>
      )}
    />
  );
}

/** 第11表1枚（財産を取得した人10人分） */
export function Table11Page({ page, g, u, onNavigate }: PageProps) {
  const cells = useMemo(
    () => buildTable11(COMMON, Array.from({ length: TABLE11_ROWS }, (_, i) => {
      const index = page * TABLE11_ROWS + i;
      return { prefix: heirPrefix(index), label: heirLabel(index) };
    })),
    [page],
  );
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE11_FORM_CODE}
      title={TABLE11_TITLE}
      subtitle={TABLE11_SUBTITLE}
      aspectRatio="1073 / 1579"
      formId={`t11p${page}`}
      onNavigate={onNavigate}
    />
  );
}

interface Table112PageProps extends PageProps {
  /** 何人目の分か（この様式は贈与を受けた人ごとに1枚以上書く） */
  heir: number;
  /** その人の最終ページ（⑧⑨⑩の合計はページをまたぐので最終ページにだけ出す） */
  last: boolean;
  /** 「贈与を受けた年分」の候補（giftYearOptions で作る） */
  yearOptions: GridCell['options'];
}

/** 第11の2表1枚（1人分・年分6行＋財産の明細6行） */
export function Table112Page({ heir, page, last, yearOptions, g, u, onNavigate }: Table112PageProps) {
  const cells = useMemo(
    () => buildTable112(COMMON, heirPrefix(heir), heirLabel(heir), page, last, yearOptions),
    [heir, page, last, yearOptions],
  );
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE112_FORM_CODE}
      title={TABLE112_TITLE}
      subtitle={TABLE112_SUBTITLE}
      aspectRatio="1167.5 / 1420"
      formId={`t112h${heir}p${page}`}
      onNavigate={onNavigate}
    />
  );
}

interface Table4PageProps extends PageProps {
  /** 氏名の選択肢（項番を値に、氏名を表示に持つ） */
  whoOptions: GridCell['options'];
}

/** 第4表1枚（加算の対象となる人4人分） */
export function Table4Page({ page, whoOptions, g, u, onNavigate }: Table4PageProps) {
  const cells = useMemo(() => buildTable4(COMMON, TOTALS, page, whoOptions), [page, whoOptions]);
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE4_FORM_CODE}
      title={TABLE4_TITLE}
      subtitle={TABLE4_SUBTITLE}
      aspectRatio={TABLE4_ASPECT}
      formId={`t4p${page}`}
      onNavigate={onNavigate}
      notes={TABLE4_NOTES}
      edition={TABLE4_EDITION}
    />
  );
}

/** 第4表の2 1枚（控除を受ける人3人分） */
export function Table42Page({ page, whoOptions, g, u, onNavigate }: Table4PageProps) {
  const cells = useMemo(() => buildTable42(COMMON, TOTALS, page, whoOptions), [page, whoOptions]);
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE42_FORM_CODE}
      title={TABLE42_TITLE}
      subtitle={TABLE42_SUBTITLE}
      aspectRatio={TABLE42_ASPECT}
      formId={`t42p${page}`}
      onNavigate={onNavigate}
      notes={TABLE42_NOTES}
      edition={TABLE42_EDITION}
    />
  );
}

/** 明細の行（この用紙に載る `rows` 件）の在りか。接頭辞は明細の配列を指す */
function detailRows(form: string, page: number, rows: number, name: string): FormRow[] {
  return Array.from({ length: rows }, (_, r) => {
    const index = page * rows + r;
    return { prefix: detailPrefix(form, index), label: `${name}${index + 1}` };
  });
}

interface Table9PageProps extends PageProps {
  /** ⒷとⒷに基づく②③の合計は全枚数の通算なので、最終ページにだけ出す */
  last: boolean;
  /** 氏名の選択肢（項番を値に、氏名を表示に持つ） */
  whoOptions: GridCell['options'];
}

/** 第9表1枚（保険金の明細5件・相続人5人分） */
export function Table9Page({ page, last, whoOptions, g, u, onNavigate }: Table9PageProps) {
  const cells = useMemo(
    () => buildTable9(COMMON, TOTALS, detailRows(TABLE9_DETAIL_FORM, page, TABLE9_ROWS, '保険金'), page, last, whoOptions),
    [page, last, whoOptions],
  );
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE9_FORM_CODE}
      title={TABLE9_TITLE}
      subtitle={TABLE9_SUBTITLE}
      aspectRatio={TABLE9_ASPECT}
      formId={`t9p${page}`}
      onNavigate={onNavigate}
      edition={TABLE9_EDITION}
    />
  );
}

/** 第10表1枚（退職手当金などの明細5件・相続人5人分）。構成は第9表と同じ */
export function Table10Page({ page, last, whoOptions, g, u, onNavigate }: Table9PageProps) {
  const cells = useMemo(
    () => buildTable10(COMMON, TOTALS, detailRows(TABLE10_DETAIL_FORM, page, TABLE10_ROWS, '退職手当金'), page, last, whoOptions),
    [page, last, whoOptions],
  );
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE10_FORM_CODE}
      title={TABLE10_TITLE}
      subtitle={TABLE10_SUBTITLE}
      aspectRatio={TABLE10_ASPECT}
      formId={`t10p${page}`}
      onNavigate={onNavigate}
      edition={TABLE10_EDITION}
    />
  );
}

interface Table13PageProps extends PageProps {
  /** 3の「債務などを承継した人」は1枚に4人分。最終ページにだけ（各人の合計）を出す */
  last: boolean;
  /** 「負担する人の氏名」の選択肢（項番を値に、氏名を表示に持つ） */
  whoOptions: GridCell['options'];
}

/** 第13表1枚（債務4件・葬式費用5件・承継した人4人分） */
export function Table13Page({ page, last, whoOptions, g, u, onNavigate }: Table13PageProps) {
  const cells = useMemo(
    () => buildTable13(COMMON, TOTALS, {
      people: Array.from({ length: TABLE13_PERSONS }, (_, i) => {
        const index = page * TABLE13_PERSONS + i;
        return { prefix: heirPrefix(index), label: heirLabel(index) };
      }),
      debt: detailRows(TABLE13_DEBT_FORM, page, TABLE13_DEBT_ROWS, '債務'),
      funeral: detailRows(TABLE13_FUNERAL_FORM, page, TABLE13_FUNERAL_ROWS, '葬式費用'),
    }, last, whoOptions),
    [page, last, whoOptions],
  );
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE13_FORM_CODE}
      title={TABLE13_TITLE}
      subtitle={TABLE13_SUBTITLE}
      aspectRatio={TABLE13_ASPECT}
      formId={`t13p${page}`}
      onNavigate={onNavigate}
      edition={TABLE13_EDITION}
    />
  );
}

/** 第14表1枚（1の明細4件・④4人分・2と3の明細2件ずつ） */
export function Table14Page({ page, last, whoOptions, g, u, onNavigate }: Table13PageProps) {
  const cells = useMemo(
    () => buildTable14(COMMON, TOTALS, {
      gift: detailRows(TABLE14_GIFT_FORM, page, TABLE14_GIFT_ROWS, '1の贈与財産'),
      bequest: detailRows(TABLE14_BEQUEST_FORM, page, TABLE14_BEQUEST_ROWS, '2の遺贈財産'),
      donation: detailRows(TABLE14_DONATION_FORM, page, TABLE14_DONATION_ROWS, '3の寄附財産'),
    }, page, last, whoOptions),
    [page, last, whoOptions],
  );
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE14_FORM_CODE}
      title={TABLE14_TITLE}
      subtitle={TABLE14_SUBTITLE}
      aspectRatio={TABLE14_ASPECT}
      formId={`t14p${page}`}
      onNavigate={onNavigate}
      edition={TABLE14_EDITION}
    />
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
export function Table88Page({ page, whoOptions, autoCredit, autoSuccessive, g, u, onNavigate }: Table88PageProps) {
  const cells = useMemo(
    () => buildTable88(COMMON, TOTALS, page, autoCredit, autoSuccessive, whoOptions),
    [page, autoCredit, autoSuccessive, whoOptions],
  );
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE88_FORM_CODE}
      title={TABLE88_TITLE}
      subtitle={TABLE88_SUBTITLE}
      aspectRatio={TABLE88_ASPECT}
      formId={`t88p${page}`}
      onNavigate={onNavigate}
      notes={TABLE88_NOTES}
      edition={TABLE88_EDITION}
    />
  );
}

interface Table15ContPageProps extends PageProps {
  /** 他の様式からの転記になっている欄（丸番号。読み取り専用にする） */
  t15Transferred: ReadonlySet<string>;
}

/** 第15表（続）1枚（財産を取得した人2人分。1人目は第15表の右列に載るので2人目から） */
export function Table15ContPage({ page, g, u, t15Transferred, onNavigate }: Table15ContPageProps) {
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
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE15CONT_FORM_CODE}
      title={[TABLE15CONT_TITLE, `${heirLabel(a)}・${heirLabel(b)}`].join('　')}
      subtitle={TABLE15CONT_SUBTITLE}
      aspectRatio={TABLE15_ASPECT}
      formId={`t15c${page}`}
      onNavigate={onNavigate}
      edition={TABLE15_EDITION}
    />
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
export function Table1112f1Page({ sheet, rows, linkedMask, whoOptions, g, u, onNavigate }: Table1112f1PageProps) {
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
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={sheet === 0 ? TABLE1112F1_FORM_CODE : TABLE1112F1C_FORM_CODE}
      title={sheet === 0 ? TABLE1112F1_TITLE : TABLE1112F1C_TITLE}
      subtitle={sheet === 0 ? TABLE1112F1_SUBTITLE : TABLE1112F1C_SUBTITLE}
      aspectRatio={table1112f1Aspect(sheet)}
      formId={`t1112f1s${sheet}`}
      onNavigate={onNavigate}
      edition={TABLE1112F1_EDITION}
    />
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
export function Table1112f1bPage({ sheet, whoOptions, g, u, onNavigate }: Table1112f1bPageProps) {
  const cells = useMemo(
    () => buildTable1112f1b(COMMON, TOTALS, detailPrefix('table1112f1b', sheet), sheet, whoOptions),
    [sheet, whoOptions],
  );
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={TABLE1112F1B_FORM_CODE}
      title={`${TABLE1112F1B_TITLE} ${sheet + 1}件目`}
      subtitle={TABLE1112F1B_SUBTITLE}
      aspectRatio={TABLE1112F1B_ASPECT}
      formId={`t1112f1b${sheet}`}
      onNavigate={onNavigate}
      edition={TABLE1112F1_EDITION}
    />
  );
}

interface DetailPageProps extends PageProps {
  form: DetailForm;
  /** この用紙に載せる組（8組。1組＝1財産とは限らない） */
  items: readonly DetailItem[];
  /** 明細をクリックしたとき（入力は別画面に一本化してある） */
  onEdit: (index: number) => void;
}

/** 付表（財産の明細書）1枚（8組分） */
export function DetailPage({ form, items, page, g, u, onNavigate, onEdit }: DetailPageProps) {
  const { spec, share } = DETAIL_SPECS[form];
  const cells = useMemo(() => buildDetail(spec, share, COMMON, items), [spec, share, items]);
  const onAction = useCallback((action: string) => onEdit(Number(action)), [onEdit]);
  return (
    <FormPage
      cells={cells}
      g={g}
      u={u}
      formCode={spec.formCode}
      title={spec.title}
      subtitle={spec.subtitle}
      aspectRatio={detailAspect(spec)}
      formId={`${form}p${page}`}
      onNavigate={onNavigate}
      onAction={onAction}
    />
  );
}
