/**
 * ユーティリティ: カンマ区切りフォーマット
 */
export const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ja-JP').format(num);
};

/**
 * ユーティリティ: パーセントフォーマット
 */
export const formatPercent = (num: number): string => {
    return (num * 100).toFixed(1) + '%';
};

/**
 * 全角数字を半角に変換し、カンマを除去して数値文字列にする
 */
export const normalizeNumberString = (val: string): string => {
    // 1. 全角数字を半角に変換
    let normalized = val.replace(/[０-９]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    // 2. カンマを除去
    normalized = normalized.replace(/,/g, '');

    // 3. 数字以外を削除
    normalized = normalized.replace(/[^0-9]/g, '');

    return normalized;
};
