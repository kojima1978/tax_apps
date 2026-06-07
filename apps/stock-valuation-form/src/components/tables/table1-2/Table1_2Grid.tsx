import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableProps } from '@/types/form';

const T = 'table1_2' as const;

/** 第1表の2のグリッドセル（ピッカーで測定・確定したもの／ピッカー出力をそのまま保存） */
const CELLS: GridCell[] = [
  // ── 外枠・区分 ──
  { kind: 'cell', text: '', top: 8.9, left: 9.05, width: 85.51, height: 82.99 },
  { kind: 'label', text: '３．会社の規模（Ｌの割合）の判定', top: 8.9, left: 8.92, width: 85.65, height: 2.7 },
  { kind: 'cell', text: '', top: 11.4, left: 8.92, width: 85.65, height: 17.93 },
  { kind: 'cell', text: '', top: 29.04, left: 8.92, width: 85.65, height: 39.52 },
  { kind: 'cell', text: '', top: 68.37, left: 8.92, width: 85.65, height: 7.71 },
  { kind: 'cell', text: '', top: 75.79, left: 8.92, width: 85.51, height: 16.1 },
  { kind: 'label', text: '４．増（減）資の状況その他評価上の参考事項', top: 75.79, left: 9.05, width: 85.38, height: 2.8 },
  { field: 'f8', kind: 'input', top: 78.49, left: 8.92, width: 85.65, height: 13.4 },
  // ── 判定（大会社/中会社Lの割合/小会社） ──
  { kind: 'label', text: '判定', top: 68.27, left: 8.92, width: 2.73, height: 7.71 },
  { kind: 'label', text: '大会社', top: 68.27, left: 11.37, width: 12.41, height: 7.61 },
  { kind: 'label', text: '中会社', top: 68.37, left: 23.51, width: 22.3, height: 2.8 },
  { kind: 'label', text: 'Lの割合', top: 70.87, left: 23.57, width: 22.3, height: 2.7 },
  { kind: 'label', text: '0.90', top: 73.48, left: 23.51, width: 8.05, height: 2.51 },
  { kind: 'label', text: '0.75', top: 73.38, left: 31.28, width: 7.5, height: 2.6 },
  { kind: 'label', text: '0.60', top: 73.38, left: 38.51, width: 7.36, height: 2.6 },
  { kind: 'label', text: '小会社', top: 68.37, left: 45.6, width: 15.27, height: 7.61 },
  { kind: 'cell', diagonal: 'bltr', top: 68.46, left: 60.6, width: 33.96, height: 7.61 },
  // ── 判定要素（総資産価額・取引金額・従業員数） ──
  { kind: 'label', text: '判定要素', top: 11.4, left: 8.92, width: 2.59, height: 17.83 },
  { kind: 'label', text: '項目', top: 11.4, left: 11.23, width: 14.18, height: 2.7 },
  { kind: 'label', text: '金額', top: 11.4, left: 25.28, width: 20.59, height: 2.7 },
  { kind: 'label', text: '直前期末の総資産価額(帳 簿 価 額)', top: 13.91, left: 11.37, width: 14.05, height: 7.52 },
  { field: 'f22', kind: 'input', top: 13.81, left: 25.14, width: 20.73, height: 7.71 },
  { kind: 'label', text: '直前期末以前１年間の取引金額', top: 21.34, left: 11.23, width: 14.18, height: 7.9 },
  { field: 'f24', kind: 'input', top: 21.33, left: 25.28, width: 20.46, height: 7.81 },
  { kind: 'label', text: '項目', top: 11.4, left: 45.6, width: 15.14, height: 2.7 },
  { kind: 'label', text: '直前期末以前１年間に お け る 従 業 員 数', top: 13.81, left: 45.74, width: 15, height: 15.42 },
  { kind: 'label', text: '人数', top: 11.31, left: 60.47, width: 34.1, height: 2.89 },
  { field: 'f28', kind: 'input', top: 13.81, left: 60.47, width: 33.96, height: 15.42 },
  // ── 判定基準（マトリクス） ──
  { kind: 'label', text: '判定基準', top: 29.14, left: 9.05, width: 2.45, height: 39.32 },
  { kind: 'label', text: '㋣直前期末以前１年間における従業員数に応ずる区分', top: 29.04, left: 11.23, width: 37.64, height: 5.01 },
  { kind: 'label', text: '70人以上の会社は、大会社(㋠及び㋷は不要）', top: 29.04, left: 48.6, width: 45.82, height: 2.51 },
  { kind: 'label', text: '70人未満の会社は、㋠及び㋷により判定', top: 31.36, left: 48.6, width: 45.96, height: 2.8 },
  { kind: 'label', text: '㋠直前期末の総資産価額（帳簿価額）及び直前期末以前１年間における従業員数に応ずる区分', top: 33.86, left: 11.23, width: 41.32, height: 3.95 },
  { kind: 'label', text: '㋷直前期末以前１年間の取引金額に応ずる区分', top: 33.96, left: 52.42, width: 29.87, height: 3.86 },
  { kind: 'label', text: '総 資 産 価 額 ( 帳 簿 価 額 ）', top: 37.62, left: 11.23, width: 29.87, height: 2.6 },
  { kind: 'label', text: '卸 売 業', top: 40.03, left: 11.37, width: 9.99, height: 5.2 },
  { kind: 'label', text: '小売・サービス業', top: 40.13, left: 21.05, width: 10.37, height: 5.11 },
  { kind: 'label', text: '卸売業、小売・サービス業以外', top: 40.03, left: 31.15, width: 9.96, height: 5.2 },
  { kind: 'label', text: '従 業 員 数', top: 37.62, left: 40.83, width: 11.73, height: 7.61 },
  { kind: 'label', text: '取　　　　引　　　　金　　　　額', top: 37.53, left: 52.28, width: 30, height: 2.7 },
  { kind: 'label', text: '卸 売 業', top: 40.03, left: 52.42, width: 9.82, height: 5.2 },
  { kind: 'label', text: '小売・サービス業', top: 40.03, left: 61.97, width: 9.96, height: 5.2 },
  { kind: 'label', text: '卸売業、小売・サービス業以外', top: 40.13, left: 71.79, width: 10.5, height: 5.01 },
  { kind: 'label', text: '会社規模とＬの割合（中会社）の区分', top: 33.96, left: 82.02, width: 12.41, height: 11.18 },
  // 大会社 行
  { kind: 'label', text: ' 20億円以上', top: 45.04, left: 11.23, width: 10.09, height: 2.51 },
  { kind: 'label', text: '15億円以上', top: 44.95, left: 21.05, width: 10.37, height: 2.7 },
  { kind: 'label', text: '15億円以上', top: 45.04, left: 31.15, width: 9.96, height: 2.6 },
  { kind: 'label', text: ' 35　人　超', top: 44.95, left: 40.83, width: 11.73, height: 2.7 },
  { kind: 'label', text: '30億円以上', top: 45.04, left: 52.28, width: 9.96, height: 2.6 },
  { kind: 'label', text: '20億円以上', top: 44.95, left: 61.97, width: 9.96, height: 2.7 },
  { kind: 'label', text: '15億円以上', top: 45.04, left: 71.79, width: 10.64, height: 2.6 },
  { kind: 'label', text: '大 会 社', top: 45.04, left: 82.02, width: 12.41, height: 2.51 },
  // 中会社 0.90 行
  { kind: 'label', text: '４億円以上 20億円未満', top: 47.55, left: 11.37, width: 9.96, height: 4.92 },
  { kind: 'label', text: '５億円以上 15億円未満', top: 47.45, left: 21.05, width: 10.23, height: 5.01 },
  { kind: 'label', text: '５億円以上 15億円未満', top: 47.36, left: 31.15, width: 9.96, height: 5.2 },
  { kind: 'label', text: '35　人　超', top: 47.45, left: 40.83, width: 11.73, height: 5.01 },
  { kind: 'label', text: '７億円以上30億円未満', top: 47.45, left: 52.28, width: 9.96, height: 5.01 },
  { kind: 'label', text: '５億円以上20億円未満', top: 47.36, left: 61.97, width: 9.82, height: 5.11 },
  { kind: 'label', text: '４億円以上15億円未満', top: 47.45, left: 71.65, width: 10.5, height: 5.01 },
  { kind: 'label', text: '0.90', top: 47.45, left: 82.02, width: 9.96, height: 5.11 },
  // 中会社 0.75 行
  { kind: 'label', text: '２億円以上４億円未満', top: 52.37, left: 11.23, width: 10.09, height: 4.92 },
  { kind: 'label', text: ' 2億5,000万円以上５億円未満', top: 52.37, left: 21.05, width: 10.23, height: 5.01 },
  { kind: 'label', text: '2億5,000万円以上５億円未満', top: 52.37, left: 31.15, width: 10.09, height: 5.01 },
  { kind: 'label', text: '20　人　超 35 人 以 下', top: 52.37, left: 40.83, width: 11.73, height: 5.01 },
  { kind: 'label', text: '3億5,000万円以上７億円未満', top: 52.37, left: 52.42, width: 9.82, height: 5.01 },
  { kind: 'label', text: '2億5,000万円以上５億円未満', top: 52.27, left: 61.97, width: 9.96, height: 5.2 },
  { kind: 'label', text: '２億円以上４億円未満', top: 52.18, left: 71.65, width: 10.64, height: 5.2 },
  { kind: 'label', text: '0.75', top: 52.37, left: 82.02, width: 9.96, height: 5.11 },
  { kind: 'label', text: '中会社', top: 47.36, left: 91.7, width: 2.86, height: 15.04 },
  // 中会社 0.60 行（様式の確定値で補完）
  { kind: 'label', text: '7,000万円以上 2億円未満', top: 57.38, left: 11.23, width: 10.09, height: 4.92 },
  { kind: 'label', text: '4,000万円以上 2億5,000万円未満', top: 57.38, left: 21.05, width: 10.23, height: 4.92 },
  { kind: 'label', text: '5,000万円以上 2億5,000万円未満', top: 57.38, left: 31.15, width: 10.09, height: 4.92 },
  { kind: 'label', text: '5　人　超 20 人 以 下', top: 57.38, left: 40.83, width: 11.73, height: 4.92 },
  { kind: 'label', text: '2億円以上 3億5,000万円未満', top: 57.38, left: 52.42, width: 9.82, height: 4.92 },
  { kind: 'label', text: '6,000万円以上 2億5,000万円未満', top: 57.38, left: 61.97, width: 9.96, height: 4.92 },
  { kind: 'label', text: '8,000万円以上 2億円未満', top: 57.38, left: 71.65, width: 10.64, height: 4.92 },
  { kind: 'label', text: '0.60', top: 57.38, left: 82.02, width: 9.96, height: 4.92 },
  // 小会社 行
  { kind: 'label', text: '7,000万円未満', top: 62.3, left: 11.23, width: 10.09, height: 2.6 },
  { kind: 'label', text: ' 4,000万円未満', top: 62.2, left: 21.05, width: 10.37, height: 2.7 },
  { kind: 'label', text: ' 5,000万円未満', top: 62.2, left: 31.15, width: 9.96, height: 2.7 },
  { kind: 'label', text: '５ 人 以 下', top: 62.2, left: 40.83, width: 11.73, height: 2.7 },
  { kind: 'label', text: '２億円未満 ', top: 62.3, left: 52.28, width: 9.82, height: 2.6 },
  { kind: 'label', text: '6,000万円未満', top: 62.3, left: 61.97, width: 9.82, height: 2.6 },
  { kind: 'label', text: ' 8,000万円未満', top: 62.2, left: 71.65, width: 10.64, height: 2.7 },
  { kind: 'label', text: '小 会 社', top: 62.3, left: 82.02, width: 12.41, height: 2.51 },
  // 脚注
  { kind: 'label', text: '・「会社規模とＬの割合（中会社）の区分」欄は、チ欄の区分（「総資産価額（帳簿価額）」と「従業員数」とのいずれか下位の区分）とリ欄（取引金額）の区分とのいずれか上位の区分により判定します。', top: 64.8, left: 11.23, width: 83.19, height: 3.66 },
];

/** 第1表の2（CSSグリッド方式・完成版） */
export function Table1_2Grid({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  return <GridForm cells={CELLS} g={g} u={u} width="100%" title="第１表の２　評価上の株主の判定及び会社規模の判定の明細書（続）" />;
}
