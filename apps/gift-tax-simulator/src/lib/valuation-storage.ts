type PageKey = 'acquisition-tax' | 'registration-tax';

type ValuationData = {
    landValuation: string;
    buildingValuation: string;
};

const STORAGE_KEY = 'gift-tax-sim:valuations';

const readStore = (): Partial<Record<PageKey, ValuationData>> => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
        return {};
    }
};

export const saveValuations = (page: PageKey, data: ValuationData): void => {
    try {
        const store = readStore();
        store[page] = data;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch { /* ignore */ }
};

export const loadValuations = (page: PageKey): ValuationData | null => {
    return readStore()[page] ?? null;
};
