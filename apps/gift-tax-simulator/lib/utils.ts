const NUMBER_FORMAT = new Intl.NumberFormat('ja-JP');

/**
 * 数値をカンマ区切りにフォーマット
 */
export function formatCurrency(num: number): string {
    return NUMBER_FORMAT.format(num);
}

const YEN_FORMAT = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });

/**
 * 通貨フォーマット（￥付き）
 */
export const formatYen = (num: number): string => YEN_FORMAT.format(num);

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

/**
 * 入力値をカンマ区切りにフォーマットする（フォーム入力用）
 */
export const formatInputValue = (val: string | number | null | undefined): string => {
    if (val === '' || val === null || val === undefined) return '';
    const str = normalizeNumberString(String(val));
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
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
