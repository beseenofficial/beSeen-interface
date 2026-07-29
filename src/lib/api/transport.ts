import { deleteSecureRecord, getSecureJson, setSecureJson } from '@/lib/secure-storage';
import type { AuthTokens } from '@/types';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000'
).replace(/\/$/, '');

export type ValidationIssue = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly issues: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ErrorEnvelope = {
  status: 'error';
  message: string;
  result: { code?: string; issues?: ValidationIssue[] };
};

export async function parseEnvelope<T>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError('The API returned an unreadable response.', response.status, 'MALFORMED_RESPONSE');
  }
  if (!body || typeof body !== 'object') {
    throw new ApiError('The API returned a malformed response.', response.status, 'MALFORMED_RESPONSE');
  }
  const envelope = body as { status?: unknown; message?: unknown; result?: unknown };
  if (response.ok && envelope.status === 'success' && 'result' in envelope) {
    return envelope.result as T;
  }
  const result = envelope.result as ErrorEnvelope['result'] | undefined;
  throw new ApiError(
    typeof envelope.message === 'string' ? envelope.message : `API request failed (${response.status}).`,
    response.status,
    typeof result?.code === 'string' ? result.code : response.status === 429 ? 'RATE_LIMITED' : 'API_ERROR',
    Array.isArray(result?.issues) ? result.issues : [],
  );
}

const REFRESH_RECORD = 'session:refresh-token';
let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

async function storedRefreshToken(): Promise<string | null> {
  const record = await getSecureJson<{ refreshToken: string }>(REFRESH_RECORD);
  return typeof record?.refreshToken === 'string' ? record.refreshToken : null;
}

export async function storeSession(tokens: AuthTokens): Promise<void> {
  accessToken = tokens.accessToken;
  await setSecureJson(REFRESH_RECORD, { refreshToken: tokens.refreshToken });
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  await deleteSecureRecord(REFRESH_RECORD);
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
  retryAfterRefresh?: boolean;
};

async function fetchEnvelope<T>(
  path: string,
  options: RequestOptions,
): Promise<{ result: T; status: number }> {
  const headers = new Headers({ Accept: 'application/json' });
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.auth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  try {
    return { result: await parseEnvelope<T>(response), status: response.status };
  } catch (cause) {
    if (
      cause instanceof ApiError &&
      cause.status === 401 &&
      options.auth &&
      options.retryAfterRefresh !== false
    ) {
      await refreshSessionSingleFlight();
      return fetchEnvelope<T>(path, { ...options, retryAfterRefresh: false });
    }
    throw cause;
  }
}

async function performRefresh(): Promise<void> {
  const refreshToken = await storedRefreshToken();
  if (!refreshToken) throw new ApiError('No session can be restored.', 401, 'REFRESH_TOKEN_INVALID');
  try {
    const { result } = await fetchEnvelope<{ auth: AuthTokens }>('/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      retryAfterRefresh: false,
    });
    await storeSession(result.auth);
  } catch (cause) {
    await clearSession();
    throw cause;
  }
}

export function refreshSessionSingleFlight(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function restoreSession(): Promise<boolean> {
  if (!(await storedRefreshToken())) return false;
  try {
    await refreshSessionSingleFlight();
    return true;
  } catch {
    return false;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return (await fetchEnvelope<T>(path, options)).result;
}

export async function apiRequestWithStatus<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ result: T; status: number }> {
  return fetchEnvelope<T>(path, options);
}
