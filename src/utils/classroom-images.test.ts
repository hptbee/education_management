import { describe, expect, it, vi, beforeEach } from "vitest";
import { createEmptyDatabase } from "../database/database.factory";
import { teacherAvatarAssetKey } from "../database/assets/classroom-asset-paths";

function makeSettings(className = "1A", schoolYear = "2025-2026") {
  return {
    className,
    schoolYear,
    teacher: {
      id: "teacher-1",
      name: "Teacher",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

const { saveAsset } = vi.hoisted(() => ({
  saveAsset: vi.fn().mockResolvedValue("assets/teacher/avatar.webp"),
}));

vi.mock("../database/assets/classroom-asset.service", () => ({
  classroomAssetService: {
    saveAsset,
    readAsset: vi.fn(),
    deleteAsset: vi.fn(),
  },
}));

vi.mock("./images", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./images")>();
  return {
    ...actual,
    processImageDataUrl: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
});

describe("migrateLegacyClassroomImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("migrates teacher data URL to asset key without keeping inline data", async () => {
    const { migrateLegacyClassroomImages } = await import("./classroom-images");
    const db = createEmptyDatabase(makeSettings());
    db.classroomSettings.teacher.avatar = "data:image/jpeg;base64,abc";

    const { database, didMigrate } = await migrateLegacyClassroomImages(db);

    expect(didMigrate).toBe(true);
    expect(database.classroomSettings.teacher.avatarAssetKey).toBe(teacherAvatarAssetKey());
    expect(database.classroomSettings.teacher.avatar).toBeUndefined();
    expect(saveAsset).toHaveBeenCalled();
  });

  it("export JSON shape has no data:image after normalization path", async () => {
    const { normalizeClassroomDatabase } = await import("./classroomRoles");
    const db = createEmptyDatabase(makeSettings());
    db.students = [
      {
        id: "s1",
        name: "A",
        avatarAssetKey: "assets/students/s1/avatar.webp",
        avatar: "data:image/jpeg;base64,abc",
        classroomRoleIds: [],
        badgeIds: [],
        points: 0,
        totalRewards: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const normalized = normalizeClassroomDatabase(db);
    const json = JSON.stringify(normalized);
    expect(json).not.toContain("data:image");
    expect(normalized.students[0]?.avatarAssetKey).toBe("assets/students/s1/avatar.webp");
  });
});
