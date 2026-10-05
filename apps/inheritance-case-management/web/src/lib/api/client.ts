// API の入口。既定値を複数箇所に書かないこと
// （ゲートウェイが /itcm/api-v1 → /itcm/api へ書き換える契約に依存する値）。
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/itcm/api-v1';

function normalizeEndpoint(endpoint: string): string {
  const [pathname, query = ''] = endpoint.split('?');
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return query ? `${normalizedPath}?${query}` : normalizedPath;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${normalizeEndpoint(endpoint)}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      error.code || 'UNKNOWN_ERROR',
      error.message || error.error || 'An error occurred',
      error.details
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
