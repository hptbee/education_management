import { fetchMe, refreshEntitlement } from "@/src/auth/api";
import { mapApiCodeToAccessState, verifyEntitlementToken } from "@/src/auth/entitlement";
import type { AccessState, StoredAuthSession } from "@/src/auth/types";

export type SessionReconcileResult =
  | { kind: "updated"; session: StoredAuthSession }
  | { kind: "denied"; access: AccessState }
  | { kind: "unchanged" };

/** Refresh entitlement online; fall back to /me when refresh rejects the token. */
export async function reconcileStoredSessionOnline(
  stored: StoredAuthSession,
): Promise<SessionReconcileResult> {
  const refreshed = await refreshEntitlement(stored.entitlement);
  if (refreshed.ok) {
    const verified = await verifyEntitlementToken(refreshed.entitlement);
    return {
      kind: "updated",
      session: {
        entitlement: refreshed.entitlement,
        user: refreshed.user,
        license: refreshed.license,
        lastVerifiedAt: new Date().toISOString(),
        lastTrustedIat: verified?.issuedAt ?? Math.floor(Date.now() / 1000),
      },
    };
  }

  const denied = mapApiCodeToAccessState(refreshed.code);
  if (denied === "AUTH_REQUIRED") {
    const me = await fetchMe(stored.entitlement);
    if (!me.ok) {
      return { kind: "denied", access: mapApiCodeToAccessState(me.code) ?? "AUTH_REQUIRED" };
    }
    return {
      kind: "updated",
      session: {
        ...stored,
        user: me.user,
        license: me.license,
        lastVerifiedAt: new Date().toISOString(),
      },
    };
  }

  if (denied) {
    return { kind: "denied", access: denied };
  }

  return { kind: "unchanged" };
}

export function isRevokedAuthDenial(access: AccessState): boolean {
  return access === "AUTH_REQUIRED";
}
