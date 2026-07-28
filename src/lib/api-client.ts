"use client";

import {
  deleteSecureRecord,
  getSecureJson,
  putSecureJson,
} from "@/lib/secure-storage";
import type {
  ApiErrorBody,
  ApiSuccess,
  AuthTokens,
} from "@/types";

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_BESEEN_API_URL || "http://localhost:5000/v1";
export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");
const SESSION_RECORD_ID = "session:current";

let memorySession: AuthTokens | null = null;
let sessionLoaded = false;
let refreshPromise: Promise<AuthTokens> | null = null;

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = "ApiError";
  }

  get code() {
    return this.body.result.code;
  }

  get issues() {
    return this.body.result.issues ?? [];
  }
}

export async function loadApiSession(): Promise<AuthTokens | null> {
  if (sessionLoaded) return memorySession;
  memorySession = await getSecureJson<AuthTokens>(SESSION_RECORD_ID);
  sessionLoaded = true;
  return memorySession;
}

export async function setApiSession(tokens: AuthTokens): Promise<void> {
  memorySession = tokens;
  sessionLoaded = true;
  await putSecureJson(SESSION_RECORD_ID, tokens);
}

export async function clearApiSession(): Promise<void> {
  memorySession = null;
  sessionLoaded = true;
  await deleteSecureRecord(SESSION_RECORD_ID);
}

function errorBody(statusCode: number, value: unknown): ApiErrorBody {
  if (
    value &&
    typeof value === "object" &&
    "status" in value &&
    value.status === "error" &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value as ApiErrorBody;
  }
  return {
    status: "error",
    message:
      statusCode >= 500
        ? "BeSeen is temporarily unavailable. Please try again."
        : "BeSeen returned an unexpected response.",
    result: { code: "UNEXPECTED_RESPONSE" },
  };
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function refreshSession(): Promise<AuthTokens> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const current = await loadApiSession();
    if (!current) {
      throw new ApiError(401, {
        status: "error",
        message: "Your BeSeen session has expired.",
        result: { code: "REFRESH_TOKEN_INVALID" },
      });
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    const body = await parseJson(response);
    if (!response.ok) {
      await clearApiSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("beseen:session-expired"));
      }
      throw new ApiError(response.status, errorBody(response.status, body));
    }
    const tokens = (body as ApiSuccess<{ auth: AuthTokens }>).result.auth;
    await setApiSession(tokens);
    return tokens;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { authenticated?: boolean; retryAfterRefresh?: boolean } = {},
): Promise<T> {
  const authenticated = options.authenticated ?? false;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");

  if (authenticated) {
    const session = await loadApiSession();
    if (!session) {
      throw new ApiError(401, {
        status: "error",
        message: "Sign in to continue.",
        result: { code: "UNAUTHORIZED" },
      });
    }
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (cause) {
    throw new Error(
      "We couldn't reach BeSeen. Make sure the local service is running, then try again.",
      { cause },
    );
  }

  const body = await parseJson(response);
  const parsedError = errorBody(response.status, body);
  const canRefresh =
    authenticated &&
    response.status === 401 &&
    parsedError.result.code === "UNAUTHORIZED" &&
    options.retryAfterRefresh !== false;

  if (canRefresh) {
    await refreshSession();
    return apiRequest<T>(path, init, {
      authenticated: true,
      retryAfterRefresh: false,
    });
  }

  if (!response.ok || (body as { status?: string } | null)?.status === "error") {
    throw new ApiError(response.status, parsedError);
  }

  return (body as ApiSuccess<T>).result;
}
