// API の呼び出し口。パスは vite.config.ts の base から来る（'/bank-analyzer-next/'）。
// 応答の形は server/routes/common.ts: 成功 { success: true, ... } / 失敗 { success: false, error, errors? }

export const API_BASE = `${import.meta.env.BASE_URL}api`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    // 欄ごとの誤り（設定の保存など）
    readonly errors: Record<string, string> = {},
  ) {
    super(message);
  }
}

type Body = Record<string, unknown> | FormData;

async function request<T>(method: string, path: string, body?: Body): Promise<T> {
  const init: RequestInit = { method };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError('サーバーに接続できませんでした', 0);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // 本文が JSON でない（ゲートウェイの 502 など）
  }
  const obj = (data ?? {}) as { success?: boolean; error?: unknown; errors?: unknown };
  if (!res.ok || obj.success === false) {
    const message = typeof obj.error === 'string' ? obj.error : `処理に失敗しました（${res.status}）`;
    throw new ApiError(message, res.status, (obj.errors as Record<string, string> | undefined) ?? {});
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: Body = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: Body = {}) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: Body = {}) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

// 書き出し（CSV・Excel・JSON）は <a href> で開く。ファイル名はサーバーの Content-Disposition が決める
export const downloadUrl = (path: string, params?: URLSearchParams) =>
  `${API_BASE}${path}${params && params.size ? `?${params}` : ''}`;
