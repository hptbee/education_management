export interface Env {
  BACKUP_BUCKET: R2Bucket;
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_ID_DESKTOP?: string;
  /** Optional — desktop token exchange only; set via `wrangler secret put` (never in the app). */
  GOOGLE_CLIENT_SECRET?: string;
  ENTITLEMENT_PRIVATE_KEY: string;
  ENTITLEMENT_PUBLIC_KEY: string;
  INITIAL_ADMIN_GOOGLE_SUB?: string;
  DEFAULT_TRIAL_DAYS?: string;
  CORS_ALLOWED_ORIGINS?: string;
}

export type UserRole = "admin" | "teacher";
export type UserStatus = "active" | "disabled" | "suspended";
export type LicensePlan = "trial" | "basic" | "premium" | "lifetime";
export type LicenseStatus = "active" | "expired" | "disabled" | "cancelled";

export interface DbUser {
  id: string;
  google_sub: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  license_version: number;
  created_at: string;
  updated_at: string;
}

export interface DbLicense {
  id: string;
  user_id: string;
  plan: LicensePlan;
  status: LicenseStatus;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

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
  /** ISO timestamp; null for lifetime. Signed — do not trust session JSON for expiry. */
  licenseExpiresAt?: string | null;
}

export interface GoogleProfile {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_SUSPENDED"
  | "LICENSE_EXPIRED"
  | "OFFLINE_VERIFICATION_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export interface BackupUploadBody {
  classroomId: string;
  fileName: string;
  schemaVersion: number;
  timestamp: string;
  payload: unknown;
}

export interface SyncFileUpload {
  path: string;
  content: string;
  contentType?: string;
  encoding?: "base64";
}

export interface SyncUploadBody {
  classroomKey: string;
  files: SyncFileUpload[];
  registry?: string;
}
