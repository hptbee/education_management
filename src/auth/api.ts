import type { AuthApiError, AuthLicense, AuthUser } from "./types";
import { isTauri } from "@/src/database/tauri-fs.service";

export function getWorkerBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL?.trim();
  return url || null;
}

/** Web application client — `npm run dev` / browser. */
export function getGoogleWebClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return id || null;
}

/** Desktop app client — Tauri `.exe` PKCE loopback. Falls back to web client if unset. */
export function getGoogleDesktopClientId(): string | null {
  const desktop = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP?.trim();
  if (desktop) return desktop;
  return getGoogleWebClientId();
}

/** Active OAuth client for the current runtime (web vs desktop). */
export function getGoogleClientId(): string | null {
  if (typeof window !== "undefined" && isTauri()) {
    return getGoogleDesktopClientId();
  }
  return getGoogleWebClientId();
}

export interface GoogleAuthResult {
  ok: true;
  entitlement: string;
  user: AuthUser;
  license: AuthLicense;
}

export async function postAuthGoogle(body: Record<string, string>): Promise<GoogleAuthResult | AuthApiError> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) {
    return { ok: false, code: "VALIDATION_ERROR", error: "Worker URL not configured" };
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as GoogleAuthResult | AuthApiError;
  return json;
}

export async function refreshEntitlement(entitlement: string): Promise<GoogleAuthResult | AuthApiError> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) {
    return { ok: false, code: "VALIDATION_ERROR", error: "Worker URL not configured" };
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${entitlement}` },
  });

  return (await response.json()) as GoogleAuthResult | AuthApiError;
}

export async function fetchMe(entitlement: string): Promise<{ ok: true; user: AuthUser; license: AuthLicense | null } | AuthApiError> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) {
    return { ok: false, code: "VALIDATION_ERROR", error: "Worker URL not configured" };
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/me`, {
    headers: { Authorization: `Bearer ${entitlement}` },
  });

  return (await response.json()) as { ok: true; user: AuthUser; license: AuthLicense | null } | AuthApiError;
}

export interface CloudClassroomSummary {
  classroomId: string;
  key: string;
  updatedAt: string | null;
  size: number;
}

export async function listCloudClassrooms(entitlement: string): Promise<CloudClassroomSummary[]> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) return [];

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/classrooms`, {
    headers: { Authorization: `Bearer ${entitlement}` },
  });

  const json = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    code?: string;
    error?: string;
    classrooms?: CloudClassroomSummary[];
  };

  if (!response.ok) {
    throw new Error(json.error || `Không tải được danh sách lớp trên đám mây (${response.status}).`);
  }

  return json.classrooms ?? [];
}

export async function restoreCloudClassroom(entitlement: string, classroomId: string): Promise<unknown | null> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) return null;

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/restore/${encodeURIComponent(classroomId)}`,
    { headers: { Authorization: `Bearer ${entitlement}` } },
  );

  if (!response.ok) return null;
  return response.json();
}
