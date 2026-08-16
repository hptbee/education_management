import { describe, expect, it } from "vitest";
import { resolveAccessState } from "./entitlement";
import type { EntitlementClaims } from "./types";

const baseClaims: EntitlementClaims = {
  userId: "usr_1",
  role: "teacher",
  plan: "trial",
  status: "active",
  permissions: { appAccess: true, cloudBackup: true },
  licenseVersion: 1,
  offlineValidUntil: Math.floor(Date.now() / 1000) + 86400,
};

describe("resolveAccessState", () => {
  it("requires auth without session", () => {
    expect(
      resolveAccessState({
        hasSession: false,
        claims: null,
        issuedAt: 0,
        lastTrustedIat: 0,
        isOnline: true,
      }),
    ).toBe("AUTH_REQUIRED");
  });

  it("allows offline grace when offline and within window", () => {
    expect(
      resolveAccessState({
        hasSession: true,
        claims: baseClaims,
        issuedAt: Math.floor(Date.now() / 1000),
        lastTrustedIat: Math.floor(Date.now() / 1000),
        isOnline: false,
      }),
    ).toBe("OFFLINE_GRACE");
  });

  it("requires verification after offline window", () => {
    expect(
      resolveAccessState({
        hasSession: true,
        claims: {
          ...baseClaims,
          offlineValidUntil: Math.floor(Date.now() / 1000) - 10,
        },
        issuedAt: Math.floor(Date.now() / 1000) - 100,
        lastTrustedIat: Math.floor(Date.now() / 1000) - 100,
        isOnline: false,
      }),
    ).toBe("ONLINE_VERIFICATION_REQUIRED");
  });
});
