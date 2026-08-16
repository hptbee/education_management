import * as jose from "jose";
import type {
  ApiErrorCode,
  DbLicense,
  DbUser,
  EntitlementClaims,
  EntitlementPermissions,
  Env,
  LicensePlan,
} from "./types";

const OFFLINE_GRACE_SECONDS = 30 * 24 * 60 * 60;
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export function permissionsForPlan(plan: LicensePlan): EntitlementPermissions {
  switch (plan) {
    case "basic":
      return { appAccess: true, cloudBackup: false };
    case "trial":
    case "premium":
    case "lifetime":
      return { appAccess: true, cloudBackup: true };
  }
}

export function accessErrorForUser(user: DbUser): ApiErrorCode | null {
  if (user.status === "disabled") return "ACCOUNT_DISABLED";
  if (user.status === "suspended") return "ACCOUNT_SUSPENDED";
  if (user.status !== "active") return "ACCOUNT_DISABLED";
  return null;
}

export function accessErrorForLicense(license: DbLicense | null): ApiErrorCode | null {
  if (!license) return "LICENSE_EXPIRED";
  if (license.status === "disabled" || license.status === "cancelled") return "LICENSE_EXPIRED";
  if (license.status === "expired") return "LICENSE_EXPIRED";
  if (license.expires_at && license.expires_at <= new Date().toISOString()) return "LICENSE_EXPIRED";
  return null;
}

let cachedPrivateKeyPem: string | null = null;
let cachedPrivateKey: CryptoKey | null = null;
const publicKeyCache = new Map<string, CryptoKey>();

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  if (cachedPrivateKey && cachedPrivateKeyPem === pem) return cachedPrivateKey;
  cachedPrivateKeyPem = pem;
  cachedPrivateKey = await jose.importPKCS8(pem, "EdDSA");
  return cachedPrivateKey;
}

export async function importPublicKeyFromPem(pem: string): Promise<CryptoKey> {
  const cached = publicKeyCache.get(pem);
  if (cached) return cached;
  const key = await jose.importSPKI(pem, "EdDSA");
  publicKeyCache.set(pem, key);
  return key;
}

export async function signEntitlement(
  env: Env,
  user: DbUser,
  license: DbLicense,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const permissions = permissionsForPlan(license.plan);
  const claims: EntitlementClaims = {
    userId: user.id,
    role: user.role,
    plan: license.plan,
    status: user.status,
    permissions,
    licenseVersion: user.license_version,
    offlineValidUntil: issuedAt + OFFLINE_GRACE_SECONDS,
  };

  const privateKey = await importPrivateKey(env.ENTITLEMENT_PRIVATE_KEY);
  return await new jose.SignJWT(claims as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + TOKEN_TTL_SECONDS)
    .sign(privateKey);
}

export async function verifyEntitlement(
  env: Env,
  token: string,
): Promise<{ claims: EntitlementClaims; issuedAt: number; expiresAt: number }> {
  const publicKey = await importPublicKeyFromPem(env.ENTITLEMENT_PUBLIC_KEY);
  const { payload, protectedHeader } = await jose.jwtVerify(token, publicKey, {
    algorithms: ["EdDSA"],
  });

  if (protectedHeader.alg !== "EdDSA") {
    throw new Error("Invalid algorithm");
  }

  const claims = payload as unknown as EntitlementClaims;
  if (!claims.userId || !claims.permissions?.appAccess) {
    throw new Error("Invalid entitlement");
  }

  return {
    claims,
    issuedAt: payload.iat ?? 0,
    expiresAt: payload.exp ?? 0,
  };
}

export function publicUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    role: user.role,
    status: user.status,
  };
}

export function publicLicense(license: DbLicense) {
  return {
    id: license.id,
    plan: license.plan,
    status: license.status,
    startsAt: license.starts_at,
    expiresAt: license.expires_at,
  };
}
