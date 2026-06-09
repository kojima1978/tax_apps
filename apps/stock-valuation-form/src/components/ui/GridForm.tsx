import { useMemo, useRef, useCallback, type CSSProperties, type KeyboardEvent } from 'react';

/** グリッドセル定義（座標・サイズは％） */
export interface GridCell {
  top: number;
  left: number;
  width: number;
  height: number;
  kind?: 'cell' | 'input' | 'label'; // cell=枠のみ, input=入力, label=固定文字
  text?: string;                     // label/cell の表示文字
  field?: string;                    // input のフィールドキー
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  bold?: boolean;
  cornerLabel?: string;             // 入力欄の左上に表示する固定ラベル
  topRightLabel?: string;            // セルの右上に表示する固定ラベル
  rightLabel?: string;               // セルの右端中央に表示する固定ラベル
  integerDigits?: number;            // 数字のみの最大桁数
  diagonal?: 'tlbr' | 'bltr'; // 斜線（入力不可セル: tlbr=＼ 左上→右下, bltr=／ 左下→右上）
  date?: boolean; // 和暦◯年◯月◯日の複合入力（fieldを接頭辞に _g/_y/_m/_d を付与）
  dateRange?: boolean; // 自◯年◯月◯日／至◯年◯月◯日 の期間入力（field_from_*, field_to_*）
}

interface GridFormProps {
  cells: GridCell[];
  g: (f: string) => string;
  u: (f: string, v: string) => void;
  width?: string;
  /** 枠外上部に表示する様式タイトル */
  title?: string;
}

/** 近接する境界線を統合（tol％以内は同一線とみなす） */
function snapLines(values: number[], tol = 0.7): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const lines: number[] = [];
  for (const v of sorted) {
    const last = lines[lines.length - 1];
    if (last === undefined || v - last > tol) lines.push(v);
  }
  return lines;
}

function nearestIndex(lines: number[], v: number): number {
  let best = 0, bd = Infinity;
  lines.forEach((l, i) => { const d = Math.abs(l - v); if (d < bd) { bd = d; best = i; } });
  return best;
}

/** 和暦日付の複合入力ボックス共通スタイル */
const DATE_BOX: CSSProperties = { textAlign: 'center', border: 'none', borderBottom: '1px solid #aaa', outline: 'none', background: 'transparent', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, minWidth: 0 };
const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E")`;

interface DateFieldsProps {
  field: string;
  g: (f: string) => string;
  u: (f: string, v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}
/** 和暦(選択)◯年◯月◯日 の入力群（field を接頭辞に _g/_y/_m/_d） */
function DateFields({ field, g, u, onKeyDown }: DateFieldsProps) {
  const num = (s: string) => (
    <input value={g(`${field}_${s}`)} onChange={(e) => u(`${field}_${s}`, e.target.value.replace(/\D/g, '').slice(0, 2))} onKeyDown={onKeyDown} maxLength={2} inputMode="numeric" style={{ ...DATE_BOX, width: '2em' }} />
  );
  return (
    <>
      <select value={g(`${field}_g`) || '令和'} onChange={(e) => u(`${field}_g`, e.target.value)} onKeyDown={onKeyDown} style={{ ...DATE_BOX, width: '4.4em', borderBottom: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', textAlignLast: 'center', cursor: 'pointer', paddingRight: '9px', backgroundImage: SELECT_ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1px center', backgroundSize: '7px' }}>
        <option value="令和">令和</option>
        <option value="平成">平成</option>
      </select>
      {num('y')}年{num('m')}月{num('d')}日
    </>
  );
}

/**
 * 測定した矩形（cells）から CSS グリッドを自動導出して描画。
 * 各矩形の left/right を縦線、top/bottom を横線として grid-template を生成し、
 * 各セルを grid-column / grid-row で配置する。背景画像は不要。
 */
export function GridForm({ cells, g, u, width = '100%', title }: GridFormProps) {
  const { colTmpl, rowTmpl, placed } = useMemo(() => {
    const xs = snapLines(cells.flatMap((c) => [c.left, c.left + c.width]));
    const ys = snapLines(cells.flatMap((c) => [c.top, c.top + c.height]));
    const colTmpl = xs.slice(1).map((x, i) => `${(x - xs[i]!).toFixed(3)}fr`).join(' ');
    const rowTmpl = ys.slice(1).map((y, i) => `${(y - ys[i]!).toFixed(3)}fr`).join(' ');
    const placed = cells.map((c) => ({
      c,
      cs: nearestIndex(xs, c.left) + 1,
      ce: nearestIndex(xs, c.left + c.width) + 1,
      rs: nearestIndex(ys, c.top) + 1,
      re: nearestIndex(ys, c.top + c.height) + 1,
    }));
    return { colTmpl, rowTmpl, placed };
  }, [cells]);

  const gridRef = useRef<HTMLDivElement>(null);
  // Enter で次の入力欄（DOM順＝右→下）へフォーカス移動
  const onEnterNext = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const items = Array.from(gridRef.current?.querySelectorAll<HTMLElement>('input, select') ?? []);
    const idx = items.indexOf(e.currentTarget);
    if (idx >= 0 && idx + 1 < items.length) items[idx + 1]!.focus();
  }, []);

  return (
    <div style={{ width, margin: '0 auto' }}>
      {title && <div style={{ fontWeight: 700, fontSize: 13, padding: '2px 0 4px', fontFamily: '"Noto Sans JP", sans-serif', lineHeight: 1.3 }}>{title}</div>}
      <div ref={gridRef} style={{ width: '100%', aspectRatio: '210 / 297', display: 'grid', gridTemplateColumns: colTmpl, gridTemplateRows: rowTmpl, border: '1.5px solid #000', boxSizing: 'border-box', fontFamily: '"Noto Sans JP", sans-serif' }}>
      {placed.map(({ c, cs, ce, rs, re }, i) => {
        // 縦長のラベルは縦書き（帯見出し）。スペースは縦書き時に除去。
        const ratio = c.height / c.width;
        const isVertical = c.kind === 'label' && ratio > 2.5;
        const raw = c.text ?? '';
        const text = isVertical ? raw.replace(/[ 　]/g, '') : raw;
        // 文字数に応じて自動縮小（長文ラベルがはみ出さないように）
        const len = raw.length;
        const fontSize = c.fontSize ?? (isVertical ? 8 : len > 40 ? 6 : len > 24 ? 6.5 : len > 12 ? 7.5 : 9);
        const justify = c.align === 'left' ? 'flex-start' : c.align === 'right' ? 'flex-end' : 'center';
        return (
          <div key={i} style={{
            gridColumn: `${cs} / ${ce}`,
            gridRow: `${rs} / ${re}`,
            border: '0.5px solid #000',
            position: c.diagonal || c.cornerLabel || c.topRightLabel || c.rightLabel ? 'relative' : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isVertical ? (c.align === 'center' ? 'center' : 'flex-start') : justify,
            writingMode: isVertical ? 'vertical-rl' : undefined,
            fontSize,
            fontWeight: c.bold ? 700 : 400,
            padding: '1px 2px', boxSizing: 'border-box', overflow: 'hidden',
            lineHeight: 1.15, wordBreak: 'break-all', whiteSpace: 'normal', textAlign: 'center',
          }}>
            {c.topRightLabel && <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 7, lineHeight: 1, pointerEvents: 'none' }}>{c.topRightLabel}</span>}
            {c.rightLabel && <span style={{ position: 'absolute', top: '50%', right: 2, transform: 'translateY(-50%)', fontSize: 7, lineHeight: 1, pointerEvents: 'none' }}>{c.rightLabel}</span>}
            {c.diagonal ? (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <line x1="0" y1={c.diagonal === 'bltr' ? 100 : 0} x2="100" y2={c.diagonal === 'bltr' ? 0 : 100} stroke="#000" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : c.date && c.field ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, width: '100%', height: '100%', whiteSpace: 'nowrap' }}>
                <DateFields field={c.field} g={g} u={u} onKeyDown={onEnterNext} />
              </div>
            ) : c.dateRange && c.field ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, width: '100%', height: '100%', fontSize: '0.95em' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, whiteSpace: 'nowrap' }}>自<DateFields field={`${c.field}_from`} g={g} u={u} onKeyDown={onEnterNext} /></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, whiteSpace: 'nowrap' }}>至<DateFields field={`${c.field}_to`} g={g} u={u} onKeyDown={onEnterNext} /></div>
              </div>
            ) : c.kind === 'input' && c.field
              ? <>
                  {c.cornerLabel && <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 7, lineHeight: 1, pointerEvents: 'none' }}>{c.cornerLabel}</span>}
                  <input value={g(c.field)} onChange={(e) => u(c.field!, c.integerDigits ? e.target.value.replace(/\D/g, '').slice(0, c.integerDigits) : e.target.value)} onKeyDown={onEnterNext} inputMode={c.integerDigits ? 'numeric' : undefined} maxLength={c.integerDigits} style={{ width: '100%', height: '100%', border: 'none', outline: 'none', textAlign: c.align ?? 'right', fontSize: 'inherit', background: 'transparent', padding: 0, paddingRight: c.rightLabel ? 10 : 0, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </>
              : c.kind === 'label' ? (text.includes('\n') ? <span style={{ whiteSpace: 'pre-line', width: '100%', textAlign: c.align ?? 'center' }}>{text}</span> : text) : null}
          </div>
        );
      })}
      </div>
    </div>
  );
}
