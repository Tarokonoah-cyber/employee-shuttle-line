export async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.text();
  if (!body.trim()) {
    throw new Error(response.ok ? fallbackMessage : `${fallbackMessage}（HTTP ${response.status}）`);
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(response.ok ? fallbackMessage : `${fallbackMessage}（HTTP ${response.status}）`);
  }
}
