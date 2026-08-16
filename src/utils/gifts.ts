import type { Gift, PointHistory, RewardHistory } from "../types/models";
import type { ClassroomDatabase } from "../database/types";
import { classroomAssetService } from "../database/assets/classroom-asset.service";
import { createId } from "./id";
import { capHistory } from "./historyLimits";

type LegacyReward = Gift & {
  image?: string;
};

export function normalizeRequiredPoints(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  return 1;
}

export function normalizeGift(reward: LegacyReward): Gift {
  const { image: _image, ...rest } = reward;
  return {
    id: rest.id,
    name: rest.name.trim(),
    imagePath: rest.imagePath,
    description: rest.description?.trim() || undefined,
    requiredPoints: normalizeRequiredPoints(rest.requiredPoints),
    isActive: rest.isActive ?? true,
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
  };
}

export function normalizeGiftsOnDatabase(db: ClassroomDatabase): ClassroomDatabase {
  const rewards = (db.rewards ?? []).map((reward) => normalizeGift(reward as LegacyReward));
  return { ...db, rewards };
}

export async function migrateLegacyGiftImages(
  db: ClassroomDatabase,
): Promise<{ database: ClassroomDatabase; didMigrate: boolean }> {
  const classroomId = db.metadata.id;
  let changed = false;
  const rewards: Gift[] = [];

  for (const raw of db.rewards ?? []) {
    const legacy = raw as LegacyReward;
    let gift = normalizeGift(legacy);

    if (!gift.imagePath && legacy.image?.startsWith("data:image/")) {
      try {
        const imagePath = await classroomAssetService.saveGiftImageFromDataUrl(
          classroomId,
          gift.id,
          legacy.image,
        );
        gift = { ...gift, imagePath, updatedAt: new Date().toISOString() };
        changed = true;
      } catch (error) {
        console.warn("[migrateLegacyGiftImages] failed for gift", gift.id, error);
      }
    }

    if (legacy.image && !legacy.image.startsWith("data:image/")) {
      changed = true;
    }

    rewards.push(gift);
  }

  if (!changed) {
    return { database: normalizeGiftsOnDatabase(db), didMigrate: false };
  }

  return {
    database: {
      ...db,
      rewards,
      metadata: {
        ...db.metadata,
        updatedAt: new Date().toISOString(),
      },
    },
    didMigrate: true,
  };
}

export type RedeemGiftError = "not-found" | "inactive" | "insufficient-points";

export function buildRedeemGiftUpdate(
  current: ClassroomDatabase,
  studentId: string,
  giftId: string,
): { next: ClassroomDatabase } | { error: RedeemGiftError } {
  const gift = current.rewards.find((item) => item.id === giftId);
  const student = current.students.find((item) => item.id === studentId);
  if (!gift || !student) return { error: "not-found" };
  if (!gift.isActive) return { error: "inactive" };
  if (student.points < gift.requiredPoints) return { error: "insufficient-points" };

  const now = new Date().toISOString();
  const pointsSpent = gift.requiredPoints;

  const pointHistory: PointHistory = {
    id: createId("points"),
    studentId,
    actionName: `Đổi quà - ${gift.name}`,
    points: -pointsSpent,
    source: "reward-redemption",
    createdAt: now,
  };

  const rewardHistory: RewardHistory = {
    id: createId("reward"),
    studentId,
    rewardId: gift.id,
    rewardName: gift.name,
    pointsSpent,
    createdAt: now,
  };

  return {
    next: {
      ...current,
      students: current.students.map((item) =>
        item.id === studentId
          ? {
              ...item,
              points: item.points - pointsSpent,
              totalRewards: (item.totalRewards ?? 0) + 1,
              updatedAt: now,
            }
          : item,
      ),
      rewardHistory: [rewardHistory, ...current.rewardHistory],
      pointHistory: capHistory([pointHistory, ...current.pointHistory]),
    },
  };
}

export type { Gift };
