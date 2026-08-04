// 管理画面から叩く書き込みAPI。サーバ側は server/routes/industryAdmin.ts。

import type { IndustryLevel } from '@/data/industryDataset';

const API_BASE = `${import.meta.env.BASE_URL}api`;

interface ErrorBody {
  error?: string;
  detail?: { numbers?: number[] };
}

/**
 * サーバのエラー本体を1行のメッセージに畳む。
 * 業種目番号の列挙（重複・未登録）はそのまま出すと長いので先頭20件で打ち切る。
 */
function messageOf(status: number, body: ErrorBody | null): string {
  const base = body?.error ?? `サーバがHTTP ${status}を返しました`;
  const numbers = body?.detail?.numbers;
  if (!numbers || numbers.length === 0) return base;

  const shown = numbers.slice(0, 20).join(', ');
  const rest = numbers.length > 20 ? ` ほか${numbers.length - 20}件` : '';
  return `${base}（${shown}${rest}）`;
}

async function send<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(messageOf(response.status, errorBody as ErrorBody | null));
  }

  return (await response.json()) as T;
}

export interface CreateYearCategory {
  number: number;
  largeName: string;
  middleName: string;
  smallName: string;
  name: string;
  level: IndustryLevel;
  description: string;
  dividend: number;
  profit: number;
  netAsset: number;
  previousYearAveragePrice: number;
}

export interface CreateYearRequest {
  era: string;
  eraYear: number;
  categories: CreateYearCategory[];
}

export interface CreateYearResponse {
  year: { id: number; label: string; gregorianYear: number };
  categoryCount: number;
  monthlyPriceCount: number;
}

export function createIndustryYear(request: CreateYearRequest) {
  return send<CreateYearResponse>('POST', '/industry-years', request);
}

export interface ImportMonthlyPricesRequest {
  year: number;
  month: number;
  rows: { number: number; price: number; twoYearAveragePrice: number | null }[];
}

export interface ImportMonthlyPricesResponse {
  year: { id: number; label: string; gregorianYear: number };
  priceYear: number;
  priceMonth: number;
  created: number;
  updated: number;
}

export function importMonthlyPrices(gregorianYear: number, request: ImportMonthlyPricesRequest) {
  return send<ImportMonthlyPricesResponse>(
    'POST',
    `/industry-years/${gregorianYear}/monthly-prices`,
    request,
  );
}

export interface DeleteMonthlyPricesResponse {
  year: { id: number; label: string; gregorianYear: number };
  priceYear: number;
  priceMonth: number;
  deleted: number;
}

/**
 * 月別株価の削除。`numbers` を渡せばその業種目だけ、省略すればその月をまるごと消す。
 * 業種目マスタ・B/C/D は消えない（年分そのものの削除APIは用意していない）。
 */
export function deleteMonthlyPrices(
  gregorianYear: number,
  priceYear: number,
  priceMonth: number,
  numbers?: readonly number[],
) {
  return send<DeleteMonthlyPricesResponse>(
    'DELETE',
    `/industry-years/${gregorianYear}/monthly-prices/${priceYear}/${priceMonth}`,
    numbers ? { numbers } : {},
  );
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  dividend?: number;
  profit?: number;
  netAsset?: number;
  previousYearAveragePrice?: number;
}

export function updateIndustryCategory(
  gregorianYear: number,
  number: number,
  request: UpdateCategoryRequest,
) {
  return send<Record<string, unknown>>(
    'PATCH',
    `/industry-years/${gregorianYear}/categories/${number}`,
    request,
  );
}
