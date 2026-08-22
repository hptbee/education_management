import { describe, expect, it, vi } from "vitest";
import { reconcileStoredSessionOnline } from "./auth-session-reconcile";

vi.mock("@/src/auth/api", () => ({
  refreshEntitlement: vi.fn(),
  fetchMe: vi.fn(),
}));

vi.mock("@/src/auth/entitlement", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/auth/entitlement")>();
  return {
    ...actual,
    verifyEntitlementToken: vi.fn().mockResolvedValue({ issuedAt: 1000, claims: {} }),
  };
});

import { fetchMe, refreshEntitlement } from "@/src/auth/api";

const stored = {
  entitlement: "old-token",
  user: { id: "u1", email: "a@b.com", displayName: "A", avatarUrl: null, role: "teacher" as const, status: "active" as const },
  license: null,
  lastVerifiedAt: "2026-01-01T00:00:00.000Z",
  lastTrustedIat: 1000,
};

const sampleLicense = {
  id: "lic-1",
  plan: "premium" as const,
  status: "active",
  startsAt: "2026-01-01T00:00:00.000Z",
  expiresAt: null,
};

describe("reconcileStoredSessionOnline", () => {
  it("returns updated session when refresh succeeds", async () => {
    vi.mocked(refreshEntitlement).mockResolvedValue({
      ok: true,
      entitlement: "new-token",
      user: stored.user,
      license: sampleLicense,
    });

    const result = await reconcileStoredSessionOnline(stored);
    expect(result.kind).toBe("updated");
    if (result.kind === "updated") {
      expect(result.session.entitlement).toBe("new-token");
    }
  });

  it("falls back to /me when refresh returns AUTH_REQUIRED", async () => {
    vi.mocked(refreshEntitlement).mockResolvedValue({
      ok: false,
      code: "AUTH_REQUIRED",
      error: "Entitlement outdated",
    });
    vi.mocked(fetchMe).mockResolvedValue({
      ok: true,
      user: stored.user,
      license: null,
    });

    const result = await reconcileStoredSessionOnline(stored);
    expect(result.kind).toBe("updated");
    expect(fetchMe).toHaveBeenCalledWith("old-token");
  });

  it("denies when refresh and /me both return AUTH_REQUIRED", async () => {
    vi.mocked(refreshEntitlement).mockResolvedValue({
      ok: false,
      code: "AUTH_REQUIRED",
      error: "Entitlement outdated",
    });
    vi.mocked(fetchMe).mockResolvedValue({
      ok: false,
      code: "AUTH_REQUIRED",
      error: "Entitlement outdated",
    });

    const result = await reconcileStoredSessionOnline(stored);
    expect(result).toEqual({ kind: "denied", access: "AUTH_REQUIRED" });
  });
});
