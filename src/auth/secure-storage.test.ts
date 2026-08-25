import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredAuthSession } from "./types";

vi.mock("@/src/database/tauri-fs.service", () => ({
  isTauri: vi.fn(() => false),
}));

import { clearAuthSession, loadAuthSession, rememberAuthSession, resetAuthSessionCacheForTests, saveAuthSession } from "./secure-storage";
import { isTauri } from "@/src/database/tauri-fs.service";

const session: StoredAuthSession = {
  entitlement: "token",
  user: {
    id: "usr_1",
    email: "a@example.com",
    displayName: "A",
    avatarUrl: null,
    role: "teacher",
    status: "active",
  },
  license: {
    id: "lic_1",
    plan: "trial",
    status: "active",
    startsAt: "2026-01-01T00:00:00.000Z",
    expiresAt: null,
  },
  lastVerifiedAt: "2026-01-01T00:00:00.000Z",
  lastTrustedIat: 1,
};

function memoryStorage(store: Record<string, string>) {
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

describe("secure-storage web", () => {
  const localStore: Record<string, string> = {};
  const sessionStore: Record<string, string> = {};

  beforeEach(() => {
    resetAuthSessionCacheForTests();
    vi.mocked(isTauri).mockReturnValue(false);
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", memoryStorage(localStore));
    vi.stubGlobal("sessionStorage", memoryStorage(sessionStore));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.keys(localStore).forEach((k) => delete localStore[k]);
    Object.keys(sessionStore).forEach((k) => delete sessionStore[k]);
  });

  it("saves and loads session from localStorage after cache reset", async () => {
    await saveAuthSession(session);
    resetAuthSessionCacheForTests();
    const loaded = await loadAuthSession();
    expect(loaded?.entitlement).toBe("token");
    expect(sessionStore["education-management:auth-session"]).toBeUndefined();
  });

  it("migrates a leftover sessionStorage payload into localStorage", async () => {
    sessionStore["education-management:auth-session"] = JSON.stringify(session);
    const loaded = await loadAuthSession();
    expect(loaded?.entitlement).toBe("token");
    expect(localStore["education-management:auth-session"]).toBeTruthy();
    expect(sessionStore["education-management:auth-session"]).toBeUndefined();
  });

  it("clears session", async () => {
    await saveAuthSession(session);
    await clearAuthSession();
    expect(await loadAuthSession()).toBeNull();
  });

  it("uses in-memory session when store is empty", async () => {
    rememberAuthSession(session);
    expect(await loadAuthSession()).toEqual(session);
  });
});

describe("secure-storage tauri", () => {
  beforeEach(() => {
    resetAuthSessionCacheForTests();
    vi.mocked(isTauri).mockReturnValue(true);
    vi.doMock("@tauri-apps/api/core", () => ({
      invoke: vi.fn().mockResolvedValue(JSON.stringify(session)),
    }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("loads via invoke when tauri", async () => {
    const invoke = vi.fn().mockResolvedValue(JSON.stringify(session));
    vi.doMock("@tauri-apps/api/core", () => ({ invoke }));
    vi.resetModules();
    const mod = await import("./secure-storage");
    const loaded = await mod.loadAuthSession();
    expect(loaded?.entitlement).toBe("token");
  });

  it("surfaces secure storage failures instead of treating them as logout", async () => {
    const invoke = vi
      .fn()
      .mockRejectedValueOnce(new Error("credential store unavailable"))
      .mockResolvedValueOnce(JSON.stringify(session));
    vi.doMock("@tauri-apps/api/core", () => ({ invoke }));
    vi.resetModules();
    const mod = await import("./secure-storage");
    await expect(mod.loadAuthSession()).rejects.toThrow("credential store unavailable");
    await expect(mod.loadAuthSession()).resolves.toEqual(session);
  });
});
