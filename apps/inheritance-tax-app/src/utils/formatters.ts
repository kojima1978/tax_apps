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

/** 差額に応じた色クラス（invert=trueで税額など「減った方が良い」項目用） */
export function deltaColor(diff: number, invert = false): string {
  const positive = invert ? diff < 0 : diff > 0;
  const negative = invert ? diff > 0 : diff < 0;
  if (positive) return 'text-green-700';
  if (negative) return 'text-red-600';
  return 'text-gray-500';
}
