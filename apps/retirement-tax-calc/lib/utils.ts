/**
 * カンマ区切りフォーマット（円単位）
 */
export const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat("ja-JP").format(num);
};

/**
 * カンマ区切り + 円（表示用）
 */
export const formatYen = (num: number): string => `${formatCurrency(num)}円`;

/**
 * 全角数字を半角に変換し、カンマを除去して数値文字列にする
 */
export const normalizeNumberString = (val: string): string => {
    return val
        .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/,/g, "")
        .replace(/[^0-9]/g, "");
};

/**
 * 入力値をカンマ区切りにフォーマットする（フォーム入力用）
 */
export const formatInputValue = (val: string | number | null | undefined): string => {
    if (val === "" || val === null || val === undefined) return "";
    const str = normalizeNumberString(String(val));
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * カンマ区切りフォーマット済み文字列を数値にパースする
 */
export const parseFormattedNumber = (val: string): number => {
    if (!val) return 0;
    const normalized = normalizeNumberString(val);
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
};

/**
 * input[type="number"] の値を非負整数にパースする
 */
export const parseIntInput = (val: string): number => Math.max(0, parseInt(val) || 0);

/**
 * 日付を「YYYY年M月D日」形式にフォーマットする
 */
export const formatJapaneseDate = (date: Date): string =>
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
