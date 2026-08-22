import type { ApiErrorCode } from "./types";
import type { Env } from "./types";

const CORS_METHODS = "GET, PUT, POST, PATCH, OPTIONS";
const CORS_HEADERS_LIST = "Content-Type, Authorization";

function corsBaseHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_HEADERS_LIST,
    Vary: "Origin",
  };
}

function buildCorsHeaders(origin: string): Record<string, string> {
  return {
    ...corsBaseHeaders(),
    "Access-Control-Allow-Origin": origin,
  };
}

export function resolveCorsHeaders(request: Request, env: Env): Record<string, string> {
  const allowlist = env.CORS_ALLOWED_ORIGINS?.trim();
  if (!allowlist) {
    return corsBaseHeaders();
  }

  const origin = request.headers.get("Origin");
  if (!origin) {
    return corsBaseHeaders();
  }

  const allowedOrigins = allowlist
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (allowedOrigins.includes(origin)) {
    return buildCorsHeaders(origin);
  }

  return corsBaseHeaders();
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

/** Client/request validation failures — mapped to HTTP 400 by the top-level catch. */
export class ValidationError extends Error {
  readonly name = "ValidationError";
  constructor(message: string) {
    super(message);
  }
}

export function readBearerToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  return token || null;
}

export const MAX_BODY_BYTES = 25 * 1024 * 1024;
export const MAX_JSON_BODY_BYTES = 64 * 1024;
export const MAX_SYNC_BATCH_FILES = 64;
export const MAX_SYNC_FILE_BYTES = 5 * 1024 * 1024;

async function readBodyWithMaxBytes(request: Request, maxBytes: number): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && contentLength !== "") {
    const len = Number(contentLength);
    if (!Number.isFinite(len) || len < 0) {
      throw new ValidationError("Invalid Content-Length");
    }
    if (len > maxBytes) {
      throw new ValidationError("Payload too large");
    }
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ValidationError("Payload too large");
    }
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return text;
}

export async function readBodyWithLimit(request: Request): Promise<string> {
  return readBodyWithMaxBytes(request, MAX_BODY_BYTES);
}

export async function readJsonWithLimit<T = unknown>(request: Request): Promise<T> {
  const text = await readBodyWithMaxBytes(request, MAX_JSON_BODY_BYTES);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ValidationError("Invalid request body");
  }
}
