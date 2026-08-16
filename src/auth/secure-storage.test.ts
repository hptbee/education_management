import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredAuthSession } from "./types";

vi.mock("@/src/database/tauri-fs.service", () => ({
  isTauri: vi.fn(() => false),
}));

import { clearAuthSession, loadAuthSession, saveAuthSession } from "./secure-storage";
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

describe("secure-storage web", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.mocked(isTauri).mockReturnValue(false);
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("saves and loads session", async () => {
    await saveAuthSession(session);
    const loaded = await loadAuthSession();
    expect(loaded?.entitlement).toBe("token");
  });

  it("clears session", async () => {
    await saveAuthSession(session);
    await clearAuthSession();
    expect(await loadAuthSession()).toBeNull();
  });
});

describe("secure-storage tauri", () => {
  beforeEach(() => {
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
});
