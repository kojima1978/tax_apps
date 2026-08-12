import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { GridForm } from './components/ui/GridForm';
import { COMMON, EDITION, TABLE1_FORM_CODE, TABLE1_NOTES, TABLE1_TITLE, TOTALS, buildTable1 } from './forms/table1';
import {
  TABLE1CONT_CONFIRM_BOXES, TABLE1CONT_FORM_CODE, TABLE1CONT_NOTES, TABLE1CONT_TITLE, buildTable1Cont,
} from './forms/table1cont';
import {
  TABLE2_EDITION, TABLE2_FORM_CODE, TABLE2_JOINT_NOTES, TABLE2_NOTES, TABLE2_SUBTITLE, TABLE2_TITLE, buildTable2,
} from './forms/table2';
import { heirLabel, heirPrefix, useFormData } from './hooks/useFormData';

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
];

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

interface ContPageProps {
  page: number;
  g: (field: string) => string;
  u: (field: string, value: string) => void;
}

/** 第1表（続）1枚（財産を取得した人2人分） */
function ContPage({ page, g, u }: ContPageProps) {
  const a = 1 + page * 2;
  const b = a + 1;
  const cells = useMemo(
    () => buildTable1Cont(heirPrefix(a), heirLabel(a), heirPrefix(b), heirLabel(b)),
    [a, b],
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

export default function App() {
  const { data, g, u, addHeir, removeHeir, toggleUsed, reset, exportJson, importJson, maxHeirs } = useFormData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState('table1');

  const table1Cells = useMemo(() => buildTable1(heirPrefix(0)), []);
  const table2Cells = useMemo(() => buildTable2(COMMON, TOTALS), []);
  const contPages = Math.ceil(Math.max(0, data.heirs.length - 1) / 2);

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
      <ContPage key={page} page={page} g={g} u={u} />
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
