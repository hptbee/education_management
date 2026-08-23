import type { AuthApiError, AuthLicense, AuthUser } from "./types";
import { isTauri } from "@/src/database/tauri-fs.service";
import { logCloudTrace } from "@/src/logging/app-log";

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

export async function postAuthLogout(entitlement: string): Promise<void> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) return;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${entitlement}` },
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Logout revoke failed (${response.status})`);
  }
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
  name?: string | null;
  schoolYear?: string | null;
  archived?: boolean;
}

export async function listCloudClassrooms(
  entitlement: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CloudClassroomSummary[]> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) return [];

  const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/classrooms`, {
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

export interface FetchClassroomsRegistryResult {
  registry: import("@/src/database/backup/cloud-types").CloudClassroomsRegistryFile | null;
  source: "registry" | "legacy" | "missing";
}

export async function fetchClassroomsRegistry(
  entitlement: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchClassroomsRegistryResult> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) {
    return { registry: null, source: "missing" };
  }

  const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/classrooms/registry`, {
    headers: { Authorization: `Bearer ${entitlement}` },
  });

  if (response.status === 404) {
    return { registry: null, source: "missing" };
  }

  if (!response.ok) {
    throw new Error(`Không tải được registry lớp học (${response.status}).`);
  }

  const json = (await response.json()) as {
    ok?: boolean;
    registry?: FetchClassroomsRegistryResult["registry"];
    source?: "registry";
  };

  return {
    registry: json.registry ?? null,
    source: json.registry ? "registry" : "missing",
  };
}

export async function restoreCloudClassroom(
  entitlement: string,
  classroomId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown | null> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) return null;

  const response = await fetchImpl(
    `${baseUrl.replace(/\/$/, "")}/restore/${encodeURIComponent(classroomId)}`,
    { headers: { Authorization: `Bearer ${entitlement}` } },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logCloudTrace("error", "cloud-restore", "GET /restore", {
      classroomId,
      status: response.status,
      body: body.slice(0, 300),
    });
    if (response.status === 404) return null;
    throw new Error(`Không thể tải bản sao lưu trên đám mây (${response.status}).`);
  }

  logCloudTrace("info", "cloud-restore", "GET /restore", {
    classroomId,
    status: response.status,
  });
  return response.json();
}

export async function restoreCloudClassroomAssets(
  entitlement: string,
  classroomId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Array<{ path: string; content: string; encoding?: string }>> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) {
    throw new Error("Cloud backup chưa được cấu hình (thiếu URL Worker).");
  }

  const allAssets: Array<{ path: string; content: string; encoding?: string }> = [];
  let cursor: string | null = null;

  for (;;) {
    const url = new URL(`${baseUrl.replace(/\/$/, "")}/restore/${encodeURIComponent(classroomId)}/assets`);
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const response = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${entitlement}` },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logCloudTrace("error", "cloud-restore", "GET /restore/assets failed", {
        classroomId,
        status: response.status,
        body: body.slice(0, 300),
      });
      throw new Error(`Không thể tải ảnh lớp từ đám mây (${response.status}).`);
    }

    const json = (await response.json().catch(() => ({}))) as {
      assets?: Array<{ path: string; content: string; encoding?: string }>;
      nextCursor?: string | null;
    };
    allAssets.push(...(json.assets ?? []));
    cursor = json.nextCursor ?? null;
    if (!cursor) break;
  }

  logCloudTrace("info", "cloud-restore", "GET /restore/assets ok", {
    classroomId,
    count: allAssets.length,
    paths: allAssets.map((item) => item.path),
    encodings: allAssets.map((item) => item.encoding ?? "missing"),
  });
  return allAssets;
}
