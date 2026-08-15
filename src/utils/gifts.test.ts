import { describe, expect, it, vi } from "vitest";
import { normalizeGift, normalizeGiftsOnDatabase, migrateLegacyGiftImages } from "./gifts";
import type { ClassroomDatabase } from "../database/types";

vi.mock("../database/assets/classroom-asset.service", () => ({
  classroomAssetService: {
    saveGiftImageFromDataUrl: vi.fn(),
  },
}));

import { classroomAssetService } from "../database/assets/classroom-asset.service";

function minimalDb(rewards: ClassroomDatabase["rewards"]): ClassroomDatabase {
  return {
    metadata: {
      id: "test-class",
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    classroomSettings: {
      id: "test-class",
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: {
        id: "teacher-1",
        name: "Teacher",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    students: [],
    teams: [],
    pointActions: [],
    pointHistory: [],
    rewards,
    rewardHistory: [],
    recognitions: [],
    teamScoreHistory: [],
    classroomRoles: [],
    badges: [],
    recognitionTitles: [],
    luckyWheelHistory: [],
    badgeAwardHistory: [],
    wheelStudentBag: [],
    appSettings: { soundEnabled: true, animationsEnabled: true },
  };
}

describe("gifts normalization", () => {
  it("strips legacy requiredPoints and image fields", () => {
    const gift = normalizeGift({
      id: "gift-1",
      name: "  Sticker  ",
      description: "  Cute  ",
      requiredPoints: 15,
      image: "data:image/png;base64,abc",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(gift.name).toBe("Sticker");
    expect(gift.description).toBe("Cute");
    expect("requiredPoints" in gift).toBe(false);
    expect("image" in gift).toBe(false);
  });

  it("normalizes rewards array on database load", () => {
    const db = normalizeGiftsOnDatabase(
      minimalDb([
        {
          id: "gift-1",
          name: "Quà",
          requiredPoints: 10,
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        } as never,
      ]),
    );

    expect(db.rewards[0].name).toBe("Quà");
    expect("requiredPoints" in db.rewards[0]).toBe(false);
  });

  it("keeps legacy data-URL image when migration save fails", async () => {
    vi.mocked(classroomAssetService.saveGiftImageFromDataUrl).mockRejectedValueOnce(
      new Error("disk full"),
    );

    const db = minimalDb([
      {
        id: "gift-1",
        name: "Quà",
        image: "data:image/png;base64,abc",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as never,
    ]);

    const { database, didMigrate } = await migrateLegacyGiftImages(db);

    expect(didMigrate).toBe(false);
    expect(database.rewards[0].imagePath).toBeUndefined();
    expect(database.rewards[0].name).toBe("Quà");
  });
});
