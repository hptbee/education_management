import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDatabase } from "../database.factory";
import {
  CloudBackupScheduler,
  buildBackupStorageKey,
  resetCloudBackupTokenCache,
  sanitizeBackupIdentifier,
  uploadClassroomBackup,
} from "./cloud-backup.service";

vi.mock("./device-id.service", () => ({
  deviceIdService: {
    getDeviceId: vi.fn().mockResolvedValue("device-test-123"),
  },
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
  },
}));

function makeDb(cloudBackupEnabled = true) {
  const db = createEmptyDatabase({
    className: "2/7",
    schoolYear: "2026-2027",
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
  it("accepts safe identifiers", () => {
    expect(sanitizeBackupIdentifier("device-123_abc")).toBe("device-123_abc");
    expect(buildBackupStorageKey("device-1", "2-7_2026-2027")).toBe(
      "backups/device-1/2-7_2026-2027/latest.json",
    );
  });

  it("rejects unsafe identifiers", () => {
    expect(sanitizeBackupIdentifier("../evil")).toBeNull();
    expect(sanitizeBackupIdentifier("a/b")).toBeNull();
    expect(() => buildBackupStorageKey("../evil", "ok")).toThrow();
  });
});

describe("uploadClassroomBackup", () => {
  const originalUrl = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
  const originalToken = process.env.NEXT_PUBLIC_CLOUD_BACKUP_TOKEN;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = "https://backup.example.workers.dev";
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_TOKEN = "test-token";
    resetCloudBackupTokenCache();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = originalUrl;
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_TOKEN = originalToken;
    resetCloudBackupTokenCache();
    vi.clearAllMocks();
  });

  it("uploads classroom JSON to worker when opt-in is enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await uploadClassroomBackup(makeDb(true), fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://backup.example.workers.dev/backup");
    expect(init?.method).toBe("PUT");
    const body = JSON.parse(String(init?.body));
    expect(body.deviceId).toBe("device-test-123");
    expect(body.classroomId).toBe("2-7_2026-2027");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("skips upload when cloud backup opt-in is disabled", async () => {
    const fetchMock = vi.fn();
    await uploadClassroomBackup(makeDb(false), fetchMock as unknown as typeof fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips upload when token is missing", async () => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_TOKEN = "";
    resetCloudBackupTokenCache();
    const fetchMock = vi.fn();
    await uploadClassroomBackup(makeDb(true), fetchMock as unknown as typeof fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("CloudBackupScheduler", () => {
  const originalUrl = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
  const originalToken = process.env.NEXT_PUBLIC_CLOUD_BACKUP_TOKEN;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = "https://backup.example.workers.dev";
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_TOKEN = "test-token";
    resetCloudBackupTokenCache();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = originalUrl;
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_TOKEN = originalToken;
    resetCloudBackupTokenCache();
    vi.clearAllMocks();
  });

  it("records failure without blocking local usage semantics", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));
    const scheduler = new CloudBackupScheduler(fetchMock as unknown as typeof fetch);
    const states: string[] = [];
    scheduler.subscribe((state) => states.push(state));

    scheduler.scheduleAfterLocalSave(makeDb());
    await scheduler.flushPending();

    expect(states).toContain("failed");
  });

  it("retries and succeeds after a failed upload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("fail", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const scheduler = new CloudBackupScheduler(fetchMock as unknown as typeof fetch);
    scheduler.scheduleAfterLocalSave(makeDb());
    await scheduler.flushPending();
    await scheduler.flushPending();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(scheduler.getState()).toBe("synced");
  });

  it("does not clear pending when a newer snapshot arrives during upload", async () => {
    const first = makeDb();
    const second = {
      ...makeDb(),
      metadata: {
        ...makeDb().metadata,
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    };

    let resolveUpload: (value: Response) => void = () => {};
    const uploadPromise = new Promise<Response>((resolve) => {
      resolveUpload = resolve;
    });

    const fetchMock = vi.fn().mockReturnValue(uploadPromise);
    const scheduler = new CloudBackupScheduler(fetchMock as unknown as typeof fetch);

    scheduler.scheduleAfterLocalSave(first);
    const flush1 = scheduler.flushPending();
    scheduler.scheduleAfterLocalSave(second);
    resolveUpload(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await flush1;
    await scheduler.flushPending();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(scheduler.getState()).toBe("synced");
  });
});
