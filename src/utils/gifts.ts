import type { Gift } from "../types/models";
import type { ClassroomDatabase } from "../database/types";
import { classroomAssetService } from "../database/assets/classroom-asset.service";

type LegacyReward = Gift & {
  image?: string;
  requiredPoints?: number;
};

export function normalizeGift(reward: LegacyReward): Gift {
  const { image: _image, requiredPoints: _points, ...rest } = reward;
  return {
    id: rest.id,
    name: rest.name.trim(),
    imagePath: rest.imagePath,
    description: rest.description?.trim() || undefined,
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

    if (legacy.requiredPoints !== undefined) {
      changed = true;
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

export type { Gift };
