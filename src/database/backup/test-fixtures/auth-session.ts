import type { EntitlementClaims, StoredAuthSession } from "@/src/auth/types";

export const testAuthUser: StoredAuthSession["user"] = {
  id: "usr_test",
  email: "test@example.com",
  displayName: "Test User",
  avatarUrl: null,
  role: "teacher",
  status: "active",
};

export function makeTestStoredAuthSession(
  overrides?: Partial<StoredAuthSession>,
): StoredAuthSession {
  return {
    entitlement: "test-entitlement-token",
    user: testAuthUser,
    license: null,
    lastVerifiedAt: new Date().toISOString(),
    lastTrustedIat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

export function makeTestEntitlementClaims(
  overrides?: Partial<EntitlementClaims>,
): EntitlementClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    userId: "usr_test",
    role: "teacher",
    plan: "premium",
    status: "active",
    permissions: { appAccess: true, cloudBackup: true },
    licenseVersion: 1,
    offlineValidUntil: now + 3600,
    ...overrides,
  };
}

export function makeTestVerifiedEntitlement(overrides?: Partial<EntitlementClaims>) {
  const now = Math.floor(Date.now() / 1000);
  return {
    claims: makeTestEntitlementClaims(overrides),
    issuedAt: now,
    expiresAt: now + 3600,
  };
}
