import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { GridForm } from './components/ui/GridForm';
import { COMMON, EDITION, TABLE1_FORM_CODE, TABLE1_NOTES, TABLE1_TITLE, TOTALS, buildTable1 } from './forms/table1';
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
import { DETAIL_GROUPS, buildDetail, detailAspect } from './forms/detail';
import { TABLE11F1_SHARE, TABLE11F1_SPEC } from './forms/table11f1';
import { TABLE11F2_SHARE, TABLE11F2_SPEC } from './forms/table11f2';
import { TABLE11F3_SHARE, TABLE11F3_SPEC } from './forms/table11f3';
import { TABLE11F4_SHARE, TABLE11F4_SPEC } from './forms/table11f4';
import { detailLabel, detailPrefix, heirLabel, heirPrefix, useFormData } from './hooks/useFormData';
import { hasTable112, table112Pages } from './lib/calc';

/** 様式ID → その様式を使うときに第1表が転記欄になる行。様式を足したらここに1行追加する。 */
const TRANSFERRED_BY_FORM: Record<string, readonly string[]> = {
  table11: ['v1'],    // ① ← 第11表2③
  table112: ['v2', 'v17'], // ② ← 第11の2表1⑧ ／ ⑰ ← 同1⑨
};

/** 第11の2表の枚数の上限（1人分・1枚に年分6行） */
const MAX_TABLE112_PAGES = 10;

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
  { id: 'table11', label: '第11表', note: '相続税がかかる財産の合計表' },
  { id: 'table112', label: '第11の2表', note: '相続時精算課税適用財産の明細書' },
  { id: 'table11f1', label: '第11表の付表1', note: '財産の明細書（土地・家屋等用）' },
  { id: 'table11f2', label: '第11表の付表2', note: '財産の明細書（有価証券用）' },
  { id: 'table11f3', label: '第11表の付表3', note: '財産の明細書（現金・預貯金等用）' },
  { id: 'table11f4', label: '第11表の付表4', note: '財産の明細書（事業用・家庭用・その他）' },
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
}

/** 第1表（続）1枚（財産を取得した人2人分） */
function ContPage({ page, g, u, transferred }: ContPageProps) {
  const a = 1 + page * 2;
  const b = a + 1;
  const cells = useMemo(
    () => buildTable1Cont(heirPrefix(a), heirLabel(a), heirPrefix(b), heirLabel(b), transferred),
    [a, b, transferred],
  );
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

export default function App() {
  const {
    data, g, u, addHeir, removeHeir, addDetailPage, removeDetailPage,
    toggleUsed, reset, exportJson, importJson, maxHeirs,
  } = useFormData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState('table1');

  // 使用する様式によって第1表の一部が転記欄になるため、その行を読み取り専用にする
  const transferred = useMemo(
    () => data.used.flatMap((id) => TRANSFERRED_BY_FORM[id] ?? []),
    [data.used],
  );
  const table1Cells = useMemo(() => buildTable1(heirPrefix(0), transferred), [transferred]);
  const table2Cells = useMemo(() => buildTable2(COMMON, TOTALS), []);
  const contPages = Math.ceil(Math.max(0, data.heirs.length - 1) / 2);
  const table11Pages = Math.max(1, Math.ceil(data.heirs.length / TABLE11_ROWS));
  /** 付表の枚数（明細の件数から決まる。1枚は必ず出す） */
  const detailPages = (form: string): number => Math.max(1, Math.ceil((data.details[form]?.length ?? 0) / DETAIL_GROUPS));
  /** 付表を1つでも使うなら、第11表2①は付表からの転記になる */
  const detailUsed = Object.keys(DETAIL_SPECS).some((id) => data.used.includes(id));

  /** その様式を提出する（＝印刷する）か */
  const used = (form: FormMeta): boolean => {
    if (form.required) return true;
    if (form.auto) return contPages > 0;
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
      </div>
    ),
    table1cont: Array.from({ length: contPages }, (_, page) => (
      <ContPage key={page} page={page} g={g} u={u} transferred={transferred} />
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
        <aside className="app-sidebar no-print">
          <div className="app-sidebar__head">様式</div>
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
          <p className="form-list__hint">チェックした様式だけを印刷します。第1表（続）は財産を取得した人が2人以上のときに自動で付きます。</p>
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
