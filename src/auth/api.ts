import type { AuthApiError, AuthLicense, AuthUser } from "./types";

export function getWorkerBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL?.trim();
  return url || null;
}

export function getGoogleClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return id || null;
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

  if (!response.ok) return [];
  const json = (await response.json()) as { classrooms?: CloudClassroomSummary[] };
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
