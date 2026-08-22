import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureRegistryPulled,
  hydrateClassroomFromCloud,
  HydrateCancelledError,
  mergeAndRememberRegistry,
  resetRegistryPullStateForTests,
} from "./cloud-registry.service";
import type { CloudClassroomsRegistryFile } from "./cloud-types";

vi.mock("@/src/auth/api", () => ({
  fetchClassroomsRegistry: vi.fn(),
  listCloudClassrooms: vi.fn(),
  restoreCloudClassroom: vi.fn(),
  restoreCloudClassroomAssets: vi.fn(),
}));

vi.mock("./cloud-backup.service", () => ({
  cloudBackupScheduler: {
    setRegistrySummaries: vi.fn(),
    setLocalClassroomRegistry: vi.fn(),
  },
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

vi.mock("../database.service", () => ({
  databaseService: {
    mergeRegistryStubs: vi.fn().mockResolvedValue(undefined),
    listDatabases: vi.fn().mockResolvedValue([]),
    loadClassroomSnapshot: vi.fn().mockResolvedValue(null),
    enableCloudBackupOnAllHydratedClassrooms: vi.fn().mockResolvedValue(undefined),
    saveCloudRestoredDatabase: vi.fn(),
  },
}));

import { fetchClassroomsRegistry, restoreCloudClassroom, restoreCloudClassroomAssets } from "@/src/auth/api";
import { databaseService } from "../database.service";
import { createEmptyDatabase } from "../database.factory";

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
});
