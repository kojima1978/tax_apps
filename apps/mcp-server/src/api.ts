/**
 * 株式評価明細書（stock-valuation-form）のAPIを叩く係。
 *
 * 案件データの持ち方も欄の意味づけも向こうにあるので、ここは受け渡しに徹する。
 * 上書き（PUT）は data をまるごと置き換える仕様なので、書くときは必ず
 * 取得 → 重ねる → 返す の順で扱うこと（差分だけ送ると他の表が消える）。
 */
import type { CaseData, FieldCatalog } from './catalog.js';
import { ApiError } from './errors.js';
import type { Config } from './config.js';

export interface CaseSummary {
  id: number;
  companyName: string;
  taxPeriod: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDetail extends CaseSummary {
  data: CaseData;
}

export interface CaseUpdate {
  companyName: string;
  taxPeriod: string;
  data: CaseData;
}

export interface SvfApi {
  getCatalog(): Promise<FieldCatalog>;
  listCases(includeArchived?: boolean): Promise<CaseSummary[]>;
  getCase(id: number): Promise<CaseDetail>;
  putCase(id: number, body: CaseUpdate): Promise<CaseSummary>;
}

export function createSvfApi(config: Config): SvfApi {
  let catalog: FieldCatalog | undefined;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${config.svfBaseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(config.timeoutMs) });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new ApiError(
        0,
        `株式評価明細書に接続できませんでした（${url}）: ${detail}\n`
        + '  コンテナが動いているか、共有ネットワーク tax-apps-network に繋がっているかを確認してください。',
      );
    }

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === 'string') message = body.error;
      } catch {
        // 本文がJSONでないときはステータスだけで返す
      }
      throw new ApiError(response.status, message);
    }

    return (await response.json()) as T;
  }

  return {
    async getCatalog() {
      // プロセスは MCP クライアントが起動するたびに立ち上がる短命なものなので、
      // 一度取れば使い回して構わない（様式の改訂は再起動で拾う）。
      catalog ??= await request<FieldCatalog>('/field-catalog');
      return catalog;
    },

    async listCases(includeArchived = false) {
      const query = includeArchived ? '?includeArchived=1' : '';
      const body = await request<{ cases: CaseSummary[] }>(`/cases${query}`);
      return body.cases;
    },

    async getCase(id) {
      const body = await request<{ case: CaseDetail }>(`/cases/${id}`);
      return body.case;
    },

    async putCase(id, body) {
      const result = await request<{ case: CaseSummary }>(`/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return result.case;
    },
  };
}
