import type { ReactNode } from 'react';
import type { GridCell } from '@/components/ui/GridForm';

// ══ 会社名の独立浮遊枠ヘルパー（令和8年様式）══
// 実様式では「会社名」欄が本表の外・右上に浮く独立枠で、その左側・上側は開放。
// 旧実装は会社名セルを本表グリッド内に含めていたため、上部左に空箱ができていた。
// このヘルパーは会社名セルを本表から分離し、(1)浮遊枠JSX と (2)本表を会社名の下から
// 始めても縦スケールが変わらない aspectRatio を返す。幾何値はセル座標から自動算出（表ごとの手動測定不要）。

const isCompanyCell = (c: GridCell): boolean =>
  c.field === 'company' || (c.kind === 'label' && !!c.text && c.text.replace(/[\s　]/g, '') === '会社名');

export interface CompanyFloatHeader {
  /** 会社名セルを除いた本表セル */
  mainCells: GridCell[];
  /** タイトルと本表の間に差し込む会社名の浮遊枠（会社名がなければ null） */
  headerExtra: ReactNode;
  /** 本表の縦横比（会社名を外に出しても縦スケールを従来と同一に保つ） */
  aspectRatio: string;
}

/**
 * cells から会社名の独立枠を分離する。
 * @param cells GridForm に渡す全セル（会社名を含む）
 */
export function extractCompanyFloatHeader(
  cells: GridCell[],
  g: (f: string) => string,
  u: (f: string, v: string) => void,
  formId: string,
): CompanyFloatHeader {
  const companyCells = cells.filter(isCompanyCell);
  const mainCells = cells.filter((c) => !isCompanyCell(c));
  if (companyCells.length === 0 || mainCells.length === 0) {
    return { mainCells: cells, headerExtra: null, aspectRatio: '210 / 297' };
  }
  const companyTop = Math.min(...companyCells.map((c) => c.top));
  const companyBottom = Math.max(...companyCells.map((c) => c.top + c.height));
  const companyLeft = Math.min(...companyCells.map((c) => c.left));
  const companyRight = Math.max(...companyCells.map((c) => c.left + c.width));
  const companyHeight = companyBottom - companyTop;
  const mainTop = Math.min(...mainCells.map((c) => c.top));
  const bottom = Math.max(...mainCells.map((c) => c.top + c.height));
  const xmin = Math.min(...mainCells.map((c) => c.left));
  const xmax = Math.max(...mainCells.map((c) => c.left + c.width));

  // 本表を会社名(top=companyTop)の下(mainTop)から始めても縦スケールが変わらない縦横比
  const aspectRatio = `210 / ${(297 * (bottom - mainTop) / (bottom - companyTop)).toFixed(2)}`;
  // 浮遊枠の幅（本表x範囲に対する会社名枠の割合）と縦横比（本表の描画スケールに一致）
  const boxWidthFrac = (companyRight - companyLeft) / (xmax - xmin);
  const boxAspect = boxWidthFrac * (210 / 297) * (bottom - companyTop) / companyHeight;
  // ラベル(会社名)と入力欄の分割比（ラベルセルの右端で分ける。なければ35%）
  const labelCell = companyCells.find((c) => c.field !== 'company');
  const inputCell = companyCells.find((c) => c.field === 'company');
  const split = labelCell && inputCell
    ? (labelCell.left + labelCell.width - companyLeft) / (companyRight - companyLeft)
    : 0.35;

  const headerExtra = (
    <div style={{ display: 'flex', padding: '3mm 0 4mm', fontFamily: '"Noto Sans JP", sans-serif' }}>
      <div className="gf-float-box" style={{ marginLeft: 'auto', width: `${(boxWidthFrac * 100).toFixed(2)}%`, aspectRatio: `${boxAspect.toFixed(3)} / 1`, display: 'flex', border: '1.5px solid #000', boxSizing: 'border-box' }}>
        <div style={{ flex: `0 0 ${(split * 100).toFixed(1)}%`, borderRight: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, letterSpacing: '0.4em', paddingLeft: '0.4em' }}>会社名</div>
        <input
          id={`${formId}-company`}
          name={`${formId}.company`}
          aria-label="会社名"
          value={g('company')}
          onChange={(e) => u('company', e.target.value)}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: '0 6px', fontSize: 11, fontFamily: 'inherit' }}
        />
      </div>
    </div>
  );
  return { mainCells, headerExtra, aspectRatio };
}

/**
 * 会社名の独立浮遊枠だけを生成する（本表に会社名セルがない続紙などで、上部に会社名欄を足すとき用）。
 * widthPct=枠の幅（%）、aspect=枠の縦横比（w/h）、labelFrac=「会社名」ラベル部分の割合。
 */
export function companyFloatBox(
  g: (f: string) => string,
  u: (f: string, v: string) => void,
  formId: string,
  opts: { widthPct: number; aspect: number; labelFrac?: number } = { widthPct: 41, aspect: 9 },
): ReactNode {
  const { widthPct, aspect, labelFrac = 0.36 } = opts;
  return (
    <div style={{ display: 'flex', padding: '3mm 0 4mm', fontFamily: '"Noto Sans JP", sans-serif' }}>
      <div className="gf-float-box" style={{ marginLeft: 'auto', width: `${widthPct}%`, aspectRatio: `${aspect} / 1`, display: 'flex', border: '1.5px solid #000', boxSizing: 'border-box' }}>
        <div style={{ flex: `0 0 ${(labelFrac * 100).toFixed(1)}%`, borderRight: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, letterSpacing: '0.4em', paddingLeft: '0.4em' }}>会社名</div>
        <input
          id={`${formId}-company`}
          name={`${formId}.company`}
          aria-label="会社名"
          value={g('company')}
          onChange={(e) => u('company', e.target.value)}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: '0 6px', fontSize: 11, fontFamily: 'inherit' }}
        />
      </div>
    </div>
  );
}
