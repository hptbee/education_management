import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackupMetadataService } from "./backup-metadata.service";
import type { FileStorageAdapter } from "../storage/storage.interface";

describe("BackupMetadataService", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("records local save and cloud backup lifecycle", async () => {
    const service = new BackupMetadataService(null);
    await service.recordLocalSave("class-1", "2026-01-01T00:00:00.000Z");
    const meta = await service.getClassroomMeta("class-1");
    expect(meta.lastLocalSaveAt).toBe("2026-01-01T00:00:00.000Z");

    await service.recordCloudBackupPending("class-1");
    await service.recordCloudBackupSuccess("class-1", "2026-01-02T00:00:00.000Z");
    const success = await service.getClassroomMeta("class-1");
    expect(success.lastCloudBackupStatus).toBe("success");

    await service.recordCloudBackupFailure("class-1", "network");
    const failed = await service.getClassroomMeta("class-1");
    expect(failed.lastCloudBackupStatus).toBe("failed");
    expect(failed.lastCloudBackupError).toBe("network");
  });

  it("reads and writes via fs adapter", async () => {
    const files: Record<string, string> = {};
    const fs: FileStorageAdapter = {
      getDataDirectory: async () => "/data",
      joinPath: (...parts: string[]) => parts.join("/"),
      fileExists: async (path: string) => path in files,
      readTextFile: async (path: string) => files[path],
      writeTextFile: async (path: string, contents: string) => {
        files[path] = contents;
      },
      ensureDir: vi.fn(),
      readBinaryFile: vi.fn(),
      writeBinaryFile: vi.fn(),
      removeFile: vi.fn(),
      removeDir: vi.fn(),
      renamePath: vi.fn(),
      listDir: vi.fn().mockResolvedValue([]),
      openPath: vi.fn(),
    };
    const service = new BackupMetadataService(fs);
    await service.updateClassroomMeta("class-2", { lastCloudBackupStatus: "pending" });
    const meta = await service.getClassroomMeta("class-2");
    expect(meta.lastCloudBackupStatus).toBe("pending");
    expect(files["/data/backup-status.json"]).toContain("class-2");
  });
});
