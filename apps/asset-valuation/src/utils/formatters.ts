import type { AnyAssetCategory } from '@/domain/types';
import { CATEGORY_CONFIG } from '@/domain/types';

/** 金額を3桁カンマ区切りでフォーマット */
export function formatYen(value: number): string {
  return value.toLocaleString('ja-JP');
}

/** 日付をYYYY/MM/DD形式に変換（Dateも可） */
export function formatDate(value: string | Date): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return typeof value === 'string' ? value : '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

/** 日時を「M/D HH:MM」形式に変換（自動保存の表示用） */
export function formatDateTime(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${m}/${day} ${hh}:${mm}`;
}

/** NOを自然順で比較（2 → 10、230-2 → 230-10）。 */
export function compareAssetNo(a: string, b: string): number {
  const left = a.match(/\d+|\D+/g) ?? [];
  const right = b.match(/\d+|\D+/g) ?? [];
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const x = left[i]!;
    const y = right[i]!;
    if (x === y) continue;
    if (/^\d+$/.test(x) && /^\d+$/.test(y)) {
      // 数値変換せず比較し、長い管理番号でも桁落ちさせない。
      const nx = x.replace(/^0+/, '') || '0';
      const ny = y.replace(/^0+/, '') || '0';
      const diff = nx.length - ny.length || (nx < ny ? -1 : nx > ny ? 1 : 0);
      if (diff !== 0) return diff;
    } else {
      const diff = x.localeCompare(y, 'ja');
      if (diff !== 0) return diff;
    }
  }
  return left.length - right.length;
}

/** 償却額/残価率の表示フォーマット */
export function formatDepreciation(
  category: AnyAssetCategory,
  depreciationAmountOrRate: number
): string {
  const { valuationMethod } = CATEGORY_CONFIG[category];
  if (valuationMethod === 'bookValue' || valuationMethod === 'none') {
    return '−';
  }
  if (valuationMethod === 'building') {
    return formatYen(Math.floor(depreciationAmountOrRate));
  }
  return depreciationAmountOrRate.toFixed(3);
}

/** グループの合計値を算出 */
export function calcGroupTotals(assets: { acquisitionCost: number; evaluationAmount: number | null; bookValue: number }[]) {
  let totalAcquisition = 0;
  let totalEvaluation = 0;
  let totalBookValue = 0;
  for (const a of assets) {
    totalAcquisition += a.acquisitionCost;
    totalEvaluation += a.evaluationAmount ?? 0;
    totalBookValue += a.bookValue;
  }
  return { totalAcquisition, totalEvaluation, totalBookValue };
}
