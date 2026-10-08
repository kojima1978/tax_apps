// API の呼び出し口。パスは vite.config.ts の base から来る（'/bank-analyzer-next/'）。
// 応答の形は server/routes/common.ts: 成功 { success: true, ... } / 失敗 { success: false, error, errors? }

export const API_BASE = `${import.meta.env.BASE_URL}api`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    // 欄ごとの誤り（設定の保存など）
    readonly errors: Record<string, string> = {},
    // 取込の読み取りエラーの詳細（行番号・直し方など。server/lib/import/errors.ts の toDict）
    readonly details: unknown = null,
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
  const obj = (data ?? {}) as { success?: boolean; error?: unknown; errors?: unknown; details?: unknown };
  if (!res.ok || obj.success === false) {
    const message = typeof obj.error === 'string' ? obj.error : `処理に失敗しました（${res.status}）`;
    throw new ApiError(message, res.status, (obj.errors as Record<string, string> | undefined) ?? {}, obj.details ?? null);
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

// 書き出しを取りに行き、成功したときだけ保存させる。書き出せないとき（取引が無いなど）は
// サーバーが 400 の JSON を返すので、その文言で ApiError を投げる（<a href> で開くと JSON が画面に出る）。
// 成功の目印は Content-Disposition の attachment（JSON バックアップは中身も JSON なので型では見分けない）
export async function download(path: string, params?: URLSearchParams): Promise<void> {
  let res: Response;
  try {
    res = await fetch(downloadUrl(path, params));
  } catch {
    throw new ApiError('サーバーに接続できませんでした', 0);
  }
  const disposition = res.headers.get('Content-Disposition') ?? '';
  if (!res.ok || !disposition.startsWith('attachment')) {
    const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
    throw new ApiError(typeof data?.error === 'string' ? data.error : `書き出しに失敗しました（${res.status}）`, res.status);
  }
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const filename = encoded ? decodeURIComponent(encoded) : (/filename="([^"]+)"/.exec(disposition)?.[1] ?? 'download');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
