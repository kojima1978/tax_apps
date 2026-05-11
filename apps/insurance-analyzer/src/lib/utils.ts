const NUMBER_FORMAT = new Intl.NumberFormat('ja-JP');

export function formatCurrency(num: number): string {
    return NUMBER_FORMAT.format(num);
}

export function formatYen(num: number): string {
    return `${NUMBER_FORMAT.format(num)}円`;
}

export function formatMan(num: number): string {
    const man = num / 10000;
    return `${NUMBER_FORMAT.format(Math.round(man * 10) / 10)}万円`;
}

const normalizeNumberString = (val: string): string => {
    return val
        .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/,/g, "")
        .replace(/[^0-9]/g, "");
};

export const formatInputValue = (val: string | number | null | undefined): string => {
    if (val === "" || val === null || val === undefined) return "";
    const str = normalizeNumberString(String(val));
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const parseFormattedNumber = (val: string): number => {
    if (!val) return 0;
    const normalized = normalizeNumberString(val);
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
};

export const parseIntInput = (val: string): number => Math.max(0, parseInt(val) || 0);

export const formatJapaneseDate = (date: Date): string =>
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

export function calcAge(birthDate: string, referenceDate?: string): number {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return 0;

    let age = ref.getFullYear() - birth.getFullYear();
    const monthDiff = ref.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
        age--;
    }
    return Math.max(0, age);
}

export function formatPercent(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
}
