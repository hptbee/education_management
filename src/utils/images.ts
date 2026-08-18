export type AssetImageCategory =
  | "teacherAvatar"
  | "studentAvatar"
  | "banner"
  | "gift"
  | "classAvatar";

export interface AssetImageRule {
  maxInputBytes: number;
  outputFormat: "image/webp";
  quality: number;
  /** Square crop + output size (avatars). */
  squareSize?: number;
  /** Max width, preserve aspect ratio (banner/gift). */
  maxOutputWidth?: number;
  recommendedWidth?: number;
  recommendedHeight?: number;
  aspectRatio?: string;
}

export const ASSET_IMAGE_RULES: Record<AssetImageCategory, AssetImageRule> = {
  teacherAvatar: {
    maxInputBytes: 12 * 1024 * 1024,
    outputFormat: "image/webp",
    quality: 0.85,
    squareSize: 400,
    recommendedWidth: 400,
    recommendedHeight: 400,
    aspectRatio: "1:1",
  },
  studentAvatar: {
    maxInputBytes: 12 * 1024 * 1024,
    outputFormat: "image/webp",
    quality: 0.85,
    squareSize: 256,
    recommendedWidth: 256,
    recommendedHeight: 256,
    aspectRatio: "1:1",
  },
  banner: {
    maxInputBytes: 12 * 1024 * 1024,
    outputFormat: "image/webp",
    quality: 0.82,
    maxOutputWidth: 1920,
    recommendedWidth: 1920,
    recommendedHeight: 640,
    aspectRatio: "3:1",
  },
  gift: {
    maxInputBytes: 12 * 1024 * 1024,
    outputFormat: "image/webp",
    quality: 0.85,
    maxOutputWidth: 800,
  },
  classAvatar: {
    maxInputBytes: 12 * 1024 * 1024,
    outputFormat: "image/webp",
    quality: 0.85,
    squareSize: 400,
    recommendedWidth: 400,
    recommendedHeight: 400,
    aspectRatio: "1:1",
  },
};

/** @deprecated Use ASSET_IMAGE_RULES.teacherAvatar — kept for UI hints. */
export const TEACHER_AVATAR = {
  recommendedWidth: ASSET_IMAGE_RULES.teacherAvatar.recommendedWidth!,
  recommendedHeight: ASSET_IMAGE_RULES.teacherAvatar.recommendedHeight!,
  aspectRatio: ASSET_IMAGE_RULES.teacherAvatar.aspectRatio!,
  maxFileBytes: ASSET_IMAGE_RULES.teacherAvatar.maxInputBytes,
  outputSize: ASSET_IMAGE_RULES.teacherAvatar.squareSize!,
} as const;

/** @deprecated Use ASSET_IMAGE_RULES.studentAvatar */
export const STUDENT_AVATAR = {
  recommendedWidth: ASSET_IMAGE_RULES.studentAvatar.recommendedWidth!,
  recommendedHeight: ASSET_IMAGE_RULES.studentAvatar.recommendedHeight!,
  aspectRatio: ASSET_IMAGE_RULES.studentAvatar.aspectRatio!,
  maxFileBytes: ASSET_IMAGE_RULES.studentAvatar.maxInputBytes,
  outputSize: ASSET_IMAGE_RULES.studentAvatar.squareSize!,
} as const;

/** @deprecated Use ASSET_IMAGE_RULES.banner */
export const HOME_BANNER = {
  recommendedWidth: ASSET_IMAGE_RULES.banner.recommendedWidth!,
  recommendedHeight: ASSET_IMAGE_RULES.banner.recommendedHeight!,
  aspectRatio: ASSET_IMAGE_RULES.banner.aspectRatio!,
  maxFileBytes: ASSET_IMAGE_RULES.banner.maxInputBytes,
  maxOutputWidth: ASSET_IMAGE_RULES.banner.maxOutputWidth!,
} as const;

const ALLOWED_INPUT_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function homeBannerSizeHint(): string {
  const rule = ASSET_IMAGE_RULES.banner;
  return `${rule.recommendedWidth} × ${rule.recommendedHeight} px (tỉ lệ ${rule.aspectRatio})`;
}

export function teacherAvatarSizeHint(): string {
  const rule = ASSET_IMAGE_RULES.teacherAvatar;
  return `${rule.recommendedWidth} × ${rule.recommendedHeight} px (tỉ lệ ${rule.aspectRatio})`;
}

export function studentAvatarSizeHint(): string {
  const rule = ASSET_IMAGE_RULES.studentAvatar;
  return `${rule.recommendedWidth} × ${rule.recommendedHeight} px (tỉ lệ ${rule.aspectRatio})`;
}

export function isDataImageUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

/** Strip legacy data URLs from JSON — do not persist inline images. */
export function stripInlineImageDataUrl(value: unknown): undefined {
  if (isDataImageUrl(value)) return undefined;
  if (typeof value === "string" && value.trim() !== "") return undefined;
  return undefined;
}

/** @deprecated Migration only — strips oversized/invalid data URLs. */
export function sanitizeImageDataUrl(value: unknown, maxFileBytes: number): string | undefined {
  if (!isDataImageUrl(value)) return undefined;
  const semi = value.indexOf(";");
  if (semi === -1) return undefined;
  const mime = value.slice(5, semi);
  if (!ALLOWED_INPUT_MIME.has(mime)) return undefined;
  const maxLength = Math.ceil(maxFileBytes * 1.37);
  if (value.length > maxLength) return undefined;
  return value;
}

function assertImageFile(file: File, category: AssetImageCategory): void {
  const rule = ASSET_IMAGE_RULES[category];
  if (!file.type.startsWith("image/") || !ALLOWED_INPUT_MIME.has(file.type)) {
    throw new Error("Vui lòng chọn tệp ảnh (PNG, JPG, WEBP hoặc GIF).");
  }
  if (file.size > rule.maxInputBytes) {
    throw new Error(
      `Ảnh quá lớn. Vui lòng chọn ảnh tối đa ${Math.round(rule.maxInputBytes / (1024 * 1024))} MB.`,
    );
  }
}

function loadImageFromSource(source: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không đọc được ảnh. Vui lòng thử ảnh khác."));
    if (typeof source === "string") {
      image.src = source;
    } else {
      image.src = URL.createObjectURL(source);
      image.onload = () => {
        URL.revokeObjectURL(image.src);
        resolve(image);
      };
    }
  });
}

function canvasToWebpBytes(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Không thể xử lý ảnh."));
          return;
        }
        blob
          .arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)))
          .catch(reject);
      },
      "image/webp",
      quality,
    );
  });
}

async function renderToWebp(image: HTMLImageElement, category: AssetImageCategory): Promise<Uint8Array> {
  const rule = ASSET_IMAGE_RULES[category];
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Không thể xử lý ảnh.");
  }

  if (rule.squareSize) {
    const side = Math.min(image.width, image.height);
    const sx = (image.width - side) / 2;
    const sy = (image.height - side) / 2;
    canvas.width = rule.squareSize;
    canvas.height = rule.squareSize;
    context.drawImage(image, sx, sy, side, side, 0, 0, rule.squareSize, rule.squareSize);
  } else if (rule.maxOutputWidth) {
    const maxWidth = rule.maxOutputWidth;
    const scale = image.width > maxWidth ? maxWidth / image.width : 1;
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } else {
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);
  }

  return canvasToWebpBytes(canvas, rule.quality);
}

export async function processImageFile(file: File, category: AssetImageCategory): Promise<Uint8Array> {
  assertImageFile(file, category);
  const image = await loadImageFromSource(file);
  return renderToWebp(image, category);
}

export async function processImageDataUrl(
  dataUrl: string,
  category: AssetImageCategory,
): Promise<Uint8Array> {
  if (!isDataImageUrl(dataUrl)) {
    throw new Error("Invalid image data URL");
  }
  const image = await loadImageFromSource(dataUrl);
  return renderToWebp(image, category);
}

/** @deprecated Use processImageFile + asset storage */
export async function readTeacherAvatarImage(file: File): Promise<string> {
  const bytes = await processImageFile(file, "teacherAvatar");
  return bytesToDataUrl(bytes);
}

/** @deprecated Use processImageFile + asset storage */
export async function readStudentAvatarImage(file: File): Promise<string> {
  const bytes = await processImageFile(file, "studentAvatar");
  return bytesToDataUrl(bytes);
}

/** @deprecated Use processImageFile + asset storage */
export async function readHomeBannerImage(file: File): Promise<string> {
  const bytes = await processImageFile(file, "banner");
  return bytesToDataUrl(bytes);
}

export function bytesToDataUrl(bytes: Uint8Array, mime = "image/webp"): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) {
    throw new Error("Invalid image data URL");
  }
  const mime = match[1]!;
  const binary = atob(match[2]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, mime };
}
