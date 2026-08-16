import { describe, expect, it } from "vitest";
import {
  createDefaultRecognitionTitles,
  DEFAULT_RECOGNITION_TITLE_SEEDS,
  normalizeRecognitionTitlesOnDatabase,
} from "./recognitionTitles";

describe("createDefaultRecognitionTitles", () => {
  it("creates titles from seeds", () => {
    const titles = createDefaultRecognitionTitles();
    expect(titles.length).toBe(DEFAULT_RECOGNITION_TITLE_SEEDS.length);
    expect(titles[0].isActive).toBe(true);
  });
});

describe("normalizeRecognitionTitlesOnDatabase", () => {
  it("links badges to titles", () => {
    const normalized = normalizeRecognitionTitlesOnDatabase({ recognitionTitles: [], badges: [] });
    expect(normalized.recognitionTitles.length).toBeGreaterThan(0);
    expect(normalized.badges.length).toBeGreaterThan(0);
  });
});
