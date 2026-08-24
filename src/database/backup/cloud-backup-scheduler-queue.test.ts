import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDatabase } from "../database.factory";
import { CloudBackupScheduler } from "./cloud-backup.service";
import { uploadCloudSyncBatch } from "./cloud-sync.service";
import { backupMetadataService } from "./backup-metadata.service";
import { verifyEntitlementToken } from "@/src/auth/entitlement";
import { cloudDirtyTracker } from "./cloud-dirty-tracker";
import { isCloudRestoreInProgress } from "./cloud-restore-gate";

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

describe("CloudBackupScheduler queue", () => {
  const originalUrl = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
  const originalPublicKey = process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY;

  async function flushSchedulerMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = "https://backup.example.workers.dev";
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtest\n-----END PUBLIC KEY-----";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = originalUrl;
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = originalPublicKey;
    vi.clearAllMocks();
    vi.mocked(isCloudRestoreInProgress).mockReturnValue(false);
  });

  it("does not enter pending when entitlement lacks cloudBackup permission", async () => {
    vi.mocked(verifyEntitlementToken).mockResolvedValueOnce({
      claims: {
        userId: "usr_test",
        role: "teacher",
        plan: "trial",
        status: "active",
        permissions: { appAccess: true, cloudBackup: false },
        licenseVersion: 1,
        offlineValidUntil: Math.floor(Date.now() / 1000) + 3600,
      },
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    const fetchMock = vi.fn();
    const scheduler = new CloudBackupScheduler(fetchMock as unknown as typeof fetch);
    const states: string[] = [];
    scheduler.subscribe((state) => states.push(state));

    scheduler.scheduleAfterLocalSave(makeDb(true));
    await flushSchedulerMicrotasks();
    scheduler.stop();

    expect(states).not.toContain("pending");
    expect(states).toContain("disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("continues draining other classrooms after one upload fails", async () => {
    const classA = makeDb(true, "2/7", "2026-2027");
    const classB = makeDb(true, "3/1", "2026-2027");
    vi.mocked(uploadCloudSyncBatch).mockImplementation(async (db) => {
      if (db.metadata.id === classA.metadata.id) {
        throw new Error("quota");
      }
      return { uploadedPaths: ["classroom.json"], skippedPaths: [] };
    });

    const scheduler = new CloudBackupScheduler();
    scheduler.scheduleAfterLocalSave(classA);
    scheduler.scheduleAfterLocalSave(classB);
    await flushSchedulerMicrotasks();
    await scheduler.flushPending();

    const uploadedKeys = vi.mocked(uploadCloudSyncBatch).mock.calls.map((call) => call[0].metadata.id);
    expect(uploadedKeys).toContain(classB.metadata.id);
    expect(scheduler.getStateForClassroom(classA.metadata.id).state).toBe("failed");
    expect(scheduler.getStateForClassroom(classB.metadata.id).state).toBe("synced");
    scheduler.stop();
  });

  it("flushes dirty classroom when no pending map entry exists", async () => {
    vi.mocked(uploadCloudSyncBatch).mockResolvedValue({
      uploadedPaths: ["classroom.json"],
      skippedPaths: [],
    });
    const scheduler = new CloudBackupScheduler();
    const db = makeDb();
    cloudDirtyTracker.markAll(db.metadata.id);

    await scheduler.flushCloudSyncForClassroom(db.metadata.id, db);
    scheduler.stop();

    expect(uploadCloudSyncBatch).toHaveBeenCalledTimes(1);
    expect(uploadCloudSyncBatch).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ id: db.metadata.id }) }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("keeps pending Classroom A while B is uploading and drains A after", async () => {
    let releaseB!: () => void;
    const bGate = new Promise<void>((resolve) => {
      releaseB = resolve;
    });

    vi.mocked(uploadCloudSyncBatch).mockImplementation(async (db) => {
      if (db.metadata.id === "3-1_2026-2027") {
        await bGate;
      }
      return { uploadedPaths: ["classroom.json"], skippedPaths: [] };
    });

    const scheduler = new CloudBackupScheduler();
    const classA = makeDb(true, "2/7", "2026-2027");
    const classB = makeDb(true, "3/1", "2026-2027");

    scheduler.scheduleAfterLocalSave(classB);
    await flushSchedulerMicrotasks();
    const flushingB = scheduler.flushPending();

    const flushingA = scheduler.flushCloudSyncForClassroom(classA.metadata.id, classA);
    await flushSchedulerMicrotasks();
    releaseB();
    await flushingB;
    await flushingA;
    await scheduler.flushPending();
    scheduler.stop();

    const uploadedKeys = vi.mocked(uploadCloudSyncBatch).mock.calls.map((call) => call[0].metadata.id);
    expect(uploadedKeys).toEqual(expect.arrayContaining([classA.metadata.id, classB.metadata.id]));
  });

  it("re-drains classrooms queued while an existing drain is in flight", async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    vi.mocked(uploadCloudSyncBatch)
      .mockImplementationOnce(async () => {
        await firstGate;
        return { uploadedPaths: ["classroom.json"], skippedPaths: [] };
      })
      .mockResolvedValue({ uploadedPaths: ["classroom.json"], skippedPaths: [] });

    const scheduler = new CloudBackupScheduler();
    const classA = makeDb(true, "2/7", "2026-2027");
    const classB = makeDb(true, "3/1", "2026-2027");

    scheduler.scheduleAfterLocalSave(classA);
    await flushSchedulerMicrotasks();
    const firstDrain = scheduler.flushPending();

    scheduler.scheduleAfterLocalSave(classB);
    await flushSchedulerMicrotasks();

    const waitingDrain = scheduler.flushPending();
    releaseFirst();
    await firstDrain;
    await waitingDrain;
    scheduler.stop();

    const uploadedKeys = vi.mocked(uploadCloudSyncBatch).mock.calls.map((call) => call[0].metadata.id);
    expect(uploadedKeys).toEqual(expect.arrayContaining([classA.metadata.id, classB.metadata.id]));
  });

  it("keeps B and C pending while A is syncing and drains all three independently", async () => {
    let releaseA!: () => void;
    const aGate = new Promise<void>((resolve) => {
      releaseA = resolve;
    });

    vi.mocked(uploadCloudSyncBatch).mockImplementation(async (db) => {
      if (db.metadata.id === "2-7_2026-2027") {
        await aGate;
      }
      return { uploadedPaths: ["classroom.json"], skippedPaths: [] };
    });

    const scheduler = new CloudBackupScheduler();
    const classA = makeDb(true, "2/7", "2026-2027");
    const classB = makeDb(true, "3/1", "2026-2027");
    const classC = makeDb(true, "4/2", "2026-2027");

    scheduler.scheduleAfterLocalSave(classA);
    scheduler.scheduleAfterLocalSave(classB);
    scheduler.scheduleAfterLocalSave(classC);
    await flushSchedulerMicrotasks();
    await flushSchedulerMicrotasks();
    await flushSchedulerMicrotasks();

    expect(scheduler.getStateForClassroom(classA.metadata.id).state).toBe("pending");
    expect(scheduler.getStateForClassroom(classB.metadata.id).state).toBe("pending");
    expect(scheduler.getStateForClassroom(classC.metadata.id).state).toBe("pending");

    const drain = scheduler.flushPending();
    await flushSchedulerMicrotasks();
    expect(scheduler.getStateForClassroom(classB.metadata.id).state).toBe("pending");
    expect(scheduler.getStateForClassroom(classC.metadata.id).state).toBe("pending");

    releaseA();
    await drain;
    scheduler.stop();

    const uploadedKeys = vi.mocked(uploadCloudSyncBatch).mock.calls.map((call) => call[0].metadata.id);
    expect(uploadedKeys).toEqual(
      expect.arrayContaining([classA.metadata.id, classB.metadata.id, classC.metadata.id]),
    );
    expect(new Set(uploadedKeys).size).toBe(3);
  });

  it("retries only the failed classroom after a quota error", async () => {
    vi.useFakeTimers();
    const classA = makeDb(true, "2/7", "2026-2027");
    const classB = makeDb(true, "3/1", "2026-2027");
    vi.mocked(uploadCloudSyncBatch).mockImplementation(async (db) => {
      if (db.metadata.id === classA.metadata.id) {
        throw new Error("quota");
      }
      return { uploadedPaths: ["classroom.json"], skippedPaths: [] };
    });

    const scheduler = new CloudBackupScheduler();
    scheduler.scheduleAfterLocalSave(classA);
    scheduler.scheduleAfterLocalSave(classB);
    await flushSchedulerMicrotasks();
    await scheduler.flushPending();

    expect(scheduler.getStateForClassroom(classA.metadata.id).state).toBe("failed");
    expect(scheduler.getStateForClassroom(classB.metadata.id).state).toBe("synced");

    vi.mocked(uploadCloudSyncBatch).mockResolvedValue({
      uploadedPaths: ["classroom.json"],
      skippedPaths: [],
    });

    await vi.advanceTimersByTimeAsync(30_000);
    await flushSchedulerMicrotasks();
    await scheduler.flushPending();
    scheduler.stop();
    vi.useRealTimers();

    const uploadedKeys = vi.mocked(uploadCloudSyncBatch).mock.calls.map((call) => call[0].metadata.id);
    expect(uploadedKeys.filter((id) => id === classA.metadata.id).length).toBeGreaterThanOrEqual(2);
    expect(uploadedKeys).toContain(classB.metadata.id);
  });
});
