import { describe, expect, it, vi } from "vitest";
import { createEmptyDatabase } from "../database.factory";
import { emptyCloudDirtyState } from "./cloud-types";
import { collectAssetKeysForCloudSync, applyAssetKeysFromRestoredPaths } from "./cloud-asset-sync";

vi.mock("../assets/classroom-asset.service", () => ({
  classroomAssetService: {
    collectReferencedAssetKeys: vi.fn((db: { classroomSettings: { bannerAssetKey?: string } }) => {
      const keys: string[] = [];
      if (db.classroomSettings.bannerAssetKey) keys.push(db.classroomSettings.bannerAssetKey);
      return keys;
    }),
    listAssets: vi.fn().mockResolvedValue(["assets/banner.webp", "assets/students/s1/avatar.webp"]),
  },
}));

describe("collectAssetKeysForCloudSync", () => {
  it("includes referenced keys missing from cloud sync state on incremental sync", async () => {
    const db = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: { id: "t1", name: "Teacher", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    });
    db.classroomSettings.bannerAssetKey = "assets/banner.webp";

    const keys = await collectAssetKeysForCloudSync(db.metadata.id, db, emptyCloudDirtyState(), {
      forceFull: false,
      syncState: { formatVersion: 1, fileHashes: {}, migratedToStructured: true },
    });

    expect(keys).toContain("assets/banner.webp");
  });

  it("lists on-disk assets during forceFull", async () => {
    const db = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: { id: "t1", name: "Teacher", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    });

    const keys = await collectAssetKeysForCloudSync(db.metadata.id, db, emptyCloudDirtyState(), {
      forceFull: true,
      syncState: { formatVersion: 1, fileHashes: {}, migratedToStructured: false },
    });

    expect(keys).toContain("assets/banner.webp");
    expect(keys).toContain("assets/students/s1/avatar.webp");
  });
});

describe("applyAssetKeysFromRestoredPaths", () => {
  it("fills missing banner and teacher keys from restored asset paths", () => {
    const db = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: { id: "t1", name: "Teacher", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    });

    const next = applyAssetKeysFromRestoredPaths(db, [
      { path: "assets/banner.webp" },
      { path: "assets/teacher/avatar.webp" },
    ]);

    expect(next.classroomSettings.bannerAssetKey).toBe("assets/banner.webp");
    expect(next.classroomSettings.teacher.avatarAssetKey).toBe("assets/teacher/avatar.webp");
  });
});
