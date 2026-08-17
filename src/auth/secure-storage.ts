import type { StoredAuthSession } from "./types";
import { isTauri } from "@/src/database/tauri-fs.service";

const WEB_SESSION_KEY = "education-management:auth-session";

export async function loadAuthSession(): Promise<StoredAuthSession | null> {
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

  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WEB_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: StoredAuthSession): Promise<void> {
  const payload = JSON.stringify(session);
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("save_entitlement", { payload });
    return;
  }

  if (typeof window !== "undefined") {
    sessionStorage.setItem(WEB_SESSION_KEY, payload);
  }
}

export async function clearAuthSession(): Promise<void> {
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
    sessionStorage.removeItem(WEB_SESSION_KEY);
  }
}
