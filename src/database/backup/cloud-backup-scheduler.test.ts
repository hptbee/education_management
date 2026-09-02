import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDatabase } from "../database.factory";
import { CloudBackupScheduler } from "./cloud-backup.service";
import { uploadCloudSyncBatch } from "./cloud-sync.service";
import { backupMetadataService } from "./backup-metadata.service";
import { verifyEntitlementToken } from "@/src/auth/entitlement";
import { loadAuthSession } from "@/src/auth/secure-storage";
import { cloudDirtyTracker } from "./cloud-dirty-tracker";
import { isCloudRestoreInProgress } from "./cloud-restore-gate";
import { resolveCurrentUserId, shouldIncludeInAccountBackup } from "./classroom-owner";

vi.mock("@/src/auth/secure-storage", () => ({
  loadAuthSession: vi.fn().mockResolvedValue({
    entitlement: "test-entitlement-token",
    user: { id: "usr_test" },
    license: null,
    lastVerifiedAt: new Date().toISOString(),
    lastTrustedIat: Math.floor(Date.now() / 1000),
  }),
}));

vi.mock("@/src/auth/entitlement", () => ({
  verifyEntitlementToken: vi.fn().mockResolvedValue({
    claims: {
      userId: "usr_test",
      permissions: { appAccess: true, cloudBackup: true },
    },
    issuedAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  }),
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

describe("CloudBackupScheduler", () => {
  const originalUrl = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
  const originalPublicKey = process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY;

  async function flushSchedulerMicrotasks(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  }

  const sessionFixture = {
    entitlement: "test-entitlement-token",
    user: { id: "usr_test" },
    license: null,
    lastVerifiedAt: new Date().toISOString(),
    lastTrustedIat: Math.floor(Date.now() / 1000),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = "https://backup.example.workers.dev";
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtest\n-----END PUBLIC KEY-----";
    vi.mocked(loadAuthSession).mockResolvedValue(sessionFixture);
    vi.mocked(resolveCurrentUserId).mockResolvedValue("usr_test");
    vi.mocked(shouldIncludeInAccountBackup).mockReturnValue(true);
    vi.mocked(verifyEntitlementToken).mockResolvedValue({
      claims: {
        userId: "usr_test",
        permissions: { appAccess: true, cloudBackup: true },
      },
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = originalUrl;
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = originalPublicKey;
    vi.clearAllMocks();
    vi.mocked(isCloudRestoreInProgress).mockReturnValue(false);
  });

  it("records failure without blocking local usage semantics", async () => {
    vi.mocked(uploadCloudSyncBatch).mockRejectedValueOnce(new Error("nope"));
    const scheduler = new CloudBackupScheduler();
    const states: string[] = [];
    scheduler.subscribe((state) => states.push(state));

    scheduler.scheduleAfterLocalSave(makeDb());
    await flushSchedulerMicrotasks();
    await scheduler.flushPending();

    expect(states).toContain("failed");
    expect(backupMetadataService.recordCloudBackupSuccess).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it("uploads newer pending snapshot after the first upload completes", async () => {
    let releaseFirstUpload!: () => void;
    const firstUploadGate = new Promise<void>((resolve) => {
      releaseFirstUpload = resolve;
    });

    vi.mocked(uploadCloudSyncBatch)
      .mockImplementationOnce(async () => {
        await firstUploadGate;
        return { uploadedPaths: ["classroom.json"], skippedPaths: [] };
      })
      .mockResolvedValue({ uploadedPaths: ["classroom.json"], skippedPaths: [] });

    const scheduler = new CloudBackupScheduler();
    const db1 = makeDb();
    const db2 = makeDb();
    db2.metadata.updatedAt = new Date(Date.now() + 60_000).toISOString();

    scheduler.scheduleAfterLocalSave(db1);
    await flushSchedulerMicrotasks();
    const firstFlush = scheduler.flushPending();

    scheduler.scheduleAfterLocalSave(db2);
    await flushSchedulerMicrotasks();

    releaseFirstUpload();
    await firstFlush;
    scheduler.stop();

    expect(uploadCloudSyncBatch).toHaveBeenCalledTimes(2);
  });

  it("uploads pending sync for multiple classrooms without dropping earlier classes", async () => {
    vi.mocked(uploadCloudSyncBatch).mockResolvedValue({
      uploadedPaths: ["classroom.json"],
      skippedPaths: [],
    });

    const scheduler = new CloudBackupScheduler();
    const classA = makeDb(true, "2/7", "2026-2027");
    const classB = makeDb(true, "3/1", "2026-2027");
    const classC = makeDb(true, "4/2", "2026-2027");

    scheduler.scheduleAfterLocalSave(classA);
    scheduler.scheduleAfterLocalSave(classB);
    scheduler.scheduleAfterLocalSave(classC);
    await flushSchedulerMicrotasks();

    await scheduler.flushPending();
    scheduler.stop();

    expect(uploadCloudSyncBatch).toHaveBeenCalledTimes(3);
    const uploadedKeys = vi.mocked(uploadCloudSyncBatch).mock.calls.map((call) => call[0].metadata.id);
    expect(uploadedKeys).toEqual(
      expect.arrayContaining([classA.metadata.id, classB.metadata.id, classC.metadata.id]),
    );
  });

  it("skips scheduleAfterLocalSave while cloud restore gate is active", async () => {
    vi.mocked(isCloudRestoreInProgress).mockReturnValue(true);
    const scheduler = new CloudBackupScheduler();
    const states: string[] = [];
    scheduler.subscribe((state) => states.push(state));

    scheduler.scheduleAfterLocalSave(makeDb(true));
    await flushSchedulerMicrotasks();

    expect(backupMetadataService.recordCloudBackupPending).not.toHaveBeenCalled();
    expect(states).not.toContain("pending");
    scheduler.stop();
  });

  it("skips checkStartupBackup while cloud restore gate is active", async () => {
    vi.mocked(isCloudRestoreInProgress).mockReturnValue(true);
    const markAllSpy = vi.spyOn(cloudDirtyTracker, "markAll");
    const scheduler = new CloudBackupScheduler();

    await scheduler.checkStartupBackup(makeDb(true));

    expect(markAllSpy).not.toHaveBeenCalled();
    expect(backupMetadataService.recordCloudBackupPending).not.toHaveBeenCalled();
    markAllSpy.mockRestore();
    scheduler.stop();
  });
});
