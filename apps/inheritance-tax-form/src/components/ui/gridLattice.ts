/**
 * セル定義（％の矩形）から、CSS グリッドの格子と「実際に引かれる罫線」を導く。
 *
 * GridForm の描画と、罫線の回帰テストの両方がここを通る。様式PDFとの突き合わせは
 * 描画結果（DOM）を測って行うが、それは手元に様式PDFがある環境でしか走らせられない。
 * CI で守れるのは「前に確かめた線が動いていないこと」までなので、同じ導出を
 * DOM 抜きで取り出せるようにしてある。
 */
import type { GridCell } from './GridForm';

/**
 * 近接する境界線を統合（tol％以内は同一線とみなす）。
 * 実測値の誤差は最大でも 0.05％ 程度なのに対し、様式には高さ 0.66％ の帯（見出し帯の上の
 * 空白帯）が実在する。tol を大きく取るとその帯が潰れて 0 幅の行になる。
 * さらに様式の二重線は 4px（150dpi 実測）＝ 用紙の 0.23〜0.28％ しかないので、
 * 0.3％ では二重線まで 1 本に潰れてしまう（第5表・第11の2表・第11表の付表1〜4）。
 * 実測誤差の 3 倍を確保しつつ二重線を残せる 0.15％ とする。
 */
export const SNAP_TOL = 0.15;

export function snapLines(values: number[], tol = SNAP_TOL): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const lines: number[] = [];
  for (const v of sorted) {
    const last = lines[lines.length - 1];
    if (last === undefined || v - last > tol) lines.push(v);
  }
  return lines;
}

export function nearestIndex(lines: number[], v: number): number {
  let best = 0, bd = Infinity;
  lines.forEach((l, i) => { const d = Math.abs(l - v); if (d < bd) { bd = d; best = i; } });
  return best;
}

/** グリッドに載せたセル（cs/ce/rs/re は CSS の grid-column / grid-row の値＝1始まり） */
export interface PlacedCell {
  c: GridCell;
  cs: number;
  ce: number;
  rs: number;
  re: number;
}

export interface Lattice {
  /** 縦罫線の位置（％・昇順） */
  xs: number[];
  /** 横罫線の位置（％・昇順） */
  ys: number[];
  placed: PlacedCell[];
}

/** セルの左右・上下の端を集めて格子を作り、各セルをその格子の何本目から何本目かに割り当てる。 */
export function deriveLattice(cells: readonly GridCell[]): Lattice {
  const xs = snapLines(cells.flatMap((c) => [c.left, c.left + c.width]));
  const ys = snapLines(cells.flatMap((c) => [c.top, c.top + c.height]));
  return {
    xs,
    ys,
    placed: cells.map((c) => ({
      c,
      cs: nearestIndex(xs, c.left) + 1,
      ce: nearestIndex(xs, c.left + c.width) + 1,
      rs: nearestIndex(ys, c.top) + 1,
      re: nearestIndex(ys, c.top + c.height) + 1,
    })),
  };
}

/** 格子へ寄せたときに端が動いたセル1件 */
export interface SnapDrift {
  cell: GridCell;
  /** 4辺のうち一番動いた量（％）。`SNAP_TOL` を超えることは無い */
  drift: number;
}

/**
 * 格子へ寄せたときに端が動いたセルを、動いた量の大きい順に返す。
 *
 * 寄せは近い端どうしを1本にまとめるので、まとめられた側のセルは最大 `SNAP_TOL`（％）
 * ＝ A4 で約1px 動く。罫線の太さと同じ大きさなので、様式と突き合わせた線がここで動くと
 * 突き合わせの結果がそのぶん狂う。数が増えていないかを回帰テストで見張る。
 */
export function snapDrift({ xs, ys, placed }: Lattice): SnapDrift[] {
  return placed
    .map(({ c, cs, ce, rs, re }) => ({
      cell: c,
      drift: Math.max(
        Math.abs(xs[cs - 1]! - c.left), Math.abs(xs[ce - 1]! - (c.left + c.width)),
        Math.abs(ys[rs - 1]! - c.top), Math.abs(ys[re - 1]! - (c.top + c.height)),
      ),
    }))
    .filter((d) => d.drift > 1e-9)
    .sort((a, b) => b.drift - a.drift);
}

/**
 * 文字が入らない細さ（％）。用紙の描画幅は 700〜800px 程度なので、
 * 幅1％（≒7px）・高さ0.5％（≒5px）を下回るセルには文字も入力も置けない。
 */
const RULE_W = 1;
const RULE_H = 0.5;

/**
 * 細すぎるのに罫線セル（`rule`）の印が無いセル。
 *
 * `rule` のセルだけが内側余白を落とす。印を忘れると余白と罫線の合計（＝枠の最小寸法）が
 * 割り当てた幅を超えて、右（下）へ数px はみ出し「様式に無い罫線」として見えてしまう。
 * 細さは「罫線のためのセルのはず」という手がかりに過ぎないので、判定には使わず
 * 印の付け忘れを見張るのにだけ使う。
 */
export function unmarkedRuleCells(cells: readonly GridCell[]): GridCell[] {
  return cells.filter((c) => !c.rule && (c.width < RULE_W || c.height < RULE_H));
}

/**
 * 格子へ寄せた結果、幅か高さが 0 になった罫線セル。
 *
 * 寄せは `SNAP_TOL`（％）以内の端を1本にまとめるので、それより細いセルは前後が同じ線に
 * 落ちて消える。消えたセルの罫線は隣の線と重なって出るため、画面では「線が1本足りない」
 * ではなく「線が少し太い」に見え、様式と並べても気づきにくい。
 *
 * 罫線を持たないセル（文字だけを重ねて置くセル）は潰れても見た目が変わらないので外す。
 */
export function collapsedCells({ placed }: Lattice): PlacedCell[] {
  return placed.filter(({ c, cs, ce, rs, re }) => !c.noBorder && (cs === ce || rs === re));
}

/** 罫線の太さ（px）。太枠と破線は既定値が違う */
export function borderWidthOf(c: GridCell): number {
  return c.borderWidth ?? (c.outline ? 1.5 : c.dashed ? 1 : 0.5);
}

export function borderStyleOf(c: GridCell): 'dashed' | 'solid' {
  return c.dashed ? 'dashed' : 'solid';
}

/** 実際に引かれる罫線1本（位置・区間はいずれも％） */
export interface RuleSegment {
  /** 縦罫線なら x、横罫線なら y */
  pos: number;
  from: number;
  to: number;
  width: number;
  dashed: boolean;
}

export interface RuleSegments {
  /** 縦罫線 */
  v: RuleSegment[];
  /** 横罫線 */
  h: RuleSegment[];
}

/** 同じ位置・同じ太さで、つながっている（または重なっている）線分をまとめる */
function mergeRuns(segs: RuleSegment[]): RuleSegment[] {
  const key = (s: RuleSegment): string => `${s.pos.toFixed(3)}|${s.width}|${s.dashed ? 'd' : 's'}`;
  const groups = new Map<string, RuleSegment[]>();
  for (const s of segs) {
    const list = groups.get(key(s));
    if (list) list.push(s); else groups.set(key(s), [s]);
  }
  const out: RuleSegment[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.from - b.from);
    let cur: RuleSegment | undefined;
    for (const s of list) {
      if (cur && s.from <= cur.to + 1e-6) cur.to = Math.max(cur.to, s.to);
      else { cur = { ...s }; out.push(cur); }
    }
  }
  return out.sort((a, b) => a.pos - b.pos || a.from - b.from);
}

/**
 * セル定義から、画面と紙に実際に出る罫線を取り出す。
 *
 * 位置は格子に寄せた後の値を使う（描画されるのも寄せた後の位置なので）。
 * 隣り合うセルが同じ境目に引く2本は1本にまとめる。
 */
export function ruleSegments(cells: readonly GridCell[]): RuleSegments {
  const { xs, ys, placed } = deriveLattice(cells);
  const v: RuleSegment[] = [];
  const h: RuleSegment[] = [];
  for (const { c, cs, ce, rs, re } of placed) {
    if (c.noBorder) continue;
    const x0 = xs[cs - 1]!, x1 = xs[ce - 1]!, y0 = ys[rs - 1]!, y1 = ys[re - 1]!;
    const w = borderWidthOf(c);
    const dashed = c.dashed === true;
    if (!c.noBorderLeft) v.push({ pos: x0, from: y0, to: y1, width: c.borderLeftWidth ?? w, dashed });
    if (!c.noBorderRight) v.push({ pos: x1, from: y0, to: y1, width: c.borderRightWidth ?? w, dashed });
    // 上罫線だけは個別指定を持たない（GridCell に borderTopWidth が無い）
    if (!c.noBorderTop) h.push({ pos: y0, from: x0, to: x1, width: w, dashed });
    if (!c.noBorderBottom) h.push({ pos: y1, from: x0, to: x1, width: c.borderBottomWidth ?? w, dashed });
  }
  return { v: mergeRuns(v), h: mergeRuns(h) };
}
