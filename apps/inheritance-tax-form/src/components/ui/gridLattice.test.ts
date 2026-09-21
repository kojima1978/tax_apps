import { describe, expect, it } from 'vitest';
import type { GridCell } from './GridForm';
import {
  borderWidthOf, collapsedCells, deriveLattice, nearestIndex, ruleSegments, snapLines,
} from './gridLattice';

const cell = (top: number, left: number, height: number, width: number, rest: Partial<GridCell> = {}): GridCell => (
  { top, left, height, width, ...rest }
);

describe('snapLines', () => {
  it('0.15％以内の端は同じ線にまとめる', () => {
    expect(snapLines([10, 10.1, 10.14, 20])).toEqual([10, 20]);
  });

  it('二重線の間隔（0.23〜0.28％）は潰さない', () => {
    expect(snapLines([10, 10.23, 10.28])).toEqual([10, 10.23]);
    expect(snapLines([10, 10.3])).toEqual([10, 10.3]);
  });

  it('順不同で渡しても昇順に並べて返す', () => {
    expect(snapLines([30, 10, 20])).toEqual([10, 20, 30]);
  });
});

describe('nearestIndex', () => {
  it('一番近い線の添字を返す', () => {
    expect(nearestIndex([0, 10, 20], 9.9)).toBe(1);
    expect(nearestIndex([0, 10, 20], 16)).toBe(2);
  });
});

describe('deriveLattice', () => {
  it('セルの端から格子を作り、各セルを格子の何本目かに割り当てる', () => {
    const { xs, ys, placed } = deriveLattice([
      cell(0, 0, 50, 40),
      cell(0, 40, 50, 60),
      cell(50, 0, 50, 100),
    ]);
    expect(xs).toEqual([0, 40, 100]);
    expect(ys).toEqual([0, 50, 100]);
    expect(placed.map((p) => [p.cs, p.ce, p.rs, p.re])).toEqual([
      [1, 2, 1, 2],
      [2, 3, 1, 2],
      [1, 3, 2, 3],
    ]);
  });
});

describe('borderWidthOf', () => {
  it('太枠は1.5px、破線は1px、既定は0.5px。指定があればそれを使う', () => {
    expect(borderWidthOf(cell(0, 0, 1, 1))).toBe(0.5);
    expect(borderWidthOf(cell(0, 0, 1, 1, { outline: true }))).toBe(1.5);
    expect(borderWidthOf(cell(0, 0, 1, 1, { dashed: true }))).toBe(1);
    expect(borderWidthOf(cell(0, 0, 1, 1, { outline: true, borderWidth: 2 }))).toBe(2);
  });
});

describe('ruleSegments', () => {
  it('隣り合うセルが同じ境目に引く罫線は1本にまとめる', () => {
    const { v, h } = ruleSegments([cell(0, 0, 50, 100), cell(50, 0, 50, 100)]);
    // 縦は左右の2本、横は上・中・下の3本
    expect(v).toEqual([
      { pos: 0, from: 0, to: 100, width: 0.5, dashed: false },
      { pos: 100, from: 0, to: 100, width: 0.5, dashed: false },
    ]);
    expect(h.map((s) => s.pos)).toEqual([0, 50, 100]);
  });

  it('太さが違えば別の線として残す（二重線・太枠の内訳が消えない）', () => {
    const { h } = ruleSegments([
      cell(0, 0, 50, 100, { borderBottomWidth: 1.5 }),
      cell(50, 0, 50, 100),
    ]);
    expect(h.filter((s) => s.pos === 50).map((s) => s.width).sort()).toEqual([0.5, 1.5]);
  });

  it('noBorder 系の指定は罫線を出さない', () => {
    expect(ruleSegments([cell(0, 0, 50, 100, { noBorder: true })]).h).toEqual([]);
    const { v, h } = ruleSegments([cell(0, 0, 50, 100, { noBorderTop: true, noBorderLeft: true })]);
    expect(h.map((s) => s.pos)).toEqual([50]);
    expect(v.map((s) => s.pos)).toEqual([100]);
  });

  it('離れた区間はつなげない', () => {
    const { h } = ruleSegments([
      cell(0, 0, 50, 20, { noBorderBottom: true }),
      cell(0, 60, 50, 40, { noBorderBottom: true }),
    ]);
    expect(h.filter((s) => s.pos === 0).map((s) => [s.from, s.to])).toEqual([[0, 20], [60, 100]]);
  });

  it('罫線の位置は格子に寄せた後の値になる（描画と同じ）', () => {
    // 2本目のセルの左端は 40.1 だが、格子では 40 に寄る
    const { v } = ruleSegments([cell(0, 0, 100, 40), cell(0, 40.1, 100, 59.9)]);
    expect(v.map((s) => s.pos)).toEqual([0, 40, 100]);
  });
});

describe('collapsedCells', () => {
  it('寄せで幅（高さ） 0 になった罫線セルを拾う', () => {
    // 2本目のセルは幅 0.1（％）で、左右の端が同じ線へ寄る
    const cells = [cell(0, 0, 100, 40), cell(0, 40, 100, 0.1), cell(0, 40.1, 100, 59.9)];
    expect(collapsedCells(deriveLattice(cells))).toHaveLength(1);
    expect(collapsedCells(deriveLattice(cells))[0]!.c).toBe(cells[1]);
  });

  it('罫線を持たないセルは潰れても拾わない', () => {
    const cells = [
      cell(0, 0, 100, 40), cell(0, 40, 100, 0.1, { noBorder: true }), cell(0, 40.1, 100, 59.9),
    ];
    expect(collapsedCells(deriveLattice(cells))).toEqual([]);
  });
});
