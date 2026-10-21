import { useSyncExternalStore } from 'react';

export type CompanyInfo = {
  id: number | null;
  name: string;
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
const STORAGE_KEY = 'tax-apps:company-id';

export type CompanyStatus = 'loading' | 'ok' | 'fallback';
type Snapshot = { companies: CompanyInfo[]; status: CompanyStatus; selectedId: number | null };

export function formatPostalCode(postalCode: string): string {
  return postalCode ? `〒${postalCode}` : '';
}

export function getFullAddress(company: CompanyInfo): string {
  return [formatPostalCode(company.postalCode), company.address].filter(Boolean).join(' ');
}

// 電話・FAX が空の会社でも「FAX 」だけが刷られないよう、ある欄だけ並べる
export function getContactLine(company: CompanyInfo): string {
  return [company.phone && `TEL ${company.phone}`, company.fax && `FAX ${company.fax}`].filter(Boolean).join(' / ');
}

export function pickCompany(companies: CompanyInfo[], selectedId: number | null): CompanyInfo {
  return companies.find((company) => company.id === selectedId) ?? companies[0] ?? FALLBACK_COMPANY;
}

export function parseDirectoryCompanies(body: unknown): CompanyInfo[] | null {
  if (!Array.isArray(body)) return null;
  const companies = body.flatMap((row): CompanyInfo[] => {
    if (typeof row !== 'object' || row === null) return [];
    const value = row as Record<string, unknown>;
    if (typeof value.id !== 'number' || typeof value.name !== 'string' || value.name === '') return [];
    const text = (field: unknown) => (typeof field === 'string' ? field : '');
    return [{
      id: value.id,
      name: value.name,
      postalCode: text(value.postalCode),
      address: text(value.address),
      phone: text(value.phone),
      fax: text(value.fax),
    }];
  });
  return companies.length > 0 ? companies : null;
}

function readStoredId(): number | null {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

let snapshot: Snapshot = { companies: [FALLBACK_COMPANY], status: 'loading', selectedId: null };
const listeners = new Set<() => void>();
let started = false;

function update(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

async function load() {
  let companies: CompanyInfo[] | null = null;
  try {
    const response = await fetch(DIRECTORY_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (response.ok) companies = parseDirectoryCompanies(await response.json());
  } catch {
    // 台帳停止時も控えの情報で印刷を継続する
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
  return () => listeners.delete(listener);
}

function selectCompany(id: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // 保存不可でも現在の画面では選択を維持する
  }
  update({ selectedId: id });
}

export function useCompanyInfo() {
  const current = useSyncExternalStore(subscribe, () => snapshot);
  return {
    company: pickCompany(current.companies, current.selectedId),
    companies: current.companies,
    status: current.status,
    selectCompany,
  };
}

