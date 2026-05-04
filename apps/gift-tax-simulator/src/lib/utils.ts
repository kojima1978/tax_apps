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

/**
 * 日付を「YYYY年M月D日」形式にフォーマット
 */
export const formatDate = (date: Date): string =>
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

/**
 * 計算結果の totalTax に異常値が含まれるか判定
 */
export const hasInvalidTax = <T extends { totalTax: number }>(rows: T[]): boolean =>
    rows.some(r => !isFinite(r.totalTax) || isNaN(r.totalTax));

/**
 * 小数点を保持しながら正規化（面積入力用）
 */
export const normalizeDecimalString = (val: string): string => {
    let s = val
        .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
        .replace(/,/g, '')
        .replace(/[^0-9.]/g, '');
    const first = s.indexOf('.');
    if (first >= 0) s = s.slice(0, first + 1) + s.slice(first + 1).replace(/\./g, '');
    return s;
};

/**
 * 小数点2位でフォーマット（面積入力表示用）
 */
export const formatDecimalInputValue = (val: string | number | null | undefined): string => {
    if (val === '' || val === null || val === undefined) return '';
    const s = normalizeDecimalString(String(val));
    const [int, dec] = s.split('.');
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec !== undefined ? `${formattedInt}.${dec.slice(0, 2)}` : formattedInt;
};

/**
 * 小数対応パース（面積値取得用）
 */
export const parseDecimalNumber = (val: string): number => {
    if (!val) return 0;
    const n = parseFloat(normalizeDecimalString(val));
    return isNaN(n) ? 0 : n;
};
