import { describe, expect, it } from "vitest";
import {
  bannerAssetKey,
  giftImageAssetKey,
  isAllowedCloudAssetPath,
  isLegacyGiftImagePath,
  studentAvatarAssetKey,
  teacherAvatarAssetKey,
} from "./classroom-asset-paths";

describe("classroom asset paths", () => {
  it("builds stable asset keys", () => {
    expect(teacherAvatarAssetKey()).toBe("assets/teacher/avatar.webp");
    expect(bannerAssetKey()).toBe("assets/banner.webp");
    expect(studentAvatarAssetKey("s1")).toBe("assets/students/s1/avatar.webp");
    expect(giftImageAssetKey("g1")).toBe("assets/rewards/g1/image.webp");
  });

  it("detects legacy gift paths", () => {
    expect(isLegacyGiftImagePath("images/gifts/gift-1.jpg")).toBe(true);
    expect(isLegacyGiftImagePath("../secrets.jpg")).toBe(false);
  });

  it("allowlists cloud asset paths", () => {
    expect(isAllowedCloudAssetPath("assets/banner.webp")).toBe(true);
    expect(isAllowedCloudAssetPath("assets/students/s1/avatar.webp")).toBe(true);
    expect(isAllowedCloudAssetPath("assets/evil/../secret.webp")).toBe(false);
    expect(isAllowedCloudAssetPath("classroom.json")).toBe(false);
  });
});
