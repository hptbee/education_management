import type { ApiErrorCode } from "./types";
import type { Env } from "./types";

const CORS_METHODS = "GET, PUT, POST, PATCH, OPTIONS";
const CORS_HEADERS_LIST = "Content-Type, Authorization";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": CORS_METHODS,
  "Access-Control-Allow-Headers": CORS_HEADERS_LIST,
};

function buildCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_HEADERS_LIST,
    Vary: "Origin",
  };
}

export function resolveCorsHeaders(request: Request, env: Env): Record<string, string> {
  const allowlist = env.CORS_ALLOWED_ORIGINS?.trim();
  if (!allowlist) {
    return CORS_HEADERS;
  }

  const origin = request.headers.get("Origin");
  if (!origin) {
    return CORS_HEADERS;
  }

  const allowedOrigins = allowlist
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (allowedOrigins.includes(origin)) {
    return buildCorsHeaders(origin);
  }

  return {
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_HEADERS_LIST,
  };
}

export function applyCorsHeaders(response: Response, cors: Record<string, string>): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(code: ApiErrorCode, error: string, status: number): Response {
  return jsonResponse({ ok: false, code, error }, status);
}

export function readBearerToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  return token || null;
}

export const MAX_BODY_BYTES = 25 * 1024 * 1024;
export const MAX_JSON_BODY_BYTES = 64 * 1024;

export async function readBodyWithLimit(request: Request): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    throw new Error("Payload too large");
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new Error("Payload too large");
  }
  return text;
}

export async function readJsonWithLimit<T = unknown>(request: Request): Promise<T> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_JSON_BODY_BYTES) {
    throw new Error("Payload too large");
  }

  const text = await request.text();
  if (text.length > MAX_JSON_BODY_BYTES) {
    throw new Error("Payload too large");
  }

  return JSON.parse(text) as T;
}
