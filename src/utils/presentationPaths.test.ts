import { describe, expect, it } from "vitest";
import { isPresentationPath, PRESENTATION_PATHS } from "./presentationPaths";

describe("isPresentationPath", () => {
  it("allows presentation routes and nested paths", () => {
    for (const path of PRESENTATION_PATHS) {
      expect(isPresentationPath(path)).toBe(true);
      expect(isPresentationPath(`${path}/nested`)).toBe(true);
    }
  });

  it("rejects non-presentation routes", () => {
    expect(isPresentationPath("/settings")).toBe(false);
    expect(isPresentationPath("/students")).toBe(false);
    expect(isPresentationPath("/points")).toBe(false);
    expect(isPresentationPath("/history")).toBe(false);
    expect(isPresentationPath("/")).toBe(false);
  });
});
