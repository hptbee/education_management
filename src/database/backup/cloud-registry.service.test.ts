import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureRegistryPulled,
  hydrateClassroomFromCloud,
  HydrateCancelledError,
  mergeAndRememberRegistry,
  pushClassroomRegistryMerge,
  resetRegistryPullStateForTests,
} from "./cloud-registry.service";
import type { CloudClassroomsRegistryFile } from "./cloud-types";
import {
  CLASSROOM_A,
  CLASSROOM_B,
  CLASSROOM_C,
  registryEntryFromFixture,
  registrySummaryFromFixture,
} from "../test-fixtures/multi-classroom";

vi.mock("@/src/auth/api", () => ({
  fetchClassroomsRegistry: vi.fn(),
  listCloudClassrooms: vi.fn(),
  restoreCloudClassroom: vi.fn(),
  restoreCloudClassroomAssets: vi.fn(),
}));

vi.mock("./cloud-backup-auth", () => ({
  getCloudBackupUrl: vi.fn(() => "https://backup.example.workers.dev"),
  isCloudBackupConfigured: vi.fn().mockResolvedValue(true),
  resolveEntitlementToken: vi.fn().mockResolvedValue("token"),
  inspectCloudBackupAuth: vi.fn().mockResolvedValue({
    hasSession: true,
    isTauri: false,
    hasUrl: true,
    hasPublicKey: true,
    cloudBackup: true,
  }),
}));

vi.mock("./cloud-backup.service", () => ({
  cloudBackupScheduler: {
    setRegistrySummaries: vi.fn(),
    setLocalClassroomRegistry: vi.fn(),
  },
}));

vi.mock("../database.service", () => ({
  databaseService: {
    mergeRegistryStubs: vi.fn().mockResolvedValue(undefined),
    listDatabases: vi.fn().mockResolvedValue([]),
    loadClassroomSnapshot: vi.fn().mockResolvedValue(null),
    saveCloudRestoredDatabase: vi.fn(),
  },
}));

vi.mock("./cloud-restore-sync", () => ({
  recordCloudRestoreSyncBaseline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./cloud-sync.service", () => ({
  uploadRegistryMerge: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./classroom-owner", () => ({
  lastAuthUserService: {
    readLastAuthUserId: vi.fn().mockResolvedValue(null),
    writeLastAuthUserId: vi.fn(),
  },
  resolveCurrentUserId: vi.fn().mockResolvedValue("usr_test"),
  shouldIncludeInAccountBackup: vi.fn().mockReturnValue(true),
}));

import { fetchClassroomsRegistry, restoreCloudClassroom, restoreCloudClassroomAssets } from "@/src/auth/api";
import { databaseService } from "../database.service";
import { createEmptyDatabase } from "../database.factory";
import { recordCloudRestoreSyncBaseline } from "./cloud-restore-sync";
import { uploadRegistryMerge } from "./cloud-sync.service";

const sampleRegistry: CloudClassroomsRegistryFile = {
  version: 1,
  updatedAt: "2026-01-02T00:00:00.000Z",
  classrooms: [
    {
      key: "2-7_2026-2027",
      name: "2/7",
      schoolYear: "2026-2027",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      archived: false,
    },
  ],
};

describe("cloud-registry.service", () => {
  beforeEach(() => {
    resetRegistryPullStateForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetRegistryPullStateForTests();
  });

  it("retries ensureRegistryPulled after a network failure", async () => {
    vi.mocked(fetchClassroomsRegistry)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ registry: sampleRegistry, source: "registry" });

    const first = await ensureRegistryPulled();
    expect(first.ok).toBe(false);
    if (!first.ok) {
      expect(first.reason).toBe("network");
    }

    const second = await ensureRegistryPulled();
    expect(second.ok).toBe(true);
    expect(databaseService.mergeRegistryStubs).toHaveBeenCalledTimes(1);
  });

  it("mergeAndRememberRegistry merges archived classrooms into local index", async () => {
    await mergeAndRememberRegistry({
      version: 1,
      updatedAt: new Date().toISOString(),
      classrooms: [
        {
          key: "archived-class",
          name: "Archived",
          schoolYear: "2026-2027",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
          archived: true,
        },
      ],
    });

    expect(databaseService.mergeRegistryStubs).toHaveBeenCalledWith([
      expect.objectContaining({ key: "archived-class", archived: true }),
    ]);
  });

  it("does not save a cancelled hydrate after restore", async () => {
    const payload = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: {
        id: "teacher-1",
        name: "Cô Thu",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    vi.mocked(restoreCloudClassroom).mockResolvedValue(payload);
    vi.mocked(restoreCloudClassroomAssets).mockResolvedValue([]);

    await expect(
      hydrateClassroomFromCloud(payload.metadata.id, { isCancelled: () => true }),
    ).rejects.toBeInstanceOf(HydrateCancelledError);

    expect(restoreCloudClassroom).toHaveBeenCalled();
    expect(restoreCloudClassroomAssets).not.toHaveBeenCalled();
    expect(databaseService.saveCloudRestoredDatabase).not.toHaveBeenCalled();
  });

  it("does not save when asset restore fails", async () => {
    const payload = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: {
        id: "teacher-1",
        name: "Cô Thu",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    vi.mocked(restoreCloudClassroom).mockResolvedValue(payload);
    vi.mocked(restoreCloudClassroomAssets).mockRejectedValue(
      new Error("Không thể tải ảnh lớp từ đám mây (500)."),
    );

    await expect(hydrateClassroomFromCloud(payload.metadata.id)).rejects.toThrow(
      /Không thể tải ảnh lớp/,
    );
    expect(databaseService.saveCloudRestoredDatabase).not.toHaveBeenCalled();
    expect(recordCloudRestoreSyncBaseline).not.toHaveBeenCalled();
  });

  it("records cloud restore sync baseline after successful hydrate", async () => {
    const payload = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: {
        id: "teacher-1",
        name: "Cô Thu",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    vi.mocked(restoreCloudClassroom).mockResolvedValue(payload);
    vi.mocked(restoreCloudClassroomAssets).mockResolvedValue([]);
    vi.mocked(databaseService.saveCloudRestoredDatabase).mockResolvedValue(payload);

    const result = await hydrateClassroomFromCloud(payload.metadata.id);

    expect(result.metadata.id).toBe(payload.metadata.id);
    expect(recordCloudRestoreSyncBaseline).toHaveBeenCalledWith(payload);
  });

  it("force-refreshes the remote registry after a successful first pull", async () => {
    const secondRegistry: CloudClassroomsRegistryFile = {
      version: 1,
      updatedAt: "2026-01-03T00:00:00.000Z",
      classrooms: [
        ...sampleRegistry.classrooms,
        {
          key: "3-1_2026-2027",
          name: "3/1",
          schoolYear: "2026-2027",
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-03T00:00:00.000Z",
          archived: false,
        },
      ],
    };
    vi.mocked(fetchClassroomsRegistry)
      .mockResolvedValueOnce({ registry: sampleRegistry, source: "registry" })
      .mockResolvedValueOnce({ registry: secondRegistry, source: "registry" });

    const first = await ensureRegistryPulled();
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.registry.classrooms).toHaveLength(1);
    }

    const cached = await ensureRegistryPulled();
    expect(cached.ok).toBe(true);
    expect(fetchClassroomsRegistry).toHaveBeenCalledTimes(1);

    const forced = await ensureRegistryPulled(undefined, { force: true });
    expect(forced.ok).toBe(true);
    if (forced.ok) {
      expect(forced.registry.classrooms.map((item) => item.key)).toEqual([
        "2-7_2026-2027",
        "3-1_2026-2027",
      ]);
    }
    expect(fetchClassroomsRegistry).toHaveBeenCalledTimes(2);
    expect(databaseService.mergeRegistryStubs).toHaveBeenCalledTimes(2);
  });

  it("does not save locally when cloud restore is missing", async () => {
    vi.mocked(restoreCloudClassroom).mockResolvedValue(null);

    await expect(hydrateClassroomFromCloud("2-7_2026-2027")).rejects.toThrow(
      "Không tìm thấy bản sao lưu trên đám mây.",
    );
    expect(databaseService.saveCloudRestoredDatabase).not.toHaveBeenCalled();
  });

  it("does not save when restored payload id does not match requested classroom key", async () => {
    const payload = CLASSROOM_B.db;
    vi.mocked(restoreCloudClassroom).mockResolvedValue(payload);
    vi.mocked(restoreCloudClassroomAssets).mockResolvedValue([]);
    vi.mocked(databaseService.saveCloudRestoredDatabase).mockImplementation(async (data, options) => {
      const db = data as typeof payload;
      if (options?.expectedClassroomId && db.metadata.id !== options.expectedClassroomId) {
        throw new Error(
          `ID lớp không khớp: mong đợi "${options.expectedClassroomId}", nhận "${db.metadata.id}".`,
        );
      }
      return db;
    });

    await expect(hydrateClassroomFromCloud(CLASSROOM_A.db.metadata.id)).rejects.toThrow(/không khớp/i);
    expect(databaseService.saveCloudRestoredDatabase).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ expectedClassroomId: CLASSROOM_A.db.metadata.id }),
    );
  });

  it("pushClassroomRegistryMerge never uploads empty registry over populated remote", async () => {
    const remoteRegistry: CloudClassroomsRegistryFile = {
      version: 1,
      updatedAt: "2026-01-02T00:00:00.000Z",
      classrooms: [
        registryEntryFromFixture(CLASSROOM_A),
        registryEntryFromFixture(CLASSROOM_B),
        registryEntryFromFixture(CLASSROOM_C),
      ],
    };

    vi.mocked(fetchClassroomsRegistry).mockResolvedValue({
      registry: remoteRegistry,
      source: "registry",
    });
    await ensureRegistryPulled();

    await pushClassroomRegistryMerge([]);

    expect(uploadRegistryMerge).toHaveBeenCalledTimes(1);
    const uploaded = vi.mocked(uploadRegistryMerge).mock.calls[0]?.[0];
    expect(uploaded?.classrooms.map((entry) => entry.key).sort()).toEqual(
      [
        CLASSROOM_A.db.metadata.id,
        CLASSROOM_B.db.metadata.id,
        CLASSROOM_C.db.metadata.id,
      ].sort(),
    );
  });

  it("pushClassroomRegistryMerge unions local D with remote A/B/C", async () => {
    const remoteRegistry: CloudClassroomsRegistryFile = {
      version: 1,
      updatedAt: "2026-01-02T00:00:00.000Z",
      classrooms: [
        registryEntryFromFixture(CLASSROOM_A),
        registryEntryFromFixture(CLASSROOM_B),
        registryEntryFromFixture(CLASSROOM_C),
      ],
    };
    vi.mocked(fetchClassroomsRegistry).mockResolvedValue({
      registry: remoteRegistry,
      source: "registry",
    });
    await ensureRegistryPulled();

    await pushClassroomRegistryMerge([registrySummaryFromFixture(CLASSROOM_A)]);

    const uploaded = vi.mocked(uploadRegistryMerge).mock.calls.at(-1)?.[0];
    expect(uploaded?.classrooms.map((entry) => entry.key).sort()).toEqual(
      [
        CLASSROOM_A.db.metadata.id,
        CLASSROOM_B.db.metadata.id,
        CLASSROOM_C.db.metadata.id,
      ].sort(),
    );
  });
});
