export type UserRole = "admin" | "teacher";
export type UserStatus = "active" | "disabled" | "suspended";
export type LicensePlan = "trial" | "basic" | "premium" | "lifetime";

export type AccessState =
  | "AUTHENTICATED_AND_ACTIVE"
  | "OFFLINE_GRACE"
  | "LICENSE_EXPIRED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_SUSPENDED"
  | "AUTH_REQUIRED"
  | "ONLINE_VERIFICATION_REQUIRED";

export type LoginStep = "opening_browser" | "waiting_callback" | "verifying";

export interface EntitlementPermissions {
  appAccess: boolean;
  cloudBackup: boolean;
}

export interface EntitlementClaims {
  userId: string;
  role: UserRole;
  plan: LicensePlan;
  status: UserStatus;
  permissions: EntitlementPermissions;
  licenseVersion: number;
  offlineValidUntil: number;
  /** ISO timestamp; null for lifetime. Must come from signed JWT, not session JSON. */
  licenseExpiresAt?: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface AuthLicense {
  id: string;
  plan: LicensePlan;
  status: string;
  startsAt: string;
  expiresAt: string | null;
}

export interface StoredAuthSession {
  entitlement: string;
  user: AuthUser;
  license: AuthLicense | null;
  lastVerifiedAt: string;
  lastTrustedIat: number;
}

export interface AuthApiError {
  ok: false;
  code: string;
  error: string;
}
