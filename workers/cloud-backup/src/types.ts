export interface Env {
  BACKUP_BUCKET: R2Bucket;
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  ENTITLEMENT_PRIVATE_KEY: string;
  ENTITLEMENT_PUBLIC_KEY: string;
  INITIAL_ADMIN_GOOGLE_SUB?: string;
  DEFAULT_TRIAL_DAYS?: string;
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
  | "VALIDATION_ERROR";

export interface BackupUploadBody {
  classroomId: string;
  fileName: string;
  schemaVersion: number;
  timestamp: string;
  payload: unknown;
}
