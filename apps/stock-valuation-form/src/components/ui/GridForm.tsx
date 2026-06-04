import { useMemo } from 'react';

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
  diagonal?: 'tlbr' | 'bltr'; // 斜線（入力不可セル: tlbr=＼ 左上→右下, bltr=／ 左下→右上）
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

  return (
    <div style={{ width, margin: '0 auto' }}>
      {title && <div style={{ fontWeight: 700, fontSize: 13, padding: '2px 0 4px', fontFamily: '"Noto Sans JP", sans-serif', lineHeight: 1.3 }}>{title}</div>}
      <div style={{ width: '100%', aspectRatio: '210 / 297', display: 'grid', gridTemplateColumns: colTmpl, gridTemplateRows: rowTmpl, border: '1.5px solid #000', boxSizing: 'border-box', fontFamily: '"Noto Sans JP", sans-serif' }}>
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
            position: c.diagonal ? 'relative' : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isVertical ? 'flex-start' : justify,
            writingMode: isVertical ? 'vertical-rl' : undefined,
            fontSize,
            fontWeight: c.bold ? 700 : 400,
            padding: '1px 2px', boxSizing: 'border-box', overflow: 'hidden',
            lineHeight: 1.15, wordBreak: 'break-all', whiteSpace: 'normal', textAlign: 'center',
          }}>
            {c.diagonal ? (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <line x1="0" y1={c.diagonal === 'bltr' ? 100 : 0} x2="100" y2={c.diagonal === 'bltr' ? 0 : 100} stroke="#000" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : c.kind === 'input' && c.field
              ? <input value={g(c.field)} onChange={(e) => u(c.field!, e.target.value)} style={{ width: '100%', height: '100%', border: 'none', outline: 'none', textAlign: c.align ?? 'right', fontSize: 'inherit', background: 'transparent', padding: 0, fontFamily: 'inherit' }} />
              : c.kind === 'label' ? text : null}
          </div>
        );
      })}
      </div>
    </div>
  );
}
