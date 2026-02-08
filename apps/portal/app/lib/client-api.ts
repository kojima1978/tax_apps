export async function fetchApi<T = void>(url: string, options: RequestInit, errorMsg: string): Promise<T | undefined> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || errorMsg);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
}
