import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDatabase } from "../database.factory";
import { uploadClassroomBackup } from "./cloud-backup.service";
import { verifyEntitlementToken } from "@/src/auth/entitlement";
import { loadAuthSession } from "@/src/auth/secure-storage";
import { isCloudRestoreInProgress } from "./cloud-restore-gate";
import { makeTestStoredAuthSession, makeTestVerifiedEntitlement } from "./test-fixtures/auth-session";

vi.mock("@/src/auth/secure-storage", () => ({
  loadAuthSession: vi.fn(),
}));

vi.mock("@/src/auth/entitlement", () => ({
  verifyEntitlementToken: vi.fn(),
}));

vi.mock("./backup-metadata.service", () => ({
  backupMetadataService: {
    recordCloudBackupSuccess: vi.fn().mockResolvedValue(undefined),
    recordCloudBackupPending: vi.fn().mockResolvedValue(undefined),
    recordCloudBackupFailure: vi.fn().mockResolvedValue(undefined),
    getClassroomMeta: vi.fn().mockResolvedValue({
      lastBackedUpUpdatedAt: null,
      lastCloudBackupStatus: "pending",
    }),
    getCloudSyncState: vi.fn().mockResolvedValue({
      formatVersion: 1,
      fileHashes: {},
      migratedToStructured: false,
    }),
    updateCloudSyncState: vi.fn().mockResolvedValue({
      formatVersion: 1,
      fileHashes: {},
      migratedToStructured: true,
    }),
  },
}));

vi.mock("./cloud-registry.service", () => ({
  isRegistryPullCompleted: vi.fn().mockReturnValue(true),
  refreshCloudRegistrySummaries: vi.fn().mockResolvedValue(undefined),
  getLastMergedRegistry: vi.fn().mockReturnValue(null),
}));

vi.mock("./cloud-sync.service", () => ({
  uploadCloudSyncBatch: vi.fn().mockResolvedValue({ uploadedPaths: ["classroom.json"], skippedPaths: [] }),
}));

vi.mock("./cloud-restore-gate", () => ({
  isCloudRestoreInProgress: vi.fn().mockReturnValue(false),
}));

vi.mock("@/src/auth/api", () => ({
  fetchClassroomsRegistry: vi.fn().mockResolvedValue({ registry: null, source: "missing" }),
}));

vi.mock("./classroom-owner", () => ({
  lastAuthUserService: {
    readLastAuthUserId: vi.fn().mockResolvedValue(null),
    writeLastAuthUserId: vi.fn(),
  },
  resolveCurrentUserId: vi.fn().mockResolvedValue("usr_test"),
  shouldIncludeInAccountBackup: vi.fn().mockReturnValue(true),
}));

function makeDb(cloudBackupEnabled = true, className = "2/7", schoolYear = "2026-2027") {
  const db = createEmptyDatabase({
    className,
    schoolYear,
    teacher: {
      id: "teacher-1",
      name: "Cô Thu",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
  db.appSettings.cloudBackupEnabled = cloudBackupEnabled;
  return db;
}

describe("uploadClassroomBackup", () => {
  const originalUrl = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
  const originalPublicKey = process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = "https://backup.example.workers.dev";
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtest\n-----END PUBLIC KEY-----";
    vi.mocked(loadAuthSession).mockResolvedValue(makeTestStoredAuthSession());
    vi.mocked(verifyEntitlementToken).mockResolvedValue(makeTestVerifiedEntitlement());
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = originalUrl;
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = originalPublicKey;
    vi.clearAllMocks();
    vi.mocked(isCloudRestoreInProgress).mockReturnValue(false);
  });

  it("uploads classroom JSON with entitlement bearer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const db = makeDb(true);
    await uploadClassroomBackup(db, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://backup.example.workers.dev/backup");
    expect(init?.method).toBe("PUT");
    const body = JSON.parse(String(init?.body));
    expect(body.classroomId).toBe(db.metadata.id);
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-entitlement-token",
    );
  });

  it("skips upload when cloud backup opt-in is disabled", async () => {
    const fetchMock = vi.fn();
    await uploadClassroomBackup(makeDb(false), fetchMock as unknown as typeof fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips upload when entitlement lacks cloudBackup permission", async () => {
    vi.mocked(verifyEntitlementToken).mockResolvedValueOnce(
      makeTestVerifiedEntitlement({
        permissions: { appAccess: true, cloudBackup: false },
        plan: "basic",
      }),
    );

    const fetchMock = vi.fn();
    await uploadClassroomBackup(makeDb(true), fetchMock as unknown as typeof fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
