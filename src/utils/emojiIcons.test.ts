import { describe, expect, it } from "vitest";
import { TEAM_EMOJI_OPTIONS } from "./emojiIcons";

describe("emojiIcons", () => {
  it("exports team emoji options", () => {
    expect(TEAM_EMOJI_OPTIONS.length).toBeGreaterThan(10);
    expect(TEAM_EMOJI_OPTIONS[0]).toBe("🌞");
  });
});
