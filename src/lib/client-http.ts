export const CLIENT_REQUEST_TIMEOUT_MS = 2_800;

type FetchLike = typeof fetch;

export class ClientRequestTimeoutError extends Error {
  constructor(message = "連線超過 3 秒，請重試。") {
    super(message);
    this.name = "ClientRequestTimeoutError";
  }
}

function timeoutResponse(response: Response, body: ArrayBuffer) {
  const responseBody = [204, 205, 304].includes(response.status) ? null : body;
  return new Response(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = CLIENT_REQUEST_TIMEOUT_MS,
  fetcher: FetchLike = fetch,
) {
  const controller = new AbortController();
  let timedOut = false;
  const externalSignal = init.signal;
  const abortFromExternalSignal = () => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) {
    abortFromExternalSignal();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.max(1, timeoutMs));

  try {
    const response = await fetcher(input, { ...init, signal: controller.signal });
    const body = await response.arrayBuffer();
    return timeoutResponse(response, body);
  } catch (error) {
    if (timedOut) throw new ClientRequestTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}

export async function withClientDeadline<T>(
  operation: Promise<T>,
  timeoutMs = CLIENT_REQUEST_TIMEOUT_MS,
  timeoutMessage = "處理超過 3 秒，請重試。",
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ClientRequestTimeoutError(timeoutMessage)), Math.max(1, timeoutMs));
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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
