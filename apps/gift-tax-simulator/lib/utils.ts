/**
 * カンマ区切りフォーマット（円単位）
 */
export const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ja-JP').format(num);
};

/**
 * 万円単位でフォーマット
 */
export const formatMan = (amount: number): string => {
    return `${(amount / 10000).toLocaleString()}万円`;
};

/**
 * パーセントフォーマット（小数点1桁）
 */
export const formatPercent = (num: number): string => {
    return `${(num * 100).toFixed(1)}%`;
};

/**
 * 全角数字を半角に変換し、カンマを除去して数値文字列にする
 */
export const normalizeNumberString = (val: string): string => {
    return val
        .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/,/g, '')
        .replace(/[^0-9]/g, '');
};
