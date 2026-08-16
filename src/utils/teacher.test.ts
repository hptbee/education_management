import { describe, expect, it } from "vitest";
import { getTeacherAvatar } from "./teacher";

describe("getTeacherAvatar", () => {
  it("returns trimmed avatar url", () => {
    expect(getTeacherAvatar({ avatar: "  data:image/png;base64,x  " })).toBe("data:image/png;base64,x");
  });

  it("returns undefined when missing", () => {
    expect(getTeacherAvatar(null)).toBeUndefined();
  });
});
