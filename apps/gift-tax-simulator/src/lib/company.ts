import { useSyncExternalStore } from 'react';

// 帳票に刷る事務所の情報。元は社員台帳（/staff-directory/）の「会社」で、
// ここに書いてあるのは台帳に届かないときの控えだけ。住所が変わったら台帳を直す。

export type CompanyInfo = {
    /** 台帳の会社ID。控えのときは null */
    id: number | null;
    name: string;
    /** 〒は付けない（123-4567 の形） */
    postalCode: string;
    address: string;
    phone: string;
    fax: string;
};

export const FALLBACK_COMPANY: CompanyInfo = {
    id: null,
    name: '税理士法人マスエージェント',
    postalCode: '770-0002',
    address: '徳島県徳島市春日２丁目３−３３',
    phone: '088-632-6228',
    fax: '088-631-9870',
};

const DIRECTORY_URL = '/staff-directory/api/companies';
const TIMEOUT_MS = 3000;
// 全アプリが同じオリジン（ゲートウェイ）なので、1つのアプリで選んだ会社が他のアプリにも効く
const STORAGE_KEY = 'tax-apps:company-id';

export type CompanyStatus = 'loading' | 'ok' | 'fallback';

type Snapshot = { companies: CompanyInfo[]; status: CompanyStatus; selectedId: number | null };

export function formatPostalCode(postalCode: string): string {
    return postalCode ? `〒${postalCode}` : '';
}

export function getFullAddress(company: CompanyInfo): string {
    return [formatPostalCode(company.postalCode), company.address].filter(Boolean).join(' ');
}

/** 選んだ会社が台帳から消えていたら先頭（台帳の表示順）へ戻す */
export function pickCompany(companies: CompanyInfo[], selectedId: number | null): CompanyInfo {
    return companies.find((c) => c.id === selectedId) ?? companies[0] ?? FALLBACK_COMPANY;
}

/** 台帳の応答から必要な欄だけ取り出す。形が違えば null（＝控えで動く） */
export function parseDirectoryCompanies(body: unknown): CompanyInfo[] | null {
    if (!Array.isArray(body)) return null;
    const companies = body.flatMap((row): CompanyInfo[] => {
        if (typeof row !== 'object' || row === null) return [];
        const r = row as Record<string, unknown>;
        if (typeof r.id !== 'number' || typeof r.name !== 'string' || r.name === '') return [];
        const text = (v: unknown) => (typeof v === 'string' ? v : '');
        return [{ id: r.id, name: r.name, postalCode: text(r.postalCode), address: text(r.address), phone: text(r.phone), fax: text(r.fax) }];
    });
    return companies.length > 0 ? companies : null;
}

function readStoredId(): number | null {
    try {
        const v = Number(window.localStorage.getItem(STORAGE_KEY));
        return Number.isInteger(v) && v > 0 ? v : null;
    } catch {
        return null;
    }
}

let snapshot: Snapshot = { companies: [FALLBACK_COMPANY], status: 'loading', selectedId: null };
const listeners = new Set<() => void>();
let started = false;

function update(next: Partial<Snapshot>) {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((l) => l());
}

async function load() {
    let companies: CompanyInfo[] | null = null;
    try {
        const res = await fetch(DIRECTORY_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (res.ok) companies = parseDirectoryCompanies(await res.json());
    } catch {
        // 台帳が落ちていても帳票は控えで刷れるようにする
    }
    update(companies ? { companies, status: 'ok' } : { status: 'fallback' });
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (!started) {
        started = true;
        update({ selectedId: readStoredId() });
        void load();
    }
    return () => {
        listeners.delete(listener);
    };
}

function selectCompany(id: number) {
    try {
        window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
        // 保存できなくてもこの画面の間は選んだ会社で刷る
    }
    update({ selectedId: id });
}

export function useCompanyInfo() {
    const s = useSyncExternalStore(subscribe, () => snapshot);
    return { company: pickCompany(s.companies, s.selectedId), companies: s.companies, status: s.status, selectCompany };
}
