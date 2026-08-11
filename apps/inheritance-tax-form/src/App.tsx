import { useMemo, useRef, type ChangeEvent } from 'react';
import { GridForm } from './components/ui/GridForm';
import { EDITION, TABLE1_FORM_CODE, TABLE1_NOTES, TABLE1_TITLE, buildTable1 } from './forms/table1';
import {
  TABLE1CONT_CONFIRM_BOXES, TABLE1CONT_FORM_CODE, TABLE1CONT_NOTES, TABLE1CONT_TITLE, buildTable1Cont,
} from './forms/table1cont';
import { heirLabel, heirPrefix, useFormData } from './hooks/useFormData';

/** 様式の枠外に印字されている注記と適用年分 */
function Footnote({ notes }: { notes: string }) {
  return (
    <div className="gov-footnote">
      <span>{notes}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{EDITION}</span>
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
  const { data, g, u, addHeir, removeHeir, reset, exportJson, importJson, maxHeirs } = useFormData();
  const fileRef = useRef<HTMLInputElement>(null);

  const table1Cells = useMemo(() => buildTable1(heirPrefix(0)), []);
  const contPages = Math.ceil(Math.max(0, data.heirs.length - 1) / 2);

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
          相続税の申告書 第1表・第1表（続）
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

      <main className="app-main">
        <p className="app-note no-print">
          Ⓑ「遺産に係る基礎控除額」（第2表②の㋩）と⑦「相続税の総額」（第2表⑧）は第2表からの転記欄のため、手入力してください。
          ④⑥⑧⑨⑮⑯⑲㉑㉒㉖㉗ と「各人の合計」列は自動計算されます（⑧は端数調整のため上書きできます）。
        </p>

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

        {Array.from({ length: contPages }, (_, page) => (
          <ContPage key={page} page={page} g={g} u={u} />
        ))}
      </main>
    </div>
  );
}
