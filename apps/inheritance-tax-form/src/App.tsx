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
import { DETAIL_GROUPS, buildDetail } from './forms/detail';
import { TABLE11F1_SHARE, TABLE11F1_SPEC } from './forms/table11f1';
import { detailLabel, detailPrefix, heirLabel, heirPrefix, useFormData } from './hooks/useFormData';

/** 第11表を使う場合、第1表①は第11表2③からの転記になる */
const TABLE11_TRANSFERRED = ['v1'] as const;
/** 転記が無いときの既定値（useMemo の依存を安定させるため定数にする） */
const EMPTY_TRANSFERRED: readonly string[] = [];

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
  { id: 'table11f1', label: '第11表の付表1', note: '財産の明細書（土地・家屋等用）' },
];

/** 付表（財産の明細書）の様式ID → 割付。様式を足したらここに1行追加する。 */
const DETAIL_SPECS = {
  table11f1: { spec: TABLE11F1_SPEC, share: TABLE11F1_SHARE },
} as const;

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
        aspectRatio="1037 / 1510"
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

  // 第11表を使うと第1表①がその転記欄になるため、①を読み取り専用にする
  const transferred = data.used.includes('table11') ? TABLE11_TRANSFERRED : EMPTY_TRANSFERRED;
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
    table11f1: (
      <>
        {Array.from({ length: detailPages('table11f1') }, (_, page) => (
          <DetailPage key={page} form="table11f1" page={page} g={g} u={u} />
        ))}
        <div className="app-pagectl no-print">
          <button type="button" className="app-btn" onClick={() => removeDetailPage('table11f1', DETAIL_GROUPS)} disabled={detailPages('table11f1') <= 1}>−</button>
          明細 {detailPages('table11f1')}枚（財産{DETAIL_GROUPS}件／枚）
          <button type="button" className="app-btn" onClick={() => addDetailPage('table11f1', DETAIL_GROUPS)}>＋</button>
        </div>
      </>
    ),
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
          <p className="app-note no-print">
            Ⓑ「遺産に係る基礎控除額」・⑦「相続税の総額」・「法定相続人の数」は第2表から自動転記されます。
            第1表の④⑥⑧⑨⑮⑯⑲㉑㉒㉖㉗ と「各人の合計」列、第2表の⑤以降も自動計算です（⑧あん分割合は端数調整のため上書きできます）。
            第11表を使用すると、その2③「取得財産の価額」が第1表①へ自動転記されます（第1表①は入力できなくなります）。
            付表（財産の明細書）を使用すると、「分割が確定した財産」が「財産を取得した人の番号」ごとに集計され、第11表2①へ自動転記されます。
          </p>

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
