const API_ROOT = "/api";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let csrfToken: string | null = null;

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code?: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
};

function rememberCsrfToken(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    typeof (payload as { csrf_token?: unknown }).csrf_token === "string"
  ) {
    csrfToken = (payload as { csrf_token: string }).csrf_token;
  }
}

async function fetchCsrfToken() {
  const response = await fetch(`${API_ROOT}/auth/csrf`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok || !payload || typeof payload.csrf_token !== "string") {
    throw new ApiError(
      "Could not prepare a secure request. Refresh the page and try again.",
      response.status,
      "csrf_unavailable",
    );
  }
  csrfToken = payload.csrf_token;
  return csrfToken;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const needsCsrf = UNSAFE_METHODS.has(method);
  if (needsCsrf && !csrfToken) {
    await fetchCsrfToken();
  }

  const send = async () => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (needsCsrf && csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
    const response = await fetch(`${API_ROOT}${path}`, {
      method,
      credentials: "include",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await response.json() : null;
    rememberCsrfToken(payload);
    return { response, payload };
  };

  let { response, payload } = await send();

  if (needsCsrf && response.status === 403 && payload?.code === "csrf_failed") {
    await fetchCsrfToken();
    ({ response, payload } = await send());
  }

  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : "The request could not be completed. Please try again.";
    throw new ApiError(message, response.status, payload?.code, payload?.fields);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function queryString(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
