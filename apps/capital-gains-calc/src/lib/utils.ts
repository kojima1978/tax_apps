const NUMBER_FORMAT = new Intl.NumberFormat('ja-JP');

export function formatCurrency(num: number): string {
    return NUMBER_FORMAT.format(num);
}

export function formatYen(num: number): string {
    return `${NUMBER_FORMAT.format(num)}円`;
}

/**
 * 全角数字を半角に変換し、カンマを除去して数値文字列にする
 */
const normalizeNumberString = (val: string): string => {
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
 * 税率（小数）を百分率の文字列にする。
 * 0.15 → "15%"、0.00315 → "0.315%"。浮動小数点の桁ブレを丸めてから表示する。
 */
export const formatRate = (rate: number): string => `${Math.round(rate * 1e6) / 1e4}%`;

/**
 * 日付を「YYYY年M月D日」形式にフォーマットする
 */
export const formatJapaneseDate = (date: Date): string =>
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
