import type { StoredAuthSession } from "./types";
import { isTauri } from "@/src/database/tauri-fs.service";

const WEB_SESSION_KEY = "education-management:auth-session";

/** In-memory copy so cloud restore can use the live Auth session if keychain/localStorage lags. */
let cachedSession: StoredAuthSession | null | undefined;

export function rememberAuthSession(session: StoredAuthSession | null): void {
  cachedSession = session;
}

export function resetAuthSessionCacheForTests(): void {
  cachedSession = undefined;
}

export async function loadAuthSession(): Promise<StoredAuthSession | null> {
  if (cachedSession !== undefined) {
    return cachedSession;
  }

  const loaded = await loadAuthSessionFromStore();
  if (loaded) {
    cachedSession = loaded;
  }
  return loaded;
}

function readWebStoredPayload(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLocal = localStorage.getItem(WEB_SESSION_KEY);
    if (fromLocal) return fromLocal;
    const fromSession = sessionStorage.getItem(WEB_SESSION_KEY);
    if (!fromSession) return null;
    localStorage.setItem(WEB_SESSION_KEY, fromSession);
    sessionStorage.removeItem(WEB_SESSION_KEY);
    return fromSession;
  } catch {
    return null;
  }
}

async function loadAuthSessionFromStore(): Promise<StoredAuthSession | null> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const raw = await invoke<string | null>("load_entitlement");
      if (!raw) return null;
      return JSON.parse(raw) as StoredAuthSession;
    } catch (error) {
      console.warn("[secure-storage] loadAuthSession failed:", error);
      return null;
    }
  }

  const raw = readWebStoredPayload();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: StoredAuthSession): Promise<void> {
  cachedSession = session;
  const payload = JSON.stringify(session);
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("save_entitlement", { payload });
    return;
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(WEB_SESSION_KEY, payload);
    sessionStorage.removeItem(WEB_SESSION_KEY);
  }
}

export async function clearAuthSession(): Promise<void> {
  cachedSession = null;
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("clear_entitlement");
    } catch {
      // ignore
    }
    return;
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(WEB_SESSION_KEY);
    sessionStorage.removeItem(WEB_SESSION_KEY);
  }
}
