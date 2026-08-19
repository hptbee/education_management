import { describe, expect, it } from "vitest";
import {
  bannerAssetKey,
  classroomAssetPathFromDataRoot,
  giftImageAssetKey,
  isAllowedCloudAssetPath,
  isLegacyGiftImagePath,
  resolveClassroomAssetAbsolute,
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

  it("resolves nested asset paths on Windows-style joinPath", () => {
    const winJoin = (...parts: string[]) => parts.join("\\");
    const absolute = resolveClassroomAssetAbsolute(
      "C:\\AppData\\ClassroomManagement",
      "2-7_2026-2027",
      bannerAssetKey(),
      winJoin,
    );
    expect(absolute).toBe(
      "C:\\AppData\\ClassroomManagement\\classrooms\\2-7_2026-2027\\assets\\banner.webp",
    );
  });

  it("builds a data-root-relative asset path for Tauri", () => {
    expect(classroomAssetPathFromDataRoot("2-7_2026-2027", bannerAssetKey())).toBe(
      "classrooms/2-7_2026-2027/assets/banner.webp",
    );
  });
});
