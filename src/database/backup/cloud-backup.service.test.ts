import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDatabase } from "../database.factory";
import {
  CloudBackupScheduler,
  buildUserClassroomStorageKey,
  uploadClassroomBackup,
} from "./cloud-backup.service";
import { uploadCloudSyncBatch } from "./cloud-sync.service";
import { backupMetadataService } from "./backup-metadata.service";
import { verifyEntitlementToken } from "@/src/auth/entitlement";
import { cloudDirtyTracker } from "./cloud-dirty-tracker";

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

describe("backup sanitization", () => {
  it("builds per-user classroom keys", () => {
    expect(buildUserClassroomStorageKey("usr_abc", "2-7_2026-2027")).toBe(
      "users/usr_abc/classrooms/2-7_2026-2027/database.json",
    );
  });
});

describe("uploadClassroomBackup", () => {
  const originalUrl = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
  const originalPublicKey = process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = "https://backup.example.workers.dev";
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtest\n-----END PUBLIC KEY-----";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = originalUrl;
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = originalPublicKey;
    vi.clearAllMocks();
  });

  it("uploads classroom JSON with entitlement bearer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await uploadClassroomBackup(makeDb(true), fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://backup.example.workers.dev/backup");
    expect(init?.method).toBe("PUT");
    const body = JSON.parse(String(init?.body));
    expect(body.classroomId).toBe("2-7_2026-2027");
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
    vi.mocked(verifyEntitlementToken).mockResolvedValueOnce({
      claims: {
        userId: "usr_test",
        role: "teacher",
        plan: "basic",
        status: "active",
        permissions: { appAccess: true, cloudBackup: false },
        licenseVersion: 1,
        offlineValidUntil: Math.floor(Date.now() / 1000) + 3600,
      },
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    const fetchMock = vi.fn();
    await uploadClassroomBackup(makeDb(true), fetchMock as unknown as typeof fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("CloudBackupScheduler", () => {
  const originalUrl = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
  const originalPublicKey = process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = "https://backup.example.workers.dev";
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtest\n-----END PUBLIC KEY-----";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = originalUrl;
    process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY = originalPublicKey;
    vi.clearAllMocks();
  });

  it("records failure without blocking local usage semantics", async () => {
    vi.mocked(uploadCloudSyncBatch).mockRejectedValueOnce(new Error("nope"));
    const scheduler = new CloudBackupScheduler();
    const states: string[] = [];
    scheduler.subscribe((state) => states.push(state));

    scheduler.scheduleAfterLocalSave(makeDb());
    await new Promise((resolve) => setTimeout(resolve, 0));
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
    await new Promise((resolve) => setTimeout(resolve, 0));
    const firstFlush = scheduler.flushPending();

    scheduler.scheduleAfterLocalSave(db2);
    await new Promise((resolve) => setTimeout(resolve, 0));

    releaseFirstUpload();
    await firstFlush;

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
    await new Promise((resolve) => setTimeout(resolve, 0));

    await scheduler.flushPending();

    expect(uploadCloudSyncBatch).toHaveBeenCalledTimes(3);
    const uploadedKeys = vi.mocked(uploadCloudSyncBatch).mock.calls.map((call) => call[0].metadata.id);
    expect(uploadedKeys).toEqual(
      expect.arrayContaining(["2-7_2026-2027", "3-1_2026-2027", "4-2_2026-2027"]),
    );
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
    await new Promise((resolve) => setTimeout(resolve, 0));

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
    await new Promise((resolve) => setTimeout(resolve, 0));
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

    expect(uploadCloudSyncBatch).toHaveBeenCalledTimes(1);
    expect(uploadCloudSyncBatch).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ id: db.metadata.id }) }),
      expect.anything(),
      expect.anything(),
    );
    scheduler.stop();
  });
});
