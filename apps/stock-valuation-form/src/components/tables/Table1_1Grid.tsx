import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableProps } from '@/types/form';

const T = 'table1_1' as const;

// ── 株主テーブルの繰り返し行を自動生成 ──
const SH_ROWS = 10;          // 株主行数（実フォームに合わせて調整可）
const SH_TOP = 33.96;        // 1行目の上端%
const SH_SELF = 76.37;       // 自己株式行の上端（データ行はここまで）
const SH_PITCH = (SH_SELF - SH_TOP) / SH_ROWS;

type Col = { left: number; width: number };
const SH_COLS: Col[] = [
  { left: 10.14, width: 11.05 }, // 氏名又は名称
  { left: 20.92, width: 4.91 },  // 続柄
  { left: 25.69, width: 7.91 },  // 会社における役職名
  { left: 33.4, width: 9.07 },   // ㋑株式数
  { left: 42.19, width: 8.66 },  // ㋺議決権数
  { left: 50.66, width: 8.7 },   // ㋩議決権割合
];

function shareholderRows(): GridCell[] {
  const out: GridCell[] = [];
  for (let r = 0; r < SH_ROWS; r++) {
    const top = +(SH_TOP + r * SH_PITCH).toFixed(2);
    const height = +SH_PITCH.toFixed(2);
    SH_COLS.forEach((c, ci) => {
      if (r === 0 && ci === 1) {
        // 1行目の続柄欄は「納税義務者」固定
        out.push({ kind: 'label', text: '納税義務者', top, left: c.left, width: c.width, height, fontSize: 8 });
      } else {
        out.push({ field: `sh_${r + 1}_${ci + 1}`, kind: 'input', top, left: c.left, width: c.width, height, align: ci <= 2 ? 'left' : 'right' });
      }
    });
  }
  return out;
}

/** 第1表の1のグリッドセル（ピッカーで測定・確定したもの／ピッカー出力をそのまま保存） */
const CELLS: GridCell[] = [
  // ── 外枠・区分 ──
  { kind: 'cell', text: '', top: 8.61, left: 8.37, width: 85.24, height: 83.28 },
  { kind: 'cell', text: '', top: 8.61, left: 8.23, width: 85.24, height: 18.22 },
  { kind: 'cell', text: '', top: 26.83, left: 8.23, width: 51.28, height: 65.06 },
  { kind: 'cell', text: '', top: 26.73, left: 59.24, width: 34.23, height: 19.28 },
  { kind: 'cell', text: '', top: 45.81, left: 58.97, width: 34.64, height: 8.1 },
  { kind: 'cell', text: '', top: 53.72, left: 59.1, width: 34.51, height: 28.14 },
  { kind: 'cell', diagonal: 'bltr', top: 81.57, left: 59.24, width: 34.37, height: 10.41 },
  // ── 会社情報ヘッダー（左） ──
  { kind: 'label', text: '会 社 名', top: 8.61, left: 8.23, width: 13.09, height: 5.2 },
  { kind: 'label', text: '代 表 者 氏 名', top: 13.72, left: 8.23, width: 12.96, height: 3.47 },
  { kind: 'label', text: '課 税 時 期', top: 16.9, left: 8.1, width: 13.09, height: 5.2, fontSize: 9 },
  { kind: 'label', text: '直 前 期', top: 21.81, left: 8.1, width: 13.23, height: 5.11, fontSize: 9 },
  { field: 'f12', kind: 'input', top: 8.61, left: 21.05, width: 29.87, height: 5.2 },
  { field: 'f13', kind: 'input', top: 13.72, left: 20.92, width: 29.87, height: 3.47 },
  { field: 'f14', kind: 'input', date: true, top: 17.09, left: 21.05, width: 29.87, height: 5.01 },
  { field: 'f15', kind: 'input', dateRange: true, top: 22.01, left: 20.92, width: 29.87, height: 4.92 },
  // ── 会社情報ヘッダー（右：本店所在地・事業内容） ──
  { kind: 'label', text: '本店の所在地', top: 8.61, left: 50.65, width: 8.86, height: 5.2 },
  { kind: 'label', text: '事　業\n内　容', top: 13.81, left: 50.65, width: 8.86, height: 13.01 },
  { field: 'f18', kind: 'input', top: 8.42, left: 59.51, width: 34.1, height: 5.49 },
  { kind: 'label', text: '取扱品目及び製造、卸売、小売等の区分', top: 13.72, left: 59.24, width: 18.28, height: 3.47 },
  { kind: 'label', text: '業 種 目番号', top: 13.81, left: 77.38, width: 7.64, height: 3.28 },
  { kind: 'label', text: '取引金額の\n構成比', top: 13.72, left: 84.88, width: 8.59, height: 3.28 },
  { field: 'f22', kind: 'input', top: 17.09, left: 59.24, width: 18.28, height: 2.6 },
  { field: 'f23', kind: 'input', top: 17, left: 77.24, width: 7.77, height: 2.6 },
  { field: 'f24', kind: 'input', top: 17, left: 84.74, width: 8.73, height: 2.6 },
  { field: 'f25', kind: 'input', top: 19.6, left: 59.38, width: 18.14, height: 2.41 },
  { field: 'f26', kind: 'input', top: 19.5, left: 77.38, width: 7.64, height: 2.51 },
  { field: 'f27', kind: 'input', top: 19.4, left: 84.74, width: 8.86, height: 2.7 },
  { field: 'f28', kind: 'input', top: 22.01, left: 59.38, width: 18.14, height: 2.51 },
  { field: 'f29', kind: 'input', top: 21.91, left: 77.24, width: 7.77, height: 2.6 },
  { field: 'f30', kind: 'input', top: 21.91, left: 85.02, width: 8.59, height: 2.51 },
  { field: 'f31', kind: 'input', top: 24.42, left: 59.24, width: 18.28, height: 2.41 },
  { field: 'f32', kind: 'input', top: 24.42, left: 77.38, width: 7.64, height: 2.41 },
  { field: 'f33', kind: 'input', top: 24.32, left: 84.88, width: 8.46, height: 2.6 },
  // ── 1. 株主及び評価方式の判定（株主テーブル） ──
  { kind: 'label', text: '１．株主及び評価方式の判定', top: 26.63, left: 8.1, width: 51.42, height: 4.05 },
  { kind: 'label', text: '判定要素（課税時期現在の株式等の所在状況）', top: 30.49, left: 8.1, width: 2.45, height: 61.4 },
  { kind: 'label', text: '氏名又は名称', top: 30.39, left: 10.14, width: 11.05, height: 3.76 },
  { kind: 'label', text: '続 柄', top: 30.49, left: 20.92, width: 4.91, height: 3.76 },
  { kind: 'label', text: '会社における 役 職 名', top: 30.39, left: 25.69, width: 7.91, height: 3.86 },
  { kind: 'label', text: '㋑株 式 数（株式の種類）', top: 30.39, left: 33.33, width: 9, height: 3.86 },
  { kind: 'label', text: '㋺議 決 権 数', top: 30.39, left: 42.19, width: 8.73, height: 3.86 },
  { kind: 'label', text: '㋩議決権割合( ㋺ /④)', top: 30.39, left: 50.78, width: 8.73, height: 3.76 },
  // 株主データ行（自動生成・1行目続柄=納税義務者）
  ...shareholderRows(),
  // 自己株式行
  { kind: 'label', text: '自己株式', top: 76.37, left: 10.28, width: 10.77, height: 3.47 },
  { kind: 'cell', diagonal: 'bltr', top: 76.46, left: 20.92, width: 5.18, height: 3.37 },
  { kind: 'cell', diagonal: 'bltr', top: 76.56, left: 25.83, width: 7.91, height: 3.28 },
  { field: 'f63', kind: 'input', top: 76.37, left: 33.46, width: 8.86, height: 3.47 },
  { kind: 'cell', diagonal: 'bltr', top: 76.46, left: 42.06, width: 8.86, height: 3.37 },
  { kind: 'cell', diagonal: 'bltr', top: 76.46, left: 50.65, width: 8.73, height: 3.28 },
  // 合計行（②⑤ / ③⑥ / ①④）
  { kind: 'label', text: '納税義務者の属する同族関係者グループの議決権の合計数', top: 79.64, left: 10.42, width: 23.32, height: 4.24 },
  { kind: 'cell', diagonal: 'bltr', top: 79.64, left: 33.33, width: 9, height: 4.24 },
  { field: '②', kind: 'input', top: 79.64, left: 42.19, width: 8.59, height: 4.14 },
  { field: '⑤', kind: 'input', top: 79.64, left: 50.65, width: 8.86, height: 4.24 },
  { kind: 'label', text: '筆頭株主グループの議決権の合計数', top: 83.79, left: 10.28, width: 23.32, height: 4.05 },
  { kind: 'cell', diagonal: 'bltr', top: 83.69, left: 33.33, width: 8.86, height: 4.05 },
  { field: '③', kind: 'input', top: 83.69, left: 42.19, width: 8.73, height: 4.14 },
  { field: '⑥', kind: 'input', top: 83.69, left: 50.51, width: 8.86, height: 4.14 },
  { kind: 'label', text: '評価会社の発行済株式又は議決権の総数', top: 87.64, left: 10.28, width: 23.32, height: 4.14 },
  { field: '①', kind: 'input', top: 87.64, left: 33.33, width: 9.14, height: 4.14 },
  { field: '④', kind: 'input', top: 87.74, left: 42.19, width: 8.59, height: 4.05 },
  { kind: 'label', text: '100', top: 87.64, left: 50.65, width: 8.59, height: 4.14 },
  // ── 判定基準・判定マトリクス（右上） ──
  { kind: 'label', text: '判定基準', top: 26.83, left: 59.38, width: 1.77, height: 19.08 },
  { kind: 'label', text: '納税義務者の属する同族関係者グループの議決権割合（⑤の割合）を基として、区分します。', top: 26.92, left: 60.88, width: 32.87, height: 3.66 },
  { kind: 'label', text: '区分', top: 30.49, left: 60.88, width: 1.5, height: 7.81 },
  { kind: 'label', text: '筆頭株主グループの議決権割合（⑥の割合）', top: 30.49, left: 62.38, width: 22.78, height: 3.76 },
  { kind: 'label', text: '５０％超の場 合', top: 33.96, left: 62.38, width: 7.77, height: 4.24 },
  { kind: 'label', text: '３０%以上５０%以 下 の 場 合', top: 33.96, left: 69.88, width: 7.64, height: 4.24 },
  { kind: 'label', text: '３０％未満の場 合', top: 33.96, left: 77.38, width: 7.77, height: 4.24 },
  { kind: 'label', text: '株主の区分', top: 30.39, left: 84.88, width: 8.59, height: 7.81 },
  { kind: 'label', text: '⑤の割合', top: 38.01, left: 60.88, width: 1.64, height: 8 },
  { kind: 'label', text: '５０％超', top: 38.1, left: 62.38, width: 7.64, height: 4.05 },
  { kind: 'label', text: '３０％以上', top: 38.01, left: 69.88, width: 7.64, height: 4.05 },
  { kind: 'label', text: '１５％以上', top: 37.91, left: 77.38, width: 7.64, height: 4.24 },
  { kind: 'label', text: ' 同族株主等', top: 38.01, left: 84.88, width: 8.59, height: 4.05 },
  { kind: 'label', text: '５０％未満', top: 41.86, left: 62.38, width: 7.77, height: 4.14 },
  { kind: 'label', text: '３０％未満', top: 41.96, left: 69.88, width: 7.64, height: 4.05 },
  { kind: 'label', text: '１５％未満', top: 42.06, left: 77.24, width: 7.77, height: 3.86 },
  { kind: 'label', text: '同族株主等 以外の株主', top: 41.96, left: 84.88, width: 8.59, height: 4.05 },
  { kind: 'label', text: '判定', top: 45.91, left: 59.38, width: 1.64, height: 7.9 },
  { kind: 'label', text: '同 族 株 主 等 (原則的評価方式等)', top: 45.81, left: 60.88, width: 16.64, height: 4.24 },
  { kind: 'label', text: '同族株主等以外の株主（配 当 還 元 方 式）', top: 45.81, left: 77.38, width: 16.09, height: 4.24 },
  { kind: 'label', text: '｢同族株主等に該当する納税義務者のうち、議決権割合( ㋩ の割合）が５％未満の者の評価方式は、「２．少数株式所有者の評価方式の判定」欄により判定します。', top: 49.77, left: 60.74, width: 32.87, height: 4.24 },
  // ── 2. 少数株式所有者の評価方式の判定（右下） ──
  { kind: 'label', text: '２．少数株式所有者の評価方式の判定', top: 53.72, left: 59.38, width: 34.23, height: 4.14 },
  { kind: 'label', text: '判定要素', top: 57.77, left: 59.24, width: 1.91, height: 20.43 },
  { kind: 'label', text: '項 目', top: 57.57, left: 60.74, width: 9.41, height: 4.14 },
  { kind: 'label', text: '判 定 内 容', top: 57.77, left: 70.01, width: 23.46, height: 3.95 },
  { kind: 'label', text: '氏 名', top: 61.52, left: 60.88, width: 9.14, height: 3.95 },
  { field: 'f6', kind: 'input', top: 61.52, left: 69.74, width: 23.87, height: 4.05 },
  { kind: 'label', text: '㊁役 員', top: 65.28, left: 60.88, width: 9.27, height: 4.05 },
  { kind: 'label', text: 'である（原則的評 価方式等）・でない（次の㋭へ)', top: 65.28, left: 69.88, width: 23.59, height: 3.95 },
  { kind: 'label', text: '㋭納税義務者が中心的な同族株主', top: 69.33, left: 61.01, width: 9, height: 3.28 },
  { kind: 'label', text: 'である（原則的評 価方式等）・でない（次の㋬へ)', top: 69.04, left: 69.88, width: 23.59, height: 3.76 },
  { kind: 'label', text: '㋬納税義務者以外に中心的な同族株主（又は株主）', top: 72.42, left: 60.88, width: 9.27, height: 5.78 },
  { kind: 'label', text: 'がいる（配当還元方式） ・ がいない（原則的評価 方式等）', top: 72.51, left: 69.88, width: 23.59, height: 5.78 },
  { kind: 'label', text: '判 定', top: 78.2, left: 59.38, width: 10.64, height: 3.57 },
  { kind: 'label', text: '原則的評価方式等　　・　　配当還元方式', top: 78.01, left: 70.01, width: 23.46, height: 3.86 },
];

/** 第1表の1（CSSグリッド方式・完成版） */
export function Table1_1Grid({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  return <GridForm cells={CELLS} g={g} u={u} width="100%" title="第１表の１　評価上の株主の判定及び会社規模の判定の明細書" />;
}
