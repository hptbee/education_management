import { describe, expect, it } from "vitest";
import {
  extensionFromMime,
  giftImageRelativePath,
  isGiftImagePath,
  resolveClassroomAssetAbsolute,
} from "./classroom-asset-paths";

describe("classroom-asset-paths", () => {
  it("builds relative gift image paths", () => {
    expect(giftImageRelativePath("gift-1", "jpg")).toBe("images/gifts/gift-1.jpg");
    expect(giftImageRelativePath("gift-1", ".png")).toBe("images/gifts/gift-1.png");
  });

  it("rejects unsafe gift image paths", () => {
    expect(isGiftImagePath("images/gifts/a.jpg")).toBe(true);
    expect(isGiftImagePath("../secrets.jpg")).toBe(false);
    expect(isGiftImagePath("images/other/a.jpg")).toBe(false);
  });

  it("maps mime types to extensions", () => {
    expect(extensionFromMime("image/png")).toBe("png");
    expect(extensionFromMime("image/jpeg")).toBe("jpg");
  });

  it("resolves absolute paths under classroom folder", () => {
    const absolute = resolveClassroomAssetAbsolute(
      "C:/data",
      "2-7_2026-2027",
      "images/gifts/gift-1.jpg",
      (...parts) => parts.join("/"),
    );
    expect(absolute).toBe("C:/data/classrooms/2-7_2026-2027/images/gifts/gift-1.jpg");
    expect(absolute.startsWith("C:/")).toBe(true);
  });
});
