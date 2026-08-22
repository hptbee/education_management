import type { ClassroomDatabase } from "../types";
import { loadAuthSession } from "@/src/auth/secure-storage";
import { verifyEntitlementToken } from "@/src/auth/entitlement";
import { sanitizeBackupIdentifier } from "../safeIdentifiers";
import { isTauri } from "../tauri-fs.service";

export function getCloudBackupUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL?.trim();
  return url || null;
}

export function isEntitlementConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY?.trim());
}

export async function resolveEntitlementToken(): Promise<string | null> {
  const session = await loadAuthSession();
  if (!session?.entitlement) return null;

  const verified = await verifyEntitlementToken(session.entitlement);
  if (!verified?.claims.permissions.cloudBackup) return null;

  return session.entitlement;
}

export async function inspectCloudBackupAuth(): Promise<{
  hasUrl: boolean;
  hasPublicKey: boolean;
  hasSession: boolean;
  cloudBackup: boolean | null;
  plan: string | null;
  isTauri: boolean;
}> {
  const session = await loadAuthSession();
  const verified = session?.entitlement ? await verifyEntitlementToken(session.entitlement) : null;
  return {
    hasUrl: Boolean(getCloudBackupUrl()),
    hasPublicKey: isEntitlementConfigured(),
    hasSession: Boolean(session?.entitlement),
    cloudBackup: verified ? Boolean(verified.claims.permissions.cloudBackup) : null,
    plan: verified?.claims.plan ?? null,
    isTauri: isTauri(),
  };
}

export async function isCloudBackupConfigured(): Promise<boolean> {
  const url = getCloudBackupUrl();
  if (!url || !isEntitlementConfigured()) return false;
  const token = await resolveEntitlementToken();
  return Boolean(token);
}

export function isCloudBackupEnabledForDatabase(db: ClassroomDatabase): boolean {
  return Boolean(db.appSettings?.cloudBackupEnabled);
}

export { sanitizeBackupIdentifier };

export function buildUserClassroomStorageKey(userId: string, classroomId: string): string {
  const safeUser = sanitizeBackupIdentifier(userId);
  const safeClassroom = sanitizeBackupIdentifier(classroomId);
  if (!safeUser || !safeClassroom) {
    throw new Error("Invalid backup identifiers");
  }
  return `users/${safeUser}/classrooms/${safeClassroom}/database.json`;
}

/** @deprecated Legacy device-based layout */
export function buildBackupStorageKey(deviceId: string, classroomId: string): string {
  const safeDevice = sanitizeBackupIdentifier(deviceId);
  const safeClassroom = sanitizeBackupIdentifier(classroomId);
  if (!safeDevice || !safeClassroom) {
    throw new Error("Invalid backup identifiers");
  }
  return `backups/${safeDevice}/${safeClassroom}/latest.json`;
}
