import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableProps } from '@/types/form';

const T = 'table5' as const;

// ── 資産の部・負債の部の繰り返し入力行（空行）を自動生成 ──
const ROWS = 15;            // データ行数（実フォームに合わせて調整可）
const ROW_TOP = 18.06;      // データ1行目の上端%
const TOTAL_TOP = 64.42;    // 合計行の上端%
const PITCH = (TOTAL_TOP - ROW_TOP) / ROWS;

type Col = { left: number; width: number };
const ASSET_COLS: Col[] = [
  { left: 8.51, width: 14.73 },  // 科目
  { left: 22.96, width: 11.87 }, // 相続税評価額
  { left: 34.56, width: 12.14 }, // 帳簿価額
  { left: 46.28, width: 4.91 },  // 備考
];
const LIAB_COLS: Col[] = [
  { left: 50.92, width: 14.32 }, // 科目
  { left: 64.97, width: 11.87 }, // 相続税評価額
  { left: 76.56, width: 12 },    // 帳簿価額
  { left: 88.43, width: 4.91 },  // 備考
];

function dataRows(prefix: string, cols: Col[]): GridCell[] {
  const out: GridCell[] = [];
  for (let r = 0; r < ROWS; r++) {
    const top = +(ROW_TOP + r * PITCH).toFixed(2);
    cols.forEach((c, ci) => {
      out.push({
        field: `${prefix}_${r + 1}_${ci + 1}`,
        kind: 'input',
        top, left: c.left, width: c.width, height: +PITCH.toFixed(2),
        align: ci === 0 ? 'left' : 'right',
      });
    });
  }
  return out;
}

/** 第5表のグリッドセル（ピッカー測定＋空行の自動生成） */
const CELLS: GridCell[] = [
  // ── 外枠・3区分 ──
  { kind: 'cell', top: 8.9, left: 8.64, width: 84.56, height: 85.3 },
  { kind: 'cell', top: 8.9, left: 8.51, width: 84.69, height: 68.63 },
  { kind: 'cell', top: 77.33, left: 8.51, width: 42.69, height: 16.77 },
  { kind: 'cell', top: 77.14, left: 50.92, width: 42.55, height: 17.06 },
  // ── 1. 資産及び負債の金額（タイトル帯） ──
  { kind: 'label', text: '１．資産及び負債の金額（課税時期現在）', top: 8.9, left: 8.64, width: 84.56, height: 3.37, align: 'left' },
  // ── 資産の部 ──
  { kind: 'label', text: '資 産 の 部', top: 12.08, left: 8.51, width: 42.69, height: 3.18 },
  { kind: 'label', text: '科 目', top: 15.16, left: 8.37, width: 14.87, height: 3.28 },
  { kind: 'label', text: '相続税評価額', top: 14.97, left: 22.96, width: 11.87, height: 3.47 },
  { kind: 'label', text: '帳 簿 価 額', top: 14.97, left: 34.56, width: 12.14, height: 3.37 },
  { kind: 'label', text: '備 考', top: 14.97, left: 46.28, width: 4.91, height: 3.28 },
  { kind: 'cell', top: 11.98, left: 8.51, width: 42.82, height: 65.44 },
  ...dataRows('a', ASSET_COLS),
  // ── 資産 合計・㋑㋩㋥ ──
  { kind: 'label', text: '合 計', top: 64.42, left: 8.51, width: 14.73, height: 3.47 },
  { field: '①', kind: 'input', top: 64.42, left: 22.96, width: 11.87, height: 3.47 },
  { field: '②', kind: 'input', top: 64.42, left: 34.56, width: 12.14, height: 3.37 },
  { field: 'a_total_bikou', kind: 'input', top: 64.32, left: 46.28, width: 4.91, height: 3.47 },
  { kind: 'label', text: '株式等の価額の合計額', top: 67.79, left: 8.51, width: 14.59, height: 3.37 },
  { field: 'イ', kind: 'input', top: 67.69, left: 22.96, width: 12, height: 3.47 },
  { field: 'ロ', kind: 'input', top: 67.6, left: 34.56, width: 12, height: 3.47 },
  { field: 'a_kabu_bikou', kind: 'input', top: 67.6, left: 46.28, width: 4.91, height: 3.57 },
  { kind: 'label', text: '土地等の価額の合計額', top: 71.07, left: 8.51, width: 14.87, height: 3.28 },
  { field: 'ハ', kind: 'input', top: 70.97, left: 22.96, width: 12, height: 3.37 },
  { kind: 'cell', diagonal: 'tlbr', top: 70.68, left: 34.69, width: 11.87, height: 3.57 },
  { field: 'a_tochi_bikou', kind: 'input', top: 70.87, left: 46.42, width: 4.91, height: 3.47 },
  { kind: 'label', text: '現物出資等受入れ資産の価額の合計額', top: 74.25, left: 8.64, width: 14.46, height: 3.28 },
  { field: 'ニ', kind: 'input', top: 74.15, left: 22.96, width: 11.87, height: 3.28 },
  { field: 'ホ', kind: 'input', top: 74.05, left: 34.69, width: 11.87, height: 3.37 },
  { field: 'a_genbutsu_bikou', kind: 'input', top: 74.15, left: 46.42, width: 4.77, height: 3.37 },
  // ── 負債の部 ──
  { kind: 'cell', top: 11.98, left: 50.92, width: 42.28, height: 55.9 },
  { kind: 'label', text: '負 債 の 部', top: 12.08, left: 50.92, width: 42.28, height: 3.28 },
  { kind: 'label', text: '科 目', top: 14.97, left: 51.06, width: 14.18, height: 3.47 },
  { kind: 'label', text: '相続税評価額', top: 15.07, left: 64.97, width: 12, height: 3.28 },
  { kind: 'label', text: '帳 簿 価 額', top: 15.16, left: 76.56, width: 12.14, height: 3.18 },
  { kind: 'label', text: '備 考', top: 15.16, left: 88.43, width: 4.91, height: 3.18 },
  ...dataRows('l', LIAB_COLS),
  // ── 負債 合計 ──
  { kind: 'label', text: '合 計', top: 64.42, left: 51.06, width: 14.32, height: 3.28 },
  { field: '③', kind: 'input', top: 64.42, left: 65.24, width: 11.73, height: 3.37 },
  { field: '④', kind: 'input', top: 64.51, left: 76.7, width: 11.87, height: 3.47 },
  { field: 'l_total_bikou', kind: 'input', top: 64.32, left: 88.43, width: 4.77, height: 3.47 },
  // 負債側・合計下の未使用領域（資産側の株式等/土地等/現物出資に対応）に黒斜線
  { kind: 'cell', diagonal: 'bltr', top: 67.79, left: 50.92, width: 42.28, height: 9.35 },
  // ── 2. 評価差額に対する法人税額等相当額の計算 ──
  { kind: 'label', text: '２．評価差額に対する法人税額等相当額の計算', top: 77.52, left: 8.64, width: 42.69, height: 3.37, align: 'left' },
  { kind: 'label', text: '相続税評価額による純資産価額（①－③）', top: 80.8, left: 8.37, width: 26.73, height: 3.47, align: 'left' },
  { field: '⑤', kind: 'input', top: 80.8, left: 34.69, width: 16.5, height: 3.37 },
  { kind: 'label', text: '帳簿価額による純資産価額（(②＋(ニ－ホ)－④)、マイナスの場合は０）', top: 83.98, left: 8.37, width: 26.59, height: 3.57, align: 'left' },
  { field: '⑥', kind: 'input', top: 84.08, left: 34.69, width: 16.5, height: 3.47 },
  { kind: 'label', text: '評価差額に相当する金額（⑤－⑥、マイナスの場合は０）', top: 87.36, left: 8.51, width: 26.46, height: 3.47, align: 'left' },
  { field: '⑦', kind: 'input', top: 87.26, left: 34.56, width: 16.64, height: 3.66 },
  { kind: 'label', text: '評価差額に対する法人税額等相当額（⑦×37％）', top: 90.63, left: 8.51, width: 26.46, height: 3.57, align: 'left' },
  { field: '⑧', kind: 'input', top: 90.63, left: 34.56, width: 16.64, height: 3.57 },
  // ── 3. 1株当たりの純資産価額の計算 ──
  { kind: 'label', text: '３．１株当たりの純資産価額の計算', top: 77.33, left: 50.78, width: 42.55, height: 3.57, align: 'left' },
  { kind: 'label', text: '課税時期現在の純資産価額（相続税評価額）（⑤－⑧）', top: 80.71, left: 51.06, width: 25.78, height: 3.57, align: 'left' },
  { field: '⑨', kind: 'input', top: 80.8, left: 76.56, width: 16.78, height: 3.47 },
  { kind: 'label', text: '課税時期現在の発行済株式数（(第１表の１の①)－自己株式数)', top: 84.08, left: 51.19, width: 25.64, height: 3.47, align: 'left' },
  { field: '⑩', kind: 'input', top: 83.98, left: 76.7, width: 16.78, height: 3.57 },
  { kind: 'label', text: '課税時期現在の1株当たりの純資産価額（相続税評価額）（⑨÷⑩）', top: 87.26, left: 51.06, width: 25.64, height: 3.66, align: 'left' },
  { field: '⑪', kind: 'input', top: 87.36, left: 76.56, width: 16.78, height: 3.57 },
  { kind: 'label', text: '同族株主等の議決権割合（第１表の１の⑤の割合）が50％以下の場合（⑪×80％）', top: 90.83, left: 51.06, width: 25.91, height: 3.28, align: 'left' },
  { field: '⑫', kind: 'input', top: 90.83, left: 76.7, width: 16.64, height: 3.37 },
];

/** 第5表（CSSグリッド方式・完成版） */
export function Table5Grid({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  return <GridForm cells={CELLS} g={g} u={u} width="100%" title="第５表　１株当たりの純資産価額（相続税評価額）の計算明細書" />;
}
