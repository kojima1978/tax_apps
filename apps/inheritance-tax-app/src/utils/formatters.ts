/**
 * 金額を「X億Y万円」形式にフォーマット
 * @param value 金額（万円単位）
 * @returns フォーマットされた金額文字列
 */
export function formatCurrency(value: number): string {
  const oku = Math.floor(value / 10000);
  const man = value % 10000;

  if (oku > 0 && man > 0) {
    return `${oku}億${man.toLocaleString()}万円`;
  } else if (oku > 0) {
    return `${oku}億円`;
  } else {
    return `${man.toLocaleString()}万円`;
  }
}

/**
 * パーセント表示にフォーマット
 * @param value パーセント値
 * @param decimals 小数点以下の桁数（デフォルト: 2）
 * @returns フォーマットされたパーセント文字列
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/** 差額を符号付きフォーマット（+1,000万円 / −500万円 / ±0） */
export function formatDelta(diff: number): string {
  if (diff > 0) return `+${formatCurrency(diff)}`;
  if (diff < 0) return `−${formatCurrency(Math.abs(diff))}`;
  return '±0';
}

/** 差額をフォーマット（増加=＋ / 減少=ー） */
export function formatDeltaArrow(diff: number): string {
  if (diff > 0) return `＋ ${formatCurrency(diff)}`;
  if (diff < 0) return `ー ${formatCurrency(Math.abs(diff))}`;
  return '±0';
}

/** 節税額をフォーマット（節税=ー / 増税=＋） */
export function formatSavingArrow(diff: number): string {
  if (diff > 0) return `ー ${formatCurrency(diff)}`;
  if (diff < 0) return `＋ ${formatCurrency(Math.abs(diff))}`;
  return '±0';
}

/**
 * 小数の比率を分数文字列に変換（法定相続分の表示用）
 * @param ratio 比率（例: 0.5, 0.25, 0.333...）
 * @returns 分数文字列（例: "1/2", "1/4", "1/3"）
 */
export function formatFraction(ratio: number): string {
  if (ratio === 1) return '1';
  if (ratio === 0) return '0';

  const maxDenom = 100;
  let bestNum = 1;
  let bestDen = 1;
  let bestErr = Math.abs(ratio - 1);

  for (let d = 1; d <= maxDenom; d++) {
    const n = Math.round(ratio * d);
    if (n > 0) {
      const err = Math.abs(ratio - n / d);
      if (err < bestErr) {
        bestErr = err;
        bestNum = n;
        bestDen = d;
      }
      if (err < 1e-9) break;
    }
  }

  const g = gcd(bestNum, bestDen);
  return `${bestNum / g}/${bestDen / g}`;
}

function gcd(a: number, b: number): number {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** 差額に応じた色クラス（invert=trueで税額など「減った方が良い」項目用） */
export function deltaColor(diff: number, invert = false): string {
  const positive = invert ? diff < 0 : diff > 0;
  const negative = invert ? diff > 0 : diff < 0;
  if (positive) return 'text-green-700';
  if (negative) return 'text-red-600';
  return 'text-gray-500';
}
