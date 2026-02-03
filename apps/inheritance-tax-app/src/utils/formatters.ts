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
