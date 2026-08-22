import { describe, expect, it, vi, beforeEach } from "vitest";
import { createEmptyDatabase } from "../database.factory";
import { recordCloudRestoreSyncBaseline } from "./cloud-restore-sync";
import { backupMetadataService } from "./backup-metadata.service";

vi.mock("./backup-metadata.service", () => ({
  backupMetadataService: {
    recordCloudBackupSuccess: vi.fn().mockResolvedValue(undefined),
    updateCloudSyncState: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("recordCloudRestoreSyncBaseline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records backup success and structured sync state after restore", async () => {
    const db = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: { id: "t1", name: "Teacher", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    });

    await recordCloudRestoreSyncBaseline(db);

    expect(backupMetadataService.recordCloudBackupSuccess).toHaveBeenCalledWith(
      db.metadata.id,
      db.metadata.updatedAt,
    );
    expect(backupMetadataService.updateCloudSyncState).toHaveBeenCalledWith(
      db.metadata.id,
      expect.objectContaining({
        migratedToStructured: true,
        fileHashes: expect.any(Object),
      }),
    );
  });
});
