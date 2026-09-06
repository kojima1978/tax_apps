import type React from 'react';
import type { GridCell } from '@/components/ui/GridForm';

/* ================================================
 * Shared type aliases
 * ================================================ */

export type GFn = (f: string) => string;
export type UFn = (f: string, v: string) => void;

/* ================================================
 * Shared style constants
 * ================================================ */

export const ROW_H = 16;
export const bb = { borderBottom: '0.5px solid #000' } as const;
export const br = { borderRight: '0.5px solid #000' } as const;
export const bl = { borderLeft: '0.5px solid #000' } as const;
export const hdr: React.CSSProperties = { background: '#f5f5f0', fontWeight: 500 };
export const vt: React.CSSProperties = { writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.12em' };
export const flex: React.CSSProperties = { display: 'flex', alignItems: 'center' };
export const roStyle: React.CSSProperties = { pointerEvents: 'none', background: '#fafafa' };
export const lbl: React.CSSProperties = { ...hdr, padding: '1px 3px', whiteSpace: 'nowrap', textAlign: 'center' };
export const hl = { background: '#fff8e1', fontWeight: 700 } as const;

/* ================================================
 * Shared utilities
 * ================================================ */

export const parseNum = (v: string) => parseInt(v.replace(/,/g, ''), 10) || 0;
export const fmtNum = (n: number) => n > 0 ? n.toLocaleString() : '';
export const fmtPct = (n: number | null) => n !== null ? `${n}%` : '';
export const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : null;

/* ================================================
 * 適用方式の選択（第3表・第6表で共通）
 * ================================================ */

/**
 * 適用方式を様式の区分見出しそのものでクリックして選ばせるためのセル属性。
 *
 * 第3表（原則的評価方式／配当還元方式）と第6表（純資産価額方式等／配当還元方式）は
 * 同じ構造を持ち、どちらも既定は第1表の株主判定に連動する自動選択。区分見出しを押すと
 * その方式に固定し、もう一度押すと自動へ戻る（selectValue が持つトグル）。
 *
 * 採用中の着色は様式にない表示なので画面限定にし、自動で選ばれた区分は橙、
 * 手で固定した区分は青の枠で見分けられるようにする。
 */
export function methodPickCell(opts: {
  /** 方式を保存するフィールド（第3表・第6表とも 'hoshiki'） */
  field: string;
  /** この見出しが表す方式の保存値 */
  value: string;
  /** 表示名（原則的評価方式・純資産価額方式等・配当還元方式） */
  name: string;
  /** 手で固定されている方式。空文字なら自動 */
  pinned: string;
  /** いま計算に採用されている方式か */
  applied: boolean;
  /** 選べない理由。あるとクリック不可になり、ホバーで理由を出す */
  blockedReason?: string;
}): Partial<GridCell> {
  const isPinned = opts.pinned === opts.value;
  const blocked = opts.blockedReason !== undefined;
  return {
    selectValue: blocked ? undefined : { field: opts.field, value: opts.value },
    highlightWhen: () => opts.applied,
    highlightScreenOnly: true,
    pinnedWhen: () => isPinned,
    ariaLabel: blocked
      ? `${opts.name}（適用しません）`
      : `${opts.name}を適用${isPinned ? '（固定中）' : opts.applied ? '（第１表の判定により適用中）' : ''}`,
    hoverHint: opts.blockedReason
      ?? (isPinned
        ? `${opts.name}に固定中。クリックで自動（第１表の株主判定に連動）に戻す`
        : `クリックで${opts.name}に固定`),
  };
}
