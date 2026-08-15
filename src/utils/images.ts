export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Generate at 3:1 — easy enough for Grok (3:1) and close to GPT Landscape.
 * The home banner displays the full image (no crop); height follows the file's ratio.
 */
export const HOME_BANNER = {
  recommendedWidth: 1920,
  recommendedHeight: 640,
  aspectRatio: "3:1",
  maxFileBytes: 2 * 1024 * 1024,
  maxOutputWidth: 1920,
} as const;

export function homeBannerSizeHint(): string {
  return `${HOME_BANNER.recommendedWidth} × ${HOME_BANNER.recommendedHeight} px (tỉ lệ ${HOME_BANNER.aspectRatio})`;
}

/** Best teacher avatar size — square photo used in sidebar, settings, and header. */
export const TEACHER_AVATAR = {
  recommendedWidth: 400,
  recommendedHeight: 400,
  aspectRatio: "1:1",
  maxFileBytes: 1 * 1024 * 1024,
  outputSize: 400,
} as const;

/** Student profile photo — smaller than teacher avatar to keep IndexedDB lean. */
export const STUDENT_AVATAR = {
  recommendedWidth: 256,
  recommendedHeight: 256,
  aspectRatio: "1:1",
  maxFileBytes: 512 * 1024,
  outputSize: 256,
} as const;

export function teacherAvatarSizeHint(): string {
  return `${TEACHER_AVATAR.recommendedWidth} × ${TEACHER_AVATAR.recommendedHeight} px (tỉ lệ ${TEACHER_AVATAR.aspectRatio})`;
}

function assertImageFile(file: File, maxFileBytes: number): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Vui lòng chọn tệp ảnh (PNG, JPG hoặc WEBP).");
  }
  if (file.size > maxFileBytes) {
    throw new Error(`Ảnh quá lớn. Vui lòng chọn ảnh tối đa ${Math.round(maxFileBytes / (1024 * 1024))} MB.`);
  }
}

export async function readHomeBannerImage(file: File): Promise<string> {
  assertImageFile(file, HOME_BANNER.maxFileBytes);
  const dataUrl = await readImageFile(file);
  return resizeImageToMaxWidth(dataUrl, HOME_BANNER.maxOutputWidth);
}

export function sanitizeImageDataUrl(value: unknown, maxFileBytes: number): string | undefined {
  if (typeof value !== "string" || !value.startsWith("data:image/")) {
    return undefined;
  }

  const semi = value.indexOf(";");
  if (semi === -1) {
    return undefined;
  }

  const mime = value.slice(5, semi);
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!allowed.has(mime)) {
    return undefined;
  }

  const maxLength = Math.ceil(maxFileBytes * 1.37);
  if (value.length > maxLength) {
    return undefined;
  }

  return value;
}

export async function readTeacherAvatarImage(file: File): Promise<string> {
  assertImageFile(file, TEACHER_AVATAR.maxFileBytes);
  const dataUrl = await readImageFile(file);
  return cropSquareAndResize(dataUrl, TEACHER_AVATAR.outputSize);
}

export async function readStudentAvatarImage(file: File): Promise<string> {
  assertImageFile(file, STUDENT_AVATAR.maxFileBytes);
  const dataUrl = await readImageFile(file);
  return cropSquareAndResize(dataUrl, STUDENT_AVATAR.outputSize);
}

function resizeImageToMaxWidth(dataUrl: string, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.width <= maxWidth) {
        resolve(dataUrl);
        return;
      }

      const scale = maxWidth / image.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    image.onerror = () => reject(new Error("Không đọc được ảnh. Vui lòng thử ảnh khác."));
    image.src = dataUrl;
  });
}

function cropSquareAndResize(dataUrl: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.width, image.height);
      const sx = (image.width - side) / 2;
      const sy = (image.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    image.onerror = () => reject(new Error("Không đọc được ảnh. Vui lòng thử ảnh khác."));
    image.src = dataUrl;
  });
}
