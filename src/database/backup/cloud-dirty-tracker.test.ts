import { describe, expect, it } from "vitest";
import { emptyCloudDirtyState } from "./cloud-types";
import { inferDirtyFromDatabaseChange } from "./cloud-dirty-tracker";
import { createEmptyDatabase } from "../database.factory";

describe("cloud dirty assets", () => {
  it("starts with empty dirtyAssets", () => {
    expect(emptyCloudDirtyState().dirtyAssets).toEqual([]);
  });
});

describe("inferDirtyFromDatabaseChange", () => {
  it("marks classroom dirty when bannerAssetKey changes without metadata.updatedAt", () => {
    const prev = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: { id: "t1", name: "Teacher", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    });
    const next = {
      ...prev,
      classroomSettings: { ...prev.classroomSettings, bannerAssetKey: "assets/banner.webp" },
    };

    expect(inferDirtyFromDatabaseChange(prev, next).classroom).toBe(true);
  });
});

describe("cloud dirty assets", () => {
  it("starts with empty dirtyAssets", () => {
    expect(emptyCloudDirtyState().dirtyAssets).toEqual([]);
  });
});
