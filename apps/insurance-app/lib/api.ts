import type { AppState, AgencyMaster, CsvImportResult } from '@/types';
import { getSampleAgency, getSampleFamilyMembers, getSamplePolicies } from '@/lib/sampleData';
import { DEFAULT_POLICY_PROMPT } from '@/lib/policyPrompt';

export interface CaseSummary {
  id: string;
  title: string;
  primaryMemberName: string;
  primaryMemberNameKana: string;
  memberCount: number;
  policyCount: number;
  updatedAt: string | null;
}

export class ApiError extends Error {
  status: number;
  errors?: { field: string; message: string }[];

  constructor(status: number, errors?: { field: string; message: string }[]) {
    super(`API Error: ${status}`);
    this.status = status;
    this.errors = errors;
  }
}

const JSON_STORAGE_MODE = process.env.NEXT_PUBLIC_STORAGE_MODE === 'json';
const STORAGE_VERSION = 1;
const CASES_KEY = 'insurance-app:json-storage:cases:v1';
const STATE_KEY_PREFIX = 'insurance-app:json-storage:state:v1:';
const AGENCY_MASTERS_KEY = 'insurance-app:json-storage:agency-masters:v1';
const TYPE_DESCRIPTIONS_KEY = 'insurance-app:json-storage:type-descriptions:v1';
const POLICY_PROMPT_KEY = 'insurance-app:json-storage:policy-prompt:v1';
const PORTFOLIO_INSIGHTS_KEY_PREFIX = 'insurance-app:json-storage:portfolio-insights:v1:';
const DEFAULT_CASE_ID = 'demo';

interface JsonExportData extends AppState {
  schemaVersion?: number;
  exportedAt?: string;
  storageMode?: string;
}

interface StoredPolicyPrompt {
  prompt: string;
  updatedAt: string;
}

export function isJsonStorageMode(): boolean {
  return JSON_STORAGE_MODE;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new ApiError(res.status, body.errors), body);
  }
  return res.json();
}

function qs(caseId: string): string {
  return `?caseId=${encodeURIComponent(caseId)}`;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function newId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function now(): string {
  return new Date().toISOString();
}

function readJson<T>(key: string): T | null {
  if (!canUseLocalStorage()) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function stateKey(caseId: string): string {
  return `${STATE_KEY_PREFIX}${caseId}`;
}

function portfolioInsightsKey(caseId: string): string {
  return `${PORTFOLIO_INSIGHTS_KEY_PREFIX}${caseId}`;
}

function makeSampleState(): AppState {
  return {
    familyMembers: getSampleFamilyMembers(),
    agency: getSampleAgency(),
    policies: getSamplePolicies(),
    updatedAt: now(),
  };
}

function makeBlankState(): AppState {
  return {
    familyMembers: [{
      id: newId('member'),
      name: '',
      nameKana: '',
      relationship: '本人',
      birthDate: today(),
      gender: 'male',
    }],
    agency: { name: '', representative: '', phone: '' },
    policies: [],
    updatedAt: now(),
  };
}

function summarizeCase(id: string, title: string, state: AppState): CaseSummary {
  const primary = state.familyMembers.find(member => member.relationship === '本人') ?? state.familyMembers[0];
  return {
    id,
    title,
    primaryMemberName: primary?.name ?? '',
    primaryMemberNameKana: primary?.nameKana ?? '',
    memberCount: state.familyMembers.length,
    policyCount: state.policies.length,
    updatedAt: state.updatedAt ?? null,
  };
}

function ensureJsonCases(): CaseSummary[] {
  const existing = readJson<CaseSummary[]>(CASES_KEY);
  if (existing && existing.length > 0) return existing;

  const state = makeSampleState();
  writeJson(stateKey(DEFAULT_CASE_ID), state);
  const cases = [summarizeCase(DEFAULT_CASE_ID, 'デモ案件', state)];
  writeJson(CASES_KEY, cases);
  return cases;
}

function saveJsonCases(cases: CaseSummary[]): void {
  writeJson(CASES_KEY, cases);
}

function normalizeExportData(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('JSONデータが不正です');
  }

  const data = raw as Partial<JsonExportData> & { data?: Partial<JsonExportData> };
  const source = data.data && typeof data.data === 'object' ? data.data : data;

  if (!Array.isArray(source.familyMembers) || !Array.isArray(source.policies) || !source.agency || typeof source.agency !== 'object') {
    throw new Error('AppState形式のJSONではありません');
  }

  return {
    familyMembers: source.familyMembers,
    policies: source.policies,
    agency: source.agency,
    updatedAt: now(),
  } as AppState;
}

function buildExportData(state: AppState): JsonExportData {
  return {
    schemaVersion: STORAGE_VERSION,
    exportedAt: now(),
    storageMode: JSON_STORAGE_MODE ? 'json' : 'sqlite',
    familyMembers: state.familyMembers,
    agency: state.agency,
    policies: state.policies,
    updatedAt: state.updatedAt,
  };
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}

export function downloadAppStateJson(state: AppState): void {
  downloadJson(buildExportData(state), `insurance-app-state-${timestamp()}.json`);
}

export function fetchCases(): Promise<CaseSummary[]> {
  if (JSON_STORAGE_MODE) {
    return Promise.resolve(ensureJsonCases());
  }
  return request<CaseSummary[]>('/insurance/api/cases/');
}

export function createCase(): Promise<CaseSummary> {
  if (JSON_STORAGE_MODE) {
    const cases = ensureJsonCases();
    const id = newId('case');
    const state = makeBlankState();
    writeJson(stateKey(id), state);
    const newCase = summarizeCase(id, '新規お客様', state);
    saveJsonCases([newCase, ...cases]);
    return Promise.resolve(newCase);
  }
  return request<CaseSummary>('/insurance/api/cases/', { method: 'POST' });
}

export function deleteCase(id: string): Promise<{ ok: boolean }> {
  if (JSON_STORAGE_MODE) {
    const cases = ensureJsonCases().filter(c => c.id !== id);
    saveJsonCases(cases);
    if (canUseLocalStorage()) {
      window.localStorage.removeItem(stateKey(id));
      window.localStorage.removeItem(portfolioInsightsKey(id));
    }
    return Promise.resolve({ ok: true });
  }
  return request(`/insurance/api/cases/${encodeURIComponent(id)}/`, { method: 'DELETE' });
}

export function fetchAppState(caseId: string): Promise<AppState> {
  if (JSON_STORAGE_MODE) {
    ensureJsonCases();
    const state = readJson<AppState>(stateKey(caseId));
    if (!state) throw new ApiError(404);
    return Promise.resolve(state);
  }
  return request<AppState>(`/insurance/api/app-state/${qs(caseId)}`);
}

export function saveAppState(caseId: string, state: AppState): Promise<AppState> {
  if (JSON_STORAGE_MODE) {
    const saved = { ...state, updatedAt: now() };
    writeJson(stateKey(caseId), saved);
    const cases = ensureJsonCases();
    const nextCases = cases.some(c => c.id === caseId)
      ? cases.map(c => c.id === caseId ? summarizeCase(caseId, c.title, saved) : c)
      : [summarizeCase(caseId, 'デモ案件', saved), ...cases];
    saveJsonCases(nextCases);
    return Promise.resolve(saved);
  }
  return request<AppState>(`/insurance/api/app-state/${qs(caseId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
}

export function resetAppState(caseId: string): Promise<AppState> {
  if (JSON_STORAGE_MODE) {
    return saveAppState(caseId, makeSampleState());
  }
  return request<AppState>(`/insurance/api/app-state/reset/${qs(caseId)}`, { method: 'POST' });
}

export function clearAppState(caseId: string): Promise<AppState> {
  if (JSON_STORAGE_MODE) {
    return saveAppState(caseId, makeBlankState());
  }
  return request<AppState>(`/insurance/api/app-state/clear/${qs(caseId)}`, { method: 'POST' });
}

export function getExportUrl(caseId: string): string {
  return `/insurance/api/app-state/export/${qs(caseId)}`;
}

export async function restoreJsonAppState(caseId: string, file: File): Promise<AppState> {
  if (JSON_STORAGE_MODE) {
    const parsed = await readJsonFile(file);
    return saveAppState(caseId, normalizeExportData(parsed));
  }

  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/insurance/api/app-state/import/${qs(caseId)}`, { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new ApiError(res.status, body.errors), body);
  return body as AppState;
}

export async function importCsv(
  caseId: string,
  file: File,
  overwriteDuplicates = false,
): Promise<CsvImportResult> {
  if (JSON_STORAGE_MODE) {
    return { code: 'UNSUPPORTED_IN_JSON_MODE', message: 'JSONデモモードではCSV取込は利用できません' };
  }

  const form = new FormData();
  form.append('file', file);
  form.append('caseId', caseId);
  if (overwriteDuplicates) {
    form.append('overwriteDuplicates', 'true');
  }

  const res = await fetch('/insurance/api/policies/import-csv/', {
    method: 'POST',
    body: form,
  });

  const body = await res.json();
  return body as CsvImportResult;
}

export function checkHealth(): Promise<{ status: string; database: string }> {
  if (JSON_STORAGE_MODE) return Promise.resolve({ status: 'ok', database: 'json-local-storage' });
  return request('/insurance/api/health/');
}

export function fetchAgencyMasters(): Promise<AgencyMaster[]> {
  if (JSON_STORAGE_MODE) return Promise.resolve(readJson<AgencyMaster[]>(AGENCY_MASTERS_KEY) ?? []);
  return request<AgencyMaster[]>('/insurance/api/agency-masters/');
}

export function createAgencyMaster(data: Omit<AgencyMaster, 'id'>): Promise<AgencyMaster> {
  if (JSON_STORAGE_MODE) {
    const masters = readJson<AgencyMaster[]>(AGENCY_MASTERS_KEY) ?? [];
    const master = { id: newId('agency'), ...data };
    writeJson(AGENCY_MASTERS_KEY, [master, ...masters]);
    return Promise.resolve(master);
  }
  return request<AgencyMaster>('/insurance/api/agency-masters/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateAgencyMaster(id: string, data: Omit<AgencyMaster, 'id'>): Promise<AgencyMaster> {
  if (JSON_STORAGE_MODE) {
    const masters = readJson<AgencyMaster[]>(AGENCY_MASTERS_KEY) ?? [];
    const updated = { id, ...data };
    writeJson(AGENCY_MASTERS_KEY, masters.map(master => master.id === id ? updated : master));
    return Promise.resolve(updated);
  }
  return request<AgencyMaster>(`/insurance/api/agency-masters/${encodeURIComponent(id)}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteAgencyMaster(id: string): Promise<{ ok: boolean }> {
  if (JSON_STORAGE_MODE) {
    const masters = readJson<AgencyMaster[]>(AGENCY_MASTERS_KEY) ?? [];
    writeJson(AGENCY_MASTERS_KEY, masters.filter(master => master.id !== id));
    return Promise.resolve({ ok: true });
  }
  return request(`/insurance/api/agency-masters/${encodeURIComponent(id)}/`, { method: 'DELETE' });
}

export interface InsuranceTypeDescription {
  policyType: string;
  longDescription: string;
  purpose: string;
}

export function fetchInsuranceTypeDescriptions(): Promise<InsuranceTypeDescription[]> {
  if (JSON_STORAGE_MODE) return Promise.resolve(readJson<InsuranceTypeDescription[]>(TYPE_DESCRIPTIONS_KEY) ?? []);
  return request<InsuranceTypeDescription[]>('/insurance/api/insurance-type-descriptions/');
}

export function updateInsuranceTypeDescription(
  policyType: string,
  longDescription: string,
  purpose: string,
): Promise<InsuranceTypeDescription> {
  if (JSON_STORAGE_MODE) {
    const descriptions = readJson<InsuranceTypeDescription[]>(TYPE_DESCRIPTIONS_KEY) ?? [];
    const result = { policyType, longDescription, purpose };
    const next = descriptions.some(d => d.policyType === policyType)
      ? descriptions.map(d => d.policyType === policyType ? result : d)
      : [...descriptions, result];
    writeJson(TYPE_DESCRIPTIONS_KEY, next);
    return Promise.resolve(result);
  }
  return request<InsuranceTypeDescription>('/insurance/api/insurance-type-descriptions/', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policyType, longDescription, purpose }),
  });
}

export interface PortfolioInsightData {
  id?: string;
  type: 'gap' | 'redundancy' | 'recommendation';
  text: string;
  isCustom: boolean;
}

export function fetchPortfolioInsights(caseId: string): Promise<{ insights: PortfolioInsightData[]; hasData: boolean }> {
  if (JSON_STORAGE_MODE) {
    const insights = readJson<PortfolioInsightData[]>(portfolioInsightsKey(caseId));
    return Promise.resolve({ insights: insights ?? [], hasData: !!insights });
  }
  return request(`/insurance/api/portfolio-insights/${qs(caseId)}`);
}

export function savePortfolioInsights(caseId: string, insights: Omit<PortfolioInsightData, 'id'>[]): Promise<{ insights: PortfolioInsightData[] }> {
  if (JSON_STORAGE_MODE) {
    const saved = insights.map((insight, index) => ({ id: `${caseId}-insight-${index + 1}`, ...insight }));
    writeJson(portfolioInsightsKey(caseId), saved);
    return Promise.resolve({ insights: saved });
  }
  return request(`/insurance/api/portfolio-insights/${qs(caseId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ insights }),
  });
}

export function resetPortfolioInsights(caseId: string): Promise<{ ok: boolean }> {
  if (JSON_STORAGE_MODE) {
    if (canUseLocalStorage()) window.localStorage.removeItem(portfolioInsightsKey(caseId));
    return Promise.resolve({ ok: true });
  }
  return request(`/insurance/api/portfolio-insights/${qs(caseId)}`, { method: 'DELETE' });
}

export interface PolicyPromptResponse {
  prompt: string;
  source: 'saved' | 'default';
  updatedAt: string | null;
}

export function fetchPolicyPrompt(): Promise<PolicyPromptResponse> {
  if (JSON_STORAGE_MODE) {
    const saved = readJson<StoredPolicyPrompt>(POLICY_PROMPT_KEY);
    return Promise.resolve({
      prompt: saved?.prompt ?? DEFAULT_POLICY_PROMPT,
      source: saved ? 'saved' : 'default',
      updatedAt: saved?.updatedAt ?? null,
    });
  }
  return request<PolicyPromptResponse>('/insurance/api/settings/policy-prompt/');
}

export function savePolicyPrompt(prompt: string): Promise<PolicyPromptResponse> {
  if (JSON_STORAGE_MODE) {
    const saved = { prompt, updatedAt: now() };
    writeJson(POLICY_PROMPT_KEY, saved);
    return Promise.resolve({ ...saved, source: 'saved' });
  }
  return request<PolicyPromptResponse>('/insurance/api/settings/policy-prompt/', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
}

export function getBackupUrl(): string {
  return '/insurance/api/backup/';
}

export async function restoreBackup(file: File): Promise<{ ok: boolean; message: string }> {
  if (JSON_STORAGE_MODE) {
    throw Object.assign(new ApiError(400), { error: 'JSONデモモードではSQLiteバックアップ復元は利用できません' });
  }
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/insurance/api/backup/', { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok) throw new ApiError(res.status, body.errors);
  return body;
}
