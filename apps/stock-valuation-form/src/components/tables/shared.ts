import type React from 'react';

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

/* ================================================
 * Shared utilities
 * ================================================ */

export const parseNum = (v: string) => parseInt(v.replace(/,/g, ''), 10) || 0;
export const fmtNum = (n: number) => n > 0 ? n.toLocaleString() : '';
export const fmtPct = (n: number | null) => n !== null ? `${n}%` : '';
export const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : null;
