import { isTauri, tauriFs } from "../tauri-fs.service";
import type { Gift } from "../../types/models";
import {
  classroomAssetRootRelative,
  extensionFromFileName,
  extensionFromMime,
  giftImageRelativePath,
  isGiftImagePath,
  resolveClassroomAssetAbsolute,
} from "./classroom-asset-paths";
import { IndexedDbAssetAdapter, webAssetStorageKey } from "./indexeddb-asset.store";

export const GIFT_IMAGE = {
  maxFileBytes: 2 * 1024 * 1024,
  allowedMime: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
} as const;

function assertGiftImageFile(file: File): void {
  if (!GIFT_IMAGE.allowedMime.has(file.type as (typeof GIFT_IMAGE.allowedMime extends Set<infer T> ? T : never))) {
    throw new Error("Vui lòng chọn ảnh PNG, JPG, WEBP hoặc GIF.");
  }
  if (file.size > GIFT_IMAGE.maxFileBytes) {
    throw new Error(`Ảnh quá lớn. Vui lòng chọn ảnh tối đa ${GIFT_IMAGE.maxFileBytes / (1024 * 1024)} MB.`);
  }
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) {
    throw new Error("Invalid image data URL");
  }
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, mime };
}

export class ClassroomAssetService {
  private readonly webStore = new IndexedDbAssetAdapter();

  private async getFs() {
    if (isTauri()) return tauriFs;
    return null;
  }

  async saveGiftImage(classroomId: string, giftId: string, file: File): Promise<string> {
    assertGiftImageFile(file);
    const extension = extensionFromMime(file.type) || extensionFromFileName(file.name);
    const relativePath = giftImageRelativePath(giftId, extension);
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (isTauri()) {
      const fs = await this.getFs();
      const dataDir = await fs!.getDataDirectory();
      const absolutePath = resolveClassroomAssetAbsolute(dataDir, classroomId, relativePath, fs!.joinPath);
      await fs!.ensureDir(fs!.joinPath(dataDir, "classrooms", classroomId, "images", "gifts"));
      await fs!.writeBinaryFile(absolutePath, bytes);
    } else {
      await this.webStore.writeBinaryFile(webAssetStorageKey(classroomId, relativePath), bytes);
    }

    return relativePath;
  }

  async saveGiftImageFromDataUrl(classroomId: string, giftId: string, dataUrl: string): Promise<string> {
    const { bytes, mime } = dataUrlToBytes(dataUrl);
    if (bytes.length > GIFT_IMAGE.maxFileBytes) {
      throw new Error("Ảnh quá lớn để chuyển đổi.");
    }
    const extension = extensionFromMime(mime);
    const relativePath = giftImageRelativePath(giftId, extension);

    if (isTauri()) {
      const fs = await this.getFs();
      const dataDir = await fs!.getDataDirectory();
      const absolutePath = resolveClassroomAssetAbsolute(dataDir, classroomId, relativePath, fs!.joinPath);
      await fs!.ensureDir(fs!.joinPath(dataDir, "classrooms", classroomId, "images", "gifts"));
      await fs!.writeBinaryFile(absolutePath, bytes);
    } else {
      await this.webStore.writeBinaryFile(webAssetStorageKey(classroomId, relativePath), bytes);
    }

    return relativePath;
  }

  async readGiftImage(classroomId: string, relativePath: string): Promise<Uint8Array | null> {
    if (!isGiftImagePath(relativePath)) return null;

    if (isTauri()) {
      const fs = await this.getFs();
      const dataDir = await fs!.getDataDirectory();
      const absolutePath = resolveClassroomAssetAbsolute(dataDir, classroomId, relativePath, fs!.joinPath);
      const exists = await fs!.fileExists(absolutePath);
      if (!exists) return null;
      return fs!.readBinaryFile(absolutePath);
    }

    const exists = await this.webStore.fileExists(webAssetStorageKey(classroomId, relativePath));
    if (!exists) return null;
    return this.webStore.readBinaryFile(webAssetStorageKey(classroomId, relativePath));
  }

  async deleteGiftImage(classroomId: string, relativePath?: string): Promise<void> {
    if (!relativePath || !isGiftImagePath(relativePath)) return;

    if (isTauri()) {
      const fs = await this.getFs();
      const dataDir = await fs!.getDataDirectory();
      const absolutePath = resolveClassroomAssetAbsolute(dataDir, classroomId, relativePath, fs!.joinPath);
      await fs!.removeFile(absolutePath);
      return;
    }

    await this.webStore.removeFile(webAssetStorageKey(classroomId, relativePath));
  }

  async copyClassroomGiftImages(fromClassroomId: string, toClassroomId: string, gifts: Gift[]): Promise<void> {
    if (fromClassroomId === toClassroomId) return;

    const paths = [...new Set(gifts.map((gift) => gift.imagePath).filter((path): path is string => Boolean(path)))];
    for (const relativePath of paths) {
      const bytes = await this.readGiftImage(fromClassroomId, relativePath);
      if (!bytes || bytes.length === 0) continue;

      if (isTauri()) {
        const fs = await this.getFs();
        const dataDir = await fs!.getDataDirectory();
        const absolutePath = resolveClassroomAssetAbsolute(dataDir, toClassroomId, relativePath, fs!.joinPath);
        await fs!.ensureDir(fs!.joinPath(dataDir, "classrooms", toClassroomId, "images", "gifts"));
        await fs!.writeBinaryFile(absolutePath, bytes);
      } else {
        await this.webStore.writeBinaryFile(webAssetStorageKey(toClassroomId, relativePath), bytes);
      }
    }
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
