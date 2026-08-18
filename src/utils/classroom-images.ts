import type { Gift, Student } from "../types/models";
import type { ClassroomDatabase } from "../database/types";
import { classroomAssetService } from "../database/assets/classroom-asset.service";
import {
  bannerAssetKey,
  classAvatarAssetKey,
  giftImageAssetKey,
  isLegacyGiftImagePath,
  studentAvatarAssetKey,
  teacherAvatarAssetKey,
} from "../database/assets/classroom-asset-paths";
import { isDataImageUrl, processImageDataUrl } from "./images";
import { migrateLegacyGiftImages, normalizeGift } from "./gifts";

type LegacyGift = Gift & { image?: string };

async function migrateTeacherAvatar(db: ClassroomDatabase): Promise<{ db: ClassroomDatabase; changed: boolean }> {
  const classroomId = db.metadata.id;
  const teacher = db.classroomSettings.teacher;
  if (!teacher) return { db, changed: false };

  if (teacher.avatarAssetKey) {
    if (teacher.avatar && isDataImageUrl(teacher.avatar)) {
      return {
        db: {
          ...db,
          classroomSettings: {
            ...db.classroomSettings,
            teacher: { ...teacher, avatar: undefined },
          },
        },
        changed: true,
      };
    }
    return { db, changed: false };
  }

  if (!isDataImageUrl(teacher.avatar)) return { db, changed: false };

  try {
    const bytes = await processImageDataUrl(teacher.avatar, "teacherAvatar");
    const key = teacherAvatarAssetKey();
    await classroomAssetService.saveAsset(classroomId, key, bytes);
    return {
      db: {
        ...db,
        classroomSettings: {
          ...db.classroomSettings,
          teacher: {
            ...teacher,
            avatar: undefined,
            avatarAssetKey: key,
            updatedAt: new Date().toISOString(),
          },
        },
      },
      changed: true,
    };
  } catch (error) {
    console.warn("[migrateLegacyClassroomImages] teacher avatar failed", error);
    return { db, changed: false };
  }
}

async function migrateBanner(db: ClassroomDatabase): Promise<{ db: ClassroomDatabase; changed: boolean }> {
  const classroomId = db.metadata.id;
  const settings = db.classroomSettings;

  if (settings.bannerAssetKey) {
    if (settings.homeBannerImage && isDataImageUrl(settings.homeBannerImage)) {
      return {
        db: {
          ...db,
          classroomSettings: { ...settings, homeBannerImage: undefined },
        },
        changed: true,
      };
    }
    return { db, changed: false };
  }

  if (!isDataImageUrl(settings.homeBannerImage)) return { db, changed: false };

  try {
    const bytes = await processImageDataUrl(settings.homeBannerImage, "banner");
    const key = bannerAssetKey();
    await classroomAssetService.saveAsset(classroomId, key, bytes);
    return {
      db: {
        ...db,
        classroomSettings: {
          ...settings,
          homeBannerImage: undefined,
          bannerAssetKey: key,
          updatedAt: new Date().toISOString(),
        },
      },
      changed: true,
    };
  } catch (error) {
    console.warn("[migrateLegacyClassroomImages] banner failed", error);
    return { db, changed: false };
  }
}

async function migrateClassAvatar(db: ClassroomDatabase): Promise<{ db: ClassroomDatabase; changed: boolean }> {
  const classroomId = db.metadata.id;
  const settings = db.classroomSettings;

  if (settings.classAvatarAssetKey) {
    if (settings.classAvatar && isDataImageUrl(settings.classAvatar)) {
      return {
        db: {
          ...db,
          classroomSettings: { ...settings, classAvatar: undefined },
        },
        changed: true,
      };
    }
    return { db, changed: false };
  }

  if (!isDataImageUrl(settings.classAvatar)) return { db, changed: false };

  try {
    const bytes = await processImageDataUrl(settings.classAvatar, "classAvatar");
    const key = classAvatarAssetKey();
    await classroomAssetService.saveAsset(classroomId, key, bytes);
    return {
      db: {
        ...db,
        classroomSettings: {
          ...settings,
          classAvatar: undefined,
          classAvatarAssetKey: key,
          updatedAt: new Date().toISOString(),
        },
      },
      changed: true,
    };
  } catch (error) {
    console.warn("[migrateLegacyClassroomImages] classAvatar failed", error);
    return { db, changed: false };
  }
}

async function migrateStudentAvatar(
  db: ClassroomDatabase,
  student: Student,
): Promise<{ student: Student; changed: boolean }> {
  const classroomId = db.metadata.id;

  if (student.avatarAssetKey) {
    if (student.avatar && isDataImageUrl(student.avatar)) {
      return { student: { ...student, avatar: undefined }, changed: true };
    }
    return { student, changed: false };
  }

  if (!isDataImageUrl(student.avatar)) return { student, changed: false };

  try {
    const bytes = await processImageDataUrl(student.avatar, "studentAvatar");
    const key = studentAvatarAssetKey(student.id);
    await classroomAssetService.saveAsset(classroomId, key, bytes);
    return {
      student: {
        ...student,
        avatar: undefined,
        avatarAssetKey: key,
        updatedAt: new Date().toISOString(),
      },
      changed: true,
    };
  } catch (error) {
    console.warn("[migrateLegacyClassroomImages] student avatar failed", student.id, error);
    return { student, changed: false };
  }
}

async function migrateGiftPath(db: ClassroomDatabase, gift: Gift): Promise<{ gift: Gift; changed: boolean }> {
  const classroomId = db.metadata.id;
  const targetKey = giftImageAssetKey(gift.id);

  if (gift.imagePath === targetKey) return { gift, changed: false };

  if (!gift.imagePath || !isLegacyGiftImagePath(gift.imagePath)) {
    return { gift, changed: false };
  }

  try {
    const bytes = await classroomAssetService.readAsset(classroomId, gift.imagePath);
    if (!bytes || bytes.length === 0) {
      return { gift: { ...gift, imagePath: targetKey }, changed: true };
    }
    await classroomAssetService.saveAsset(classroomId, targetKey, bytes);
    await classroomAssetService.deleteAsset(classroomId, gift.imagePath);
    return {
      gift: { ...gift, imagePath: targetKey, updatedAt: new Date().toISOString() },
      changed: true,
    };
  } catch (error) {
    console.warn("[migrateLegacyClassroomImages] gift path failed", gift.id, error);
    return { gift, changed: false };
  }
}

export async function migrateLegacyClassroomImages(
  db: ClassroomDatabase,
): Promise<{ database: ClassroomDatabase; didMigrate: boolean }> {
  let working = db;
  let changed = false;

  const giftResult = await migrateLegacyGiftImages(working);
  working = giftResult.database;
  changed = changed || giftResult.didMigrate;

  let step = await migrateTeacherAvatar(working);
  working = step.db;
  changed = changed || step.changed;

  step = await migrateBanner(working);
  working = step.db;
  changed = changed || step.changed;

  step = await migrateClassAvatar(working);
  working = step.db;
  changed = changed || step.changed;

  const students: Student[] = [];
  for (const student of working.students ?? []) {
    const migrated = await migrateStudentAvatar(working, student);
    students.push(migrated.student);
    changed = changed || migrated.changed;
  }
  if (students.length > 0) {
    working = { ...working, students };
  }

  const rewards: Gift[] = [];
  for (const raw of working.rewards ?? []) {
    const gift = normalizeGift(raw as LegacyGift);
    const migrated = await migrateGiftPath(working, gift);
    rewards.push(migrated.gift);
    changed = changed || migrated.changed;
  }
  if (rewards.length > 0) {
    working = { ...working, rewards };
  }

  if (!changed) {
    return { database: working, didMigrate: false };
  }

  return {
    database: {
      ...working,
      metadata: {
        ...working.metadata,
        updatedAt: new Date().toISOString(),
      },
    },
    didMigrate: true,
  };
}
