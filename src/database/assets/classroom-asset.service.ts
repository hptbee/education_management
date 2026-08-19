import { isTauri, tauriFs } from "../tauri-fs.service";
import type { Gift } from "../../types/models";
import type { ClassroomDatabase } from "../types";
import { processImageDataUrl, processImageFile } from "../../utils/images";
import {
  classroomAssetPathFromDataRoot,
  classroomAssetRootRelative,
  giftImageAssetKey,
  isClassroomAssetPath,
  isLegacyGiftImagePath,
  parentDirForAsset,
  resolveClassroomAssetAbsolute,
} from "./classroom-asset-paths";
import { IndexedDbAssetAdapter, webAssetStorageKey } from "./indexeddb-asset.store";
import { logCloudTrace } from "../../logging/app-log";

/** @deprecated Use ASSET_IMAGE_RULES.gift — kept for callers during migration. */
export const GIFT_IMAGE = {
  maxFileBytes: 12 * 1024 * 1024,
  allowedMime: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
} as const;

/** @deprecated Use isLegacyGiftImagePath */
export const isGiftImagePath = isLegacyGiftImagePath;

export class ClassroomAssetService {
  private readonly webStore = new IndexedDbAssetAdapter();

  private async getFs() {
    if (isTauri()) return tauriFs;
    return null;
  }

  private async ensureParentDir(classroomId: string, relativePath: string): Promise<void> {
    const parent = parentDirForAsset(relativePath);
    if (!parent) return;

    if (isTauri()) {
      const fs = await this.getFs();
      await fs!.ensureDir(classroomAssetPathFromDataRoot(classroomId, parent));
    }
  }

  async saveAsset(classroomId: string, relativePath: string, bytes: Uint8Array): Promise<string> {
    if (!isClassroomAssetPath(relativePath)) {
      throw new Error("Đường dẫn tài nguyên không hợp lệ.");
    }

    if (isTauri()) {
      const fs = await this.getFs();
      await this.ensureParentDir(classroomId, relativePath);
      const fromDataRoot = classroomAssetPathFromDataRoot(classroomId, relativePath);
      await fs!.writeBinaryFile(fromDataRoot, bytes);
      logCloudTrace("info", "cloud-restore", "saveAsset tauri", {
        classroomId,
        relativePath,
        fromDataRoot,
        bytes: bytes.length,
      });
    } else {
      await this.webStore.writeBinaryFile(webAssetStorageKey(classroomId, relativePath), bytes);
      logCloudTrace("info", "cloud-restore", "saveAsset indexeddb", {
        classroomId,
        relativePath,
        bytes: bytes.length,
      });
    }

    return relativePath;
  }

  async readAsset(classroomId: string, relativePath: string): Promise<Uint8Array | null> {
    if (!relativePath || !isClassroomAssetPath(relativePath)) return null;

    if (isTauri()) {
      const fs = await this.getFs();
      const dataDir = await fs!.getDataDirectory();
      const absolutePath = resolveClassroomAssetAbsolute(dataDir, classroomId, relativePath, fs!.joinPath);
      try {
        const exists = await fs!.fileExists(absolutePath);
        if (!exists) return null;
        return await fs!.readBinaryFile(absolutePath);
      } catch {
        return null;
      }
    }

    const key = webAssetStorageKey(classroomId, relativePath);
    const exists = await this.webStore.fileExists(key);
    if (!exists) return null;
    return this.webStore.readBinaryFile(key);
  }

  async deleteAsset(classroomId: string, relativePath?: string): Promise<void> {
    if (!relativePath || !isClassroomAssetPath(relativePath)) return;

    if (isTauri()) {
      const fs = await this.getFs();
      const dataDir = await fs!.getDataDirectory();
      const absolutePath = resolveClassroomAssetAbsolute(dataDir, classroomId, relativePath, fs!.joinPath);
      await fs!.removeFile(absolutePath);
      return;
    }

    await this.webStore.removeFile(webAssetStorageKey(classroomId, relativePath));
  }

  async listAssets(classroomId: string, prefix = "assets/"): Promise<string[]> {
    if (isTauri()) {
      const fs = await this.getFs();
      const dataDir = await fs!.getDataDirectory();
      const root = resolveClassroomAssetAbsolute(dataDir, classroomId, prefix.replace(/\/$/, ""), fs!.joinPath);
      const exists = await fs!.fileExists(root);
      if (!exists) return [];
      return this.listFilesRecursive(fs!, root, prefix.replace(/\/$/, ""));
    }

    return this.webStore.listKeys(classroomId, prefix);
  }

  private async listFilesRecursive(
    fs: NonNullable<Awaited<ReturnType<ClassroomAssetService["getFs"]>>>,
    absoluteDir: string,
    relativePrefix: string,
  ): Promise<string[]> {
    const entries = await fs.listDir(absoluteDir);
    const results: string[] = [];

    for (const entry of entries) {
      const absolutePath = fs.joinPath(absoluteDir, entry);
      const relativePath = relativePrefix ? `${relativePrefix}/${entry}` : entry;
      const isFile = /\.[a-z0-9]+$/i.test(entry);
      if (!isFile) {
        const nested = await this.listFilesRecursive(fs, absolutePath, relativePath);
        results.push(...nested);
      } else {
        results.push(relativePath);
      }
    }

    return results;
  }

  async copyAsset(
    fromClassroomId: string,
    toClassroomId: string,
    relativePath: string,
    targetPath?: string,
  ): Promise<void> {
    if (fromClassroomId === toClassroomId && (!targetPath || targetPath === relativePath)) return;

    const bytes = await this.readAsset(fromClassroomId, relativePath);
    if (!bytes || bytes.length === 0) return;

    await this.saveAsset(toClassroomId, targetPath ?? relativePath, bytes);
  }

  async copyAssets(fromClassroomId: string, toClassroomId: string, relativePaths: string[]): Promise<void> {
    const unique = [...new Set(relativePaths.filter(Boolean))];
    for (const path of unique) {
      await this.copyAsset(fromClassroomId, toClassroomId, path);
    }
  }

  collectReferencedAssetKeys(data: ClassroomDatabase): string[] {
    const keys = new Set<string>();

    const teacherKey = data.classroomSettings.teacher?.avatarAssetKey;
    if (teacherKey) keys.add(teacherKey);

    const bannerKey = data.classroomSettings.bannerAssetKey;
    if (bannerKey) keys.add(bannerKey);

    const classAvatarKey = data.classroomSettings.classAvatarAssetKey;
    if (classAvatarKey) keys.add(classAvatarKey);

    for (const student of data.students ?? []) {
      if (student.avatarAssetKey) keys.add(student.avatarAssetKey);
    }

    for (const gift of data.rewards ?? []) {
      if (gift.imagePath) keys.add(gift.imagePath);
    }

    return [...keys];
  }

  async copyClassroomAssets(
    fromClassroomId: string,
    toClassroomId: string,
    data: ClassroomDatabase,
    keyRemap?: Map<string, string>,
  ): Promise<void> {
    if (fromClassroomId === toClassroomId) return;

    const keys = this.collectReferencedAssetKeys(data);
    for (const key of keys) {
      const targetKey = keyRemap?.get(key) ?? key;
      await this.copyAsset(fromClassroomId, toClassroomId, key, targetKey);
    }
  }

  /** @deprecated Use copyClassroomAssets */
  async copyClassroomGiftImages(fromClassroomId: string, toClassroomId: string, gifts: Gift[]): Promise<void> {
    const paths = [...new Set(gifts.map((gift) => gift.imagePath).filter((path): path is string => Boolean(path)))];
    await this.copyAssets(fromClassroomId, toClassroomId, paths);
  }

  async saveGiftImage(classroomId: string, giftId: string, file: File): Promise<string> {
    const bytes = await processImageFile(file, "gift");
    const relativePath = giftImageAssetKey(giftId);
    await this.saveAsset(classroomId, relativePath, bytes);
    return relativePath;
  }

  async saveGiftImageFromDataUrl(classroomId: string, giftId: string, dataUrl: string): Promise<string> {
    const bytes = await processImageDataUrl(dataUrl, "gift");
    const relativePath = giftImageAssetKey(giftId);
    await this.saveAsset(classroomId, relativePath, bytes);
    return relativePath;
  }

  /** @deprecated Use readAsset */
  async readGiftImage(classroomId: string, relativePath: string): Promise<Uint8Array | null> {
    return this.readAsset(classroomId, relativePath);
  }

  /** @deprecated Use deleteAsset */
  async deleteGiftImage(classroomId: string, relativePath?: string): Promise<void> {
    await this.deleteAsset(classroomId, relativePath);
  }

  async deleteClassroomAssets(classroomId: string): Promise<void> {
    if (isTauri()) {
      const fs = await this.getFs();
      const dataDir = await fs!.getDataDirectory();
      const dirPath = fs!.joinPath(dataDir, classroomAssetRootRelative(classroomId));
      await fs!.removeDir(dirPath);
      return;
    }

    await this.webStore.removeDir(classroomId);
  }
}

export const classroomAssetService = new ClassroomAssetService();
