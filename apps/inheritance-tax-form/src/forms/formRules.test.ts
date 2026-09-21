/**
 * 全様式の罫線の回帰テスト。
 *
 * 罫線は様式PDFのラスタから位置を拾って合わせ込んであるが、その突き合わせは
 * 手元に様式PDFがある環境でしか走らせられない（PDFはリポジトリに入っていない）。
 * ここで守るのは「一度合わせた線が、別の直しのついでに動いていないこと」。
 * 意図して直したときはスナップショットの差分を読んで、動いた線が直した箇所だけか確かめる。
 */
import { describe, expect, it } from 'vitest';
import { ALL_FORMS } from './allForms';
import type { GridCell } from '../components/ui/GridForm';
import {
  SNAP_TOL, collapsedCells, deriveLattice, ruleSegments, snapDrift, type RuleSegment,
} from '../components/ui/gridLattice';

/** 様式1件ずつを `it.each` に渡す（見出しは様式名） */
const each = ALL_FORMS.map((form) => [form.name, form] as const);

/** スナップショットの1行。小数2桁＝用紙の 0.01％（A4 で 0.07px）まで見る */
const line = (s: RuleSegment): string =>
  `${s.pos.toFixed(2)} [${s.from.toFixed(2)}–${s.to.toFixed(2)}] ${s.width}px${s.dashed ? ' 破線' : ''}`;

const digest = (cells: readonly GridCell[]): string => {
  const lattice = deriveLattice(cells);
  const { v, h } = ruleSegments(cells);
  const drift = snapDrift(lattice);
  return [
    `セル ${cells.length}個 / 格子 縦${lattice.xs.length}本 横${lattice.ys.length}本`,
    `寄せで動いたセル ${drift.length}個（最大 ${(drift[0]?.drift ?? 0).toFixed(3)}％）`,
    `縦罫線 ${v.length}本`,
    ...v.map(line),
    `横罫線 ${h.length}本`,
    ...h.map(line),
  ].join('\n');
};

describe('様式の罫線', () => {
  it.each(each)('%s の罫線が変わっていない', (_name, form) => {
    expect(digest(form.cells)).toMatchSnapshot();
  });
});

describe('様式の格子', () => {
  it.each(each)('%s のセルが格子の別の線に寄っていない', (_name, form) => {
    // 寄せでセルが動く量は、まとめの許容（`SNAP_TOL`）までに収まっていなければならない。
    // これを超えるのは「隣ではない線に寄った」＝行や列を1本読み違えたということ。
    // 許容を広げて寸法の食い違いを黙らせると、そのぶん様式と突き合わせた線がずれる。
    const strayed = snapDrift(deriveLattice(form.cells)).filter((d) => d.drift > SNAP_TOL + 1e-9);
    expect(strayed.map((d) => d.cell)).toEqual([]);
  });

  it.each(each)('%s に潰れた罫線セルが無い', (_name, form) => {
    // 開発ビルドの `GridForm` が console へ出すのと同じ見方。
    // 手元で気づかなかったときのためにこちらでも止める。
    expect(collapsedCells(deriveLattice(form.cells)).map((p) => p.c)).toEqual([]);
  });
});

describe('罫線の通し', () => {
  it.each(each)('%s に長さ0の罫線が無い', (_name, form) => {
    const { v, h } = ruleSegments(form.cells);
    expect([...v, ...h].filter((s) => s.to - s.from <= 0)).toEqual([]);
  });

  it('様式は24種すべてそろっている', () => {
    expect(ALL_FORMS).toHaveLength(24);
    expect(new Set(ALL_FORMS.map((form) => form.id)).size).toBe(24);
  });
});
