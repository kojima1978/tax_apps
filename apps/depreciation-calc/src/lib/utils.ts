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
 * input[type="number"] の値を非負整数にパースする
 */
export const parseIntInput = (val: string): number => Math.max(0, parseInt(val) || 0);

/**
 * 日付を「YYYY年M月D日」形式にフォーマットする
 */
export const formatJapaneseDate = (date: Date): string =>
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

export const formatElapsed = (years: number, months: number): string => {
    if (months === 0) return `${years}年`;
    if (years === 0) return `${months}ヶ月`;
    return `${years}年${months}ヶ月`;
};

/**
 * 2つの日付間の経過年数・月数を計算する
 */
export function calcElapsedFromDates(startDate: string, endDate: string): { years: number; months: number } | null {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();

    if (end.getDate() < start.getDate()) {
        months--;
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    return { years, months };
}
