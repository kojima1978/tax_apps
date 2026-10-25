import { useLayoutEffect, useRef, useState } from 'react';
import type { PowerOfAttorneySheet, SheetRow } from '@/utils/powerOfAttorney/record';

// 用紙の余白。画面のプレビューの内側余白にも同じ値を使い、画面と紙で折り返しを揃える
const MARGIN_MM = { vertical: 14, horizontal: 16 };
const PRINTABLE_HEIGHT_MM = 297 - MARGIN_MM.vertical * 2;
const MM_TO_PX = 96 / 25.4;

/** 委任状の画面が開いている間だけ差し込む @page（globals.css の既定は書類リスト用の A4 横） */
export const POA_PAGE_STYLE = `@media print { @page { size: A4 portrait; margin: ${MARGIN_MM.vertical}mm ${MARGIN_MM.horizontal}mm; } }`;

// 1枚に収まるまで文字を小さくしていく段階（pt）。最後の段でも収まらなければ画面に知らせる
const FONT_STEPS_PT = [10.5, 10, 9.5, 9, 8.5, 8];

/** 住所・氏名などの表。空の欄も手書きできる高さで残す */
const RowsTable = ({ rows }: { rows: SheetRow[] }) => (
  <table className="poa-table">
    <tbody>
      {rows.map((row) => (
        <tr key={row.label}>
          <th>{row.label}</th>
          <td>
            <div className="poa-cell">
              <span className="poa-value">{row.value}</span>
              {row.seal && (
                <span className="poa-seal">
                  {row.seal}
                  {row.sealNote && <small>{row.sealNote}</small>}
                </span>
              )}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** 本文の高さ（mm）。紙の最低高さで伸びた分は数えず、最後の要素の下端で測る */
const contentHeightMm = (el: HTMLElement) => {
  const last = el.lastElementChild;
  if (!last) return 0;
  const rect = el.getBoundingClientRect();
  // プレビューは transform で縮めて出す。getBoundingClientRect は縮んだ後の値なので紙の寸法へ戻す
  const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
  const heightPx = (last.getBoundingClientRect().bottom - rect.top) / scale - parseFloat(getComputedStyle(el).paddingTop);
  return heightPx / MM_TO_PX;
};

/** 委任事項が多い・文面が長いときに、1枚に収まる文字の大きさを選ぶ */
function useFitFontSize(sheet: PowerOfAttorneySheet) {
  const ref = useRef<HTMLElement>(null);
  const [fit, setFit] = useState({ fontPt: FONT_STEPS_PT[0], overflow: false });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const found = FONT_STEPS_PT.find((pt) => {
        el.style.fontSize = `${pt}pt`;
        return contentHeightMm(el) <= PRINTABLE_HEIGHT_MM;
      });
      const next = { fontPt: found ?? FONT_STEPS_PT[FONT_STEPS_PT.length - 1], overflow: found === undefined };
      el.style.fontSize = `${next.fontPt}pt`;
      setFit((prev) => (prev.fontPt === next.fontPt && prev.overflow === next.overflow ? prev : next));
    };
    measure();
    // 明朝体の読み込みが後から終わると高さが変わる
    let alive = true;
    void document.fonts?.ready.then(() => alive && measure());
    return () => {
      alive = false;
    };
  }, [sheet]);

  return { ref, ...fit };
}

/** A4 縦1枚。画面のプレビューと印刷は同じ DOM（見た目を2つ持たない） */
export const PowerOfAttorneySheetView = ({ sheet }: { sheet: PowerOfAttorneySheet }) => {
  const { ref, fontPt, overflow } = useFitFontSize(sheet);
  return (
    <>
      {overflow && (
        <p className="no-print mb-1 text-xs font-medium text-red-600 dark:text-red-400">
          文字を小さくしても1枚に収まりません。委任事項を減らすか、文面を短くしてください。
        </p>
      )}
      <section
        ref={ref}
        className="poa-sheet"
        aria-label={sheet.label}
        style={{ fontSize: `${fontPt}pt`, padding: `${MARGIN_MM.vertical}mm ${MARGIN_MM.horizontal}mm` }}
      >
        <h2 className="poa-title">{sheet.title}</h2>

        <p className="poa-heading">{sheet.upperHeading}</p>
        <RowsTable rows={sheet.upperRows} />

        <div className="poa-body">
          {sheet.delegation.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>

        <p className="poa-heading poa-center">【委任事項】</p>
        <p className="poa-item">{sheet.matterHeading}</p>
        <ul className="poa-matters">
          {sheet.matters.map((text, index) => (
            <li key={`${index}-${text}`}>{text}</li>
          ))}
        </ul>
        {sheet.closingItems.map((text) => (
          <p key={text} className="poa-item">{text}</p>
        ))}
        <p className="poa-right">以上</p>

        <p className="poa-right poa-date">{sheet.date}</p>

        <p className="poa-heading">{sheet.principalHeading}</p>
        <RowsTable rows={sheet.principalRows} />

        {sheet.agentRows && (
          <>
            <p className="poa-heading">【代理人】</p>
            <RowsTable rows={sheet.agentRows} />
          </>
        )}
      </section>
    </>
  );
};
