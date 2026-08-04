import { API_BASE_URL, CUSTOMER_API_PREFIX } from './config';
import { tokenStorage, emitAuthExpired } from './tokenStorage';
import type { ApiEnvelope, AuthTokens } from '@/types/api';

/**
 * HTTP client for the customer app.
 *
 * Follows the admin frontend's fetch-based approach (Frontend/src/utils/api.ts)
 * and layers on the pieces the customer flows need:
 *   - unwraps the backend's { success, data, message } envelope
 *   - transparent access-token refresh on 401, single-flighted across callers
 *   - typed ApiError carrying status code and field-level validation errors
 */

export class ApiError extends Error {
  readonly statusCode: number;
  readonly errorCode?: string;
  readonly errors: unknown[];

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    errors: unknown[] = []
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;
  }

  /** True when the failure is a lost/expired session rather than a bad request. */
  get isAuthError(): boolean {
    return this.statusCode === 401;
  }

  /**
   * Flatten express-validator's error array into { field: message }
   * so forms can surface errors inline.
   */
  get fieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const item of this.errors) {
      if (item && typeof item === 'object') {
        const e = item as { path?: string; param?: string; field?: string; msg?: string; message?: string };
        const field = e.path || e.param || e.field;
        const message = e.msg || e.message;
        if (field && message) result[field] = message;
      }
    }
    return result;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Query params — undefined/null/'' entries are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Send the bearer token even for endpoints that work anonymously. Default true. */
  withAuth?: boolean;
  /** Skip the refresh-and-retry cycle (used by the refresh call itself). */
  skipRefresh?: boolean;
  /** Target the legacy /api root instead of /api/v1/customer. */
  legacy?: boolean;
}

const buildUrl = (
  endpoint: string,
  query?: RequestOptions['query'],
  legacy?: boolean
): string => {
  const prefix = legacy ? '' : CUSTOMER_API_PREFIX;
  const url = new URL(`${API_BASE_URL}${prefix}${endpoint}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
};

/**
 * Shared refresh promise. Concurrent 401s wait on one refresh call instead of
 * each firing their own and invalidating one another's rotated token.
 */
let refreshInFlight: Promise<boolean> | null = null;

const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const json = (await response.json()) as ApiEnvelope<AuthTokens>;
    if (!json.success || !json.data?.accessToken) return false;

    tokenStorage.setTokens(json.data.accessToken, json.data.refreshToken);
    return true;
  } catch {
    return false;
  }
};

const ensureRefreshed = (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();

  // A non-JSON body means the request never reached a route handler
  // (wrong base URL, proxy error page, server crash). The body of such a page
  // can carry infrastructure detail — server banners, internal hostnames,
  // stack traces — so it is surfaced only in development.
  const text = await response.text();
  const isDev = process.env.NODE_ENV !== 'production';
  throw new ApiError(
    response.ok
      ? 'Received an unexpected response from the server.'
      : `Server error (${response.status}). Please try again.`,
    response.status || 500,
    undefined,
    isDev && text ? [{ msg: text.slice(0, 300) }] : []
  );
};

const execute = async <T>(
  endpoint: string,
  options: RequestOptions,
  isRetry = false
): Promise<T> => {
  const { method = 'GET', body, query, headers = {}, signal, withAuth = true, legacy } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders: Record<string, string> = { ...headers };

  if (withAuth) {
    const token = tokenStorage.getAccessToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }
  if (!isFormData && body !== undefined && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(endpoint, query, legacy), {
      method,
      headers: requestHeaders,
      signal,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'Unable to reach the server. Check your connection and try again.',
      0
    );
  }

  // Session expired: refresh once, then replay the original request.
  if (response.status === 401 && withAuth && !isRetry && !options.skipRefresh) {
    const refreshed = await ensureRefreshed();
    if (refreshed) return execute<T>(endpoint, options, true);

    tokenStorage.clear();
    emitAuthExpired();
  }

  const json = (await parseResponse(response)) as ApiEnvelope<T> & {
    errorCode?: string;
    errors?: unknown[];
  };

  if (!response.ok || json?.success === false) {
    throw new ApiError(
      json?.message || 'Something went wrong. Please try again.',
      json?.statusCode || response.status,
      json?.errorCode,
      json?.errors ?? []
    );
  }

  return json.data as T;
};

export const apiClient = {
  get: <T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    execute<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    execute<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    execute<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    execute<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    execute<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default apiClient;
