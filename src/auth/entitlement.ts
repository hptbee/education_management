import * as jose from "jose";
import type { AccessState, EntitlementClaims } from "./types";

const CLOCK_ROLLBACK_TOLERANCE_SECONDS = 5 * 60;
const OFFLINE_GRACE_SECONDS = 30 * 24 * 60 * 60;

let cachedPublicKey: CryptoKey | null = null;
let cachedPublicKeyPem: string | null = null;

function getPublicKeyPem(): string | null {
  const pem = process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY?.trim();
  return pem || null;
}

async function importPublicKey(): Promise<CryptoKey | null> {
  const pem = getPublicKeyPem();
  if (!pem) return null;
  if (cachedPublicKey && cachedPublicKeyPem === pem) return cachedPublicKey;
  cachedPublicKeyPem = pem;
  cachedPublicKey = await jose.importSPKI(pem, "EdDSA");
  return cachedPublicKey;
}

export async function verifyEntitlementToken(
  token: string,
): Promise<{ claims: EntitlementClaims; issuedAt: number; expiresAt: number } | null> {
  const publicKey = await importPublicKey();
  if (!publicKey) return null;

  try {
    const { payload } = await jose.jwtVerify(token, publicKey, {
      algorithms: ["EdDSA"],
      clockTolerance: OFFLINE_GRACE_SECONDS,
    });
    const claims = payload as unknown as EntitlementClaims;
    if (!claims.userId || !claims.permissions?.appAccess) return null;
    claims.licenseVersion = Number(claims.licenseVersion);
    claims.offlineValidUntil = Number(claims.offlineValidUntil);
    if (claims.licenseExpiresAt === undefined) {
      claims.licenseExpiresAt = null;
    }
    return {
      claims,
      issuedAt: payload.iat ?? 0,
      expiresAt: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}

export function resolveAccessState(input: {
  hasSession: boolean;
  claims: EntitlementClaims | null;
  issuedAt: number;
  lastTrustedIat: number;
  isOnline: boolean;
  serverDenied?: AccessState | null;
  licenseExpiresAt?: string | null;
}): AccessState {
  if (input.serverDenied) return input.serverDenied;
  if (!input.hasSession || !input.claims) return "AUTH_REQUIRED";

  const now = Math.floor(Date.now() / 1000);
  if (input.lastTrustedIat > 0 && now < input.lastTrustedIat - CLOCK_ROLLBACK_TOLERANCE_SECONDS) {
    return "ONLINE_VERIFICATION_REQUIRED";
  }

  if (input.claims.status === "disabled") return "ACCOUNT_DISABLED";
  if (input.claims.status === "suspended") return "ACCOUNT_SUSPENDED";

  const plan = input.claims.plan;
  if (plan !== "lifetime") {
    const signedExpiry = input.claims.licenseExpiresAt;
    if (!signedExpiry) {
      return "LICENSE_EXPIRED";
    }
    const expiryMs = Date.parse(signedExpiry);
    if (Number.isNaN(expiryMs) || Date.now() >= expiryMs) {
      return "LICENSE_EXPIRED";
    }
  }

  if (now <= input.claims.offlineValidUntil) {
    return input.isOnline ? "AUTHENTICATED_AND_ACTIVE" : "OFFLINE_GRACE";
  }

  return "ONLINE_VERIFICATION_REQUIRED";
}

export function mapApiCodeToAccessState(code: string | undefined): AccessState | null {
  switch (code) {
    case "ACCOUNT_DISABLED":
      return "ACCOUNT_DISABLED";
    case "ACCOUNT_SUSPENDED":
      return "ACCOUNT_SUSPENDED";
    case "LICENSE_EXPIRED":
      return "LICENSE_EXPIRED";
    case "AUTH_REQUIRED":
      return "AUTH_REQUIRED";
    default:
      return null;
  }
}

/** Refresh/me failures with AUTH_REQUIRED should not wipe a locally verifiable session. */
export function mapRefreshDenial(code: string | undefined): AccessState | null {
  const denied = mapApiCodeToAccessState(code);
  return denied === "AUTH_REQUIRED" ? null : denied;
}
