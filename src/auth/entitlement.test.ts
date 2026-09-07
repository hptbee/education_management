import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as jose from "jose";
import {
  clearPersistedAccessDenial,
  isAccessLockoutState,
  mapApiCodeToAccessState,
  mapRefreshDenial,
  persistAccessDenial,
  readPersistedAccessDenial,
  resolveAccessState,
  verifyEntitlementToken,
} from "./entitlement";
import type { EntitlementClaims } from "./types";

const futureLicenseExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const baseClaims: EntitlementClaims = {
  userId: "usr_1",
  role: "teacher",
  plan: "trial",
  status: "active",
  permissions: { appAccess: true, cloudBackup: true },
  licenseVersion: 1,
  offlineValidUntil: Math.floor(Date.now() / 1000) + 86400,
  licenseExpiresAt: futureLicenseExpiry,
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

  it("returns ACCOUNT_DISABLED for disabled status", () => {
    expect(
      resolveAccessState({
        hasSession: true,
        claims: { ...baseClaims, status: "disabled" },
        issuedAt: Math.floor(Date.now() / 1000),
        lastTrustedIat: Math.floor(Date.now() / 1000),
        isOnline: true,
      }),
    ).toBe("ACCOUNT_DISABLED");
  });

  it("returns ACCOUNT_SUSPENDED for suspended status", () => {
    expect(
      resolveAccessState({
        hasSession: true,
        claims: { ...baseClaims, status: "suspended" },
        issuedAt: Math.floor(Date.now() / 1000),
        lastTrustedIat: Math.floor(Date.now() / 1000),
        isOnline: true,
      }),
    ).toBe("ACCOUNT_SUSPENDED");
  });

  it("requires verification on clock rollback", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(
      resolveAccessState({
        hasSession: true,
        claims: baseClaims,
        issuedAt: now,
        lastTrustedIat: now + 3600,
        isOnline: true,
      }),
    ).toBe("ONLINE_VERIFICATION_REQUIRED");
  });

  it("honors serverDenied override", () => {
    expect(
      resolveAccessState({
        hasSession: true,
        claims: baseClaims,
        issuedAt: Math.floor(Date.now() / 1000),
        lastTrustedIat: Math.floor(Date.now() / 1000),
        isOnline: true,
        serverDenied: "LICENSE_EXPIRED",
      }),
    ).toBe("LICENSE_EXPIRED");
  });

  it("locks when license expires even within offline grace", () => {
    const pastExpiry = new Date(Date.now() - 60_000).toISOString();
    expect(
      resolveAccessState({
        hasSession: true,
        claims: { ...baseClaims, licenseExpiresAt: pastExpiry },
        issuedAt: Math.floor(Date.now() / 1000),
        lastTrustedIat: Math.floor(Date.now() / 1000),
        isOnline: false,
      }),
    ).toBe("LICENSE_EXPIRED");
  });

  it("allows lifetime license with null expiry during offline grace", () => {
    expect(
      resolveAccessState({
        hasSession: true,
        claims: { ...baseClaims, plan: "lifetime", licenseExpiresAt: null },
        issuedAt: Math.floor(Date.now() / 1000),
        lastTrustedIat: Math.floor(Date.now() / 1000),
        isOnline: false,
      }),
    ).toBe("OFFLINE_GRACE");
  });

  it("requires online verification for legacy tokens missing signed licenseExpiresAt", () => {
    const { licenseExpiresAt: _removed, ...legacyClaims } = baseClaims;
    expect(
      resolveAccessState({
        hasSession: true,
        claims: legacyClaims,
        issuedAt: Math.floor(Date.now() / 1000),
        lastTrustedIat: Math.floor(Date.now() / 1000),
        isOnline: true,
      }),
    ).toBe("ONLINE_VERIFICATION_REQUIRED");
  });

  it("allows offline grace for legacy tokens missing signed licenseExpiresAt", () => {
    const { licenseExpiresAt: _removed, ...legacyClaims } = baseClaims;
    expect(
      resolveAccessState({
        hasSession: true,
        claims: legacyClaims,
        issuedAt: Math.floor(Date.now() / 1000),
        lastTrustedIat: Math.floor(Date.now() / 1000),
        isOnline: false,
      }),
    ).toBe("OFFLINE_GRACE");
  });
});

describe("mapApiCodeToAccessState", () => {
  it("maps known API codes", () => {
    expect(mapApiCodeToAccessState("ACCOUNT_DISABLED")).toBe("ACCOUNT_DISABLED");
    expect(mapApiCodeToAccessState("LICENSE_EXPIRED")).toBe("LICENSE_EXPIRED");
  });

  it("returns null for unknown codes", () => {
    expect(mapApiCodeToAccessState("UNKNOWN")).toBeNull();
  });
});

describe("mapRefreshDenial", () => {
  it("ignores AUTH_REQUIRED so local session can stay valid", () => {
    expect(mapRefreshDenial("AUTH_REQUIRED")).toBeNull();
  });

  it("maps account and license lockouts", () => {
    expect(mapRefreshDenial("LICENSE_EXPIRED")).toBe("LICENSE_EXPIRED");
    expect(mapRefreshDenial("ACCOUNT_DISABLED")).toBe("ACCOUNT_DISABLED");
  });
});

describe("access lockout persistence", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats license and account denials as lockouts, not login failures", () => {
    expect(isAccessLockoutState("LICENSE_EXPIRED")).toBe(true);
    expect(isAccessLockoutState("ACCOUNT_DISABLED")).toBe(true);
    expect(isAccessLockoutState("ACCOUNT_SUSPENDED")).toBe(true);
    expect(isAccessLockoutState("AUTH_REQUIRED")).toBe(false);
    expect(isAccessLockoutState("ONLINE_VERIFICATION_REQUIRED")).toBe(false);
    expect(isAccessLockoutState(mapApiCodeToAccessState("LICENSE_EXPIRED")!)).toBe(true);
    expect(isAccessLockoutState(mapApiCodeToAccessState("AUTH_REQUIRED")!)).toBe(false);
  });

  it("persists only lockout codes", () => {
    persistAccessDenial("LICENSE_EXPIRED");
    expect(readPersistedAccessDenial()).toBe("LICENSE_EXPIRED");
    persistAccessDenial("AUTH_REQUIRED");
    expect(readPersistedAccessDenial()).toBeNull();
  });

  it("clears persisted denial on logout", () => {
    persistAccessDenial("ACCOUNT_DISABLED");
    clearPersistedAccessDenial();
    expect(readPersistedAccessDenial()).toBeNull();
  });
});

describe("verifyEntitlementToken", () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY;

  afterEach(() => {
    if (originalEnv) {
      process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY;
    }
    vi.useRealTimers();
  });

  it("verifies a signed entitlement token", async () => {
    const { privateKey, publicKey } = await jose.generateKeyPair("EdDSA", { extractable: true });
    const publicKeyPem = await jose.exportSPKI(publicKey);
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = publicKeyPem;

    const now = Math.floor(Date.now() / 1000);
    const token = await new jose.SignJWT({
      userId: "usr_1",
      role: "teacher",
      plan: "trial",
      status: "active",
      permissions: { appAccess: true, cloudBackup: false },
      licenseVersion: 1,
      offlineValidUntil: now + 86400,
    })
      .setProtectedHeader({ alg: "EdDSA" })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);

    const verified = await verifyEntitlementToken(token);
    expect(verified?.claims.userId).toBe("usr_1");
    expect(verified?.claims.permissions.appAccess).toBe(true);
  });

  it("returns null for invalid token", async () => {
    const { publicKey } = await jose.generateKeyPair("EdDSA", { extractable: true });
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = await jose.exportSPKI(publicKey);
    expect(await verifyEntitlementToken("not-a-jwt")).toBeNull();
  });

  it("accepts single-line quoted PEM from dashboard env vars", async () => {
    const { privateKey, publicKey } = await jose.generateKeyPair("EdDSA", { extractable: true });
    const exported = await jose.exportSPKI(publicKey);
    const body = exported
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\s+/g, "");
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = `"-----BEGIN PUBLIC KEY----- ${body} -----END PUBLIC KEY-----"`;

    const now = Math.floor(Date.now() / 1000);
    const token = await new jose.SignJWT({
      userId: "usr_1",
      role: "teacher",
      plan: "trial",
      status: "active",
      permissions: { appAccess: true, cloudBackup: false },
      licenseVersion: 1,
      offlineValidUntil: now + 86400,
    })
      .setProtectedHeader({ alg: "EdDSA" })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);

    const verified = await verifyEntitlementToken(token);
    expect(verified?.claims.userId).toBe("usr_1");
  });
});
