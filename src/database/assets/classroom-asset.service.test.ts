import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Gift } from "../../types/models";
import type { ClassroomDatabase } from "../types";
import { createEmptyDatabase } from "../database.factory";

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

const readAsset = vi.fn();
const saveAsset = vi.fn();
const writeBinaryFile = vi.fn();

vi.mock("../tauri-fs.service", () => ({
  isTauri: () => false,
  tauriFs: {},
}));

vi.mock("./indexeddb-asset.store", () => ({
  IndexedDbAssetAdapter: vi.fn().mockImplementation(() => ({
    writeBinaryFile,
    readBinaryFile: vi.fn(),
    removeFile: vi.fn(),
    removeDir: vi.fn(),
    renamePath: vi.fn(),
    fileExists: vi.fn(),
    listKeys: vi.fn().mockResolvedValue([]),
  })),
  webAssetStorageKey: (classroomId: string, relativePath: string) => `${classroomId}::${relativePath}`,
}));

describe("ClassroomAssetService.copyClassroomAssets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies each unique referenced asset path to the target classroom", async () => {
    const { ClassroomAssetService } = await import("./classroom-asset.service");
    const service = new ClassroomAssetService();

    const db = createEmptyDatabase(makeSettings());
    db.rewards = [
      {
        id: "gift-1",
        name: "A",
        imagePath: "images/gifts/gift-1.jpg",
        requiredPoints: 10,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "gift-2",
        name: "B",
        imagePath: "images/gifts/gift-1.jpg",
        requiredPoints: 10,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ] satisfies Gift[];

    vi.spyOn(service, "readAsset").mockResolvedValue(new Uint8Array([9, 8, 7]));
    vi.spyOn(service, "saveAsset").mockResolvedValue("images/gifts/gift-1.jpg");

    await service.copyClassroomAssets("from-class", "to-class", db);

    expect(service.readAsset).toHaveBeenCalledTimes(1);
    expect(service.readAsset).toHaveBeenCalledWith("from-class", "images/gifts/gift-1.jpg");
    expect(service.saveAsset).toHaveBeenCalledWith(
      "to-class",
      "images/gifts/gift-1.jpg",
      new Uint8Array([9, 8, 7]),
    );
  });
});

describe("ClassroomAssetService.collectReferencedAssetKeys", () => {
  it("collects teacher, banner, student, and gift keys", async () => {
    const { ClassroomAssetService } = await import("./classroom-asset.service");
    const service = new ClassroomAssetService();
    const db = createEmptyDatabase(makeSettings());
    db.classroomSettings.bannerAssetKey = "assets/banner.webp";
    db.classroomSettings.teacher.avatarAssetKey = "assets/teacher/avatar.webp";
    db.students = [
      {
        id: "s1",
        name: "A",
        avatarAssetKey: "assets/students/s1/avatar.webp",
        classroomRoleIds: [],
        badgeIds: [],
        points: 0,
        totalRewards: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    db.rewards = [
      {
        id: "g1",
        name: "Gift",
        imagePath: "assets/rewards/g1/image.webp",
        requiredPoints: 1,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const keys = service.collectReferencedAssetKeys(db);
    expect(keys.sort()).toEqual(
      [
        "assets/banner.webp",
        "assets/rewards/g1/image.webp",
        "assets/students/s1/avatar.webp",
        "assets/teacher/avatar.webp",
      ].sort(),
    );
  });
});
