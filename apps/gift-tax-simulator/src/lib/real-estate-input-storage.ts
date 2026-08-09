/**
 * 不動産関連3ページ（不動産取得税・登録免許税・2税まとめ）の入力条件を localStorage に置き、
 * ページ間で引用できるようにする。ページごとに最後の入力状態を1件だけ持つ。
 */

export type PageKey = 'acquisition-tax' | 'registration-tax' | 'real-estate-summary';

export const PAGE_LABEL: Record<PageKey, string> = {
    'acquisition-tax': '不動産取得税ページ',
    'registration-tax': '登録免許税ページ',
    'real-estate-summary': 'まとめページ',
};

export type ImportField = 'land' | 'building';

export const IMPORT_FIELDS: ImportField[] = ['land', 'building'];

/**
 * 保存する物件の入力条件。ページによって持たない項目があるので評価額以外は任意。
 * 取引種別・計算対象はその場の目的そのものなので運ばない。
 * 建物控除額も建築年月日から自動計算されるため保存しない。
 */
export type RealEstateInputs = {
    // 土地
    /** 不動産取得税・まとめでは「宅地」、登録免許税では土地全体 */
    landValuation: string;
    /** 宅地以外の土地。登録免許税ページは区別しないので持たない */
    otherLandValuation?: string;
    landArea?: string;
    landShareNumerator?: string;
    landShareDenominator?: string;
    // 建物
    buildingValuation: string;
    buildingArea?: string;
    /** 打った文字列のまま（西暦4桁でも和暦でも復元できるように） */
    buildingYearInput?: string;
    buildingMonth?: string;
    buildingDay?: string;
    isResidential?: boolean;
    isLongLifeQuality?: boolean;
    hasHousingCertificate?: boolean;
    buildingShareNumerator?: string;
    buildingShareDenominator?: string;
};

const STORAGE_KEY = 'gift-tax-sim:valuations';

const readStore = (): Partial<Record<PageKey, RealEstateInputs>> => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
        return {};
    }
};

export const saveRealEstateInputs = (page: PageKey, data: RealEstateInputs): void => {
    try {
        const store = readStore();
        store[page] = data;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch { /* ignore */ }
};

export const loadRealEstateInputs = (page: PageKey): RealEstateInputs | null => {
    return readStore()[page] ?? null;
};

/** 引用ボタンは、引用元にその区分の評価額が入っているときだけ出す */
export const hasImportableField = (data: RealEstateInputs | null, field: ImportField): boolean =>
    !!data && (field === 'land'
        ? !!(data.landValuation || data.otherLandValuation)
        : !!data.buildingValuation);

/** 引用元が持っていない項目は今の入力を残す（引用で消えないようにする） */
export const applyIfPresent = <T,>(setter: (v: T) => void, value: T | undefined): void => {
    if (value !== undefined && value !== '') setter(value);
};
