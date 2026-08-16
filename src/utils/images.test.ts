import { describe, expect, it } from "vitest";
import {
  homeBannerSizeHint,
  HOME_BANNER,
  sanitizeImageDataUrl,
  STUDENT_AVATAR,
  teacherAvatarSizeHint,
  TEACHER_AVATAR,
} from "./images";

describe("sanitizeImageDataUrl", () => {
  it("accepts valid jpeg data url", () => {
    const url = "data:image/jpeg;base64,abc";
    expect(sanitizeImageDataUrl(url, 1024)).toBe(url);
  });

  it("rejects non-image strings", () => {
    expect(sanitizeImageDataUrl("not-image", 1024)).toBeUndefined();
  });

  it("rejects unsupported mime", () => {
    expect(sanitizeImageDataUrl("data:image/bmp;base64,abc", 1024)).toBeUndefined();
  });

  it("rejects oversized payloads", () => {
    const huge = "data:image/png;base64," + "a".repeat(2000);
    expect(sanitizeImageDataUrl(huge, 100)).toBeUndefined();
  });
});

describe("size hints", () => {
  it("formats home banner hint", () => {
    expect(homeBannerSizeHint()).toContain(String(HOME_BANNER.recommendedWidth));
  });

  it("formats teacher avatar hint", () => {
    expect(teacherAvatarSizeHint()).toContain(String(TEACHER_AVATAR.recommendedWidth));
  });

  it("exports student avatar limits", () => {
    expect(STUDENT_AVATAR.outputSize).toBe(256);
  });
});
