export async function fetchApi(url: string, options: RequestInit, errorMsg: string) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || errorMsg);
  }
}
