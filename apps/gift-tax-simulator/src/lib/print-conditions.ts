import { TRANSACTION_OPTIONS, getWareki, type TransactionType } from './real-estate-tax';
import { formatInputValue, parseFormattedNumber, parseDecimalNumber } from './utils';

/**
 * 印刷用「入力条件」サマリの組み立て。
 * 紙には入力欄（select / input）をそのまま出さず、ここで作った値だけを載せる。
 */

export type ConditionRow = { label: string; value: string };
export type ConditionGroup = { title: string; rows: ConditionRow[] };

/** 未入力・非該当の行は null で返し、最後にまとめて落とす */
type MaybeRow = ConditionRow | null;

export const compactRows = (rows: MaybeRow[]): ConditionRow[] =>
    rows.filter((row): row is ConditionRow => row !== null && row.value !== '');

/** 行の残っていないグループは見出しごと省く */
export const compactGroups = (groups: ConditionGroup[]): ConditionGroup[] =>
    groups.filter((group) => group.rows.length > 0);

/** 金額。未入力・0円は紙に出さない */
export const yenRow = (label: string, input: string): MaybeRow => {
    const value = parseFormattedNumber(input);
    return value > 0 ? { label, value: `${formatInputValue(value)} 円` } : null;
};

/** 面積。未入力・0m²は紙に出さない（小数なので3桁区切りは付けない） */
export const areaRow = (label: string, input: string): MaybeRow => {
    const value = parseDecimalNumber(input);
    return value > 0 ? { label, value: `${value} m²` } : null;
};

/** 持ち分。1/1（全部所有）はわざわざ書かない */
export const shareRow = (numerator: string, denominator: string): MaybeRow => {
    const n = Math.max(1, parseInt(numerator) || 1);
    const d = Math.max(1, parseInt(denominator) || 1);
    return n !== d ? { label: '持ち分', value: `${n} / ${d}` } : null;
};

/** 該当するときだけ載せる項目（認定長期優良住宅など） */
export const flagRow = (label: string, checked: boolean): MaybeRow =>
    checked ? { label, value: '該当' } : null;

/** 税額に効くので「なし」も明示する項目（住宅用家屋証明書など） */
export const yesNoRow = (label: string, checked: boolean): ConditionRow =>
    ({ label, value: checked ? 'あり' : 'なし' });

export const usageRow = (isResidential: boolean): ConditionRow =>
    ({ label: '用途', value: isResidential ? '居住用' : '非居住用' });

/** 「2020年4月1日（令和2年）」の形に組み立てる。年が未確定なら出さない */
export const buildingDateRow = (year: string, month: string, day: string): MaybeRow => {
    if (!year) return null;
    const y = Number(year);
    const monthDay = month && day ? `${Number(month)}月${Number(day)}日` : '';
    return { label: '建築年月日', value: `${y}年${monthDay}（${getWareki(y)}）` };
};

export const transactionRow = (
    transactionType: TransactionType,
    label = '登記原因 (取引種別)',
): ConditionRow =>
    ({
        label,
        value: TRANSACTION_OPTIONS.find((o) => o.value === transactionType)?.label ?? '',
    });

export const targetRow = (includeLand: boolean, includeBuilding: boolean): ConditionRow =>
    ({
        label: '計算対象',
        value: [includeLand && '土地', includeBuilding && '建物'].filter(Boolean).join('・'),
    });
