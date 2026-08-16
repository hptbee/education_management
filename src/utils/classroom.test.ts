import { describe, expect, it } from "vitest";
import { formatClassLabel, formatClassroomAppTitle } from "./classroom";

describe("formatClassLabel", () => {
  it("prefixes class name when missing Lớp", () => {
    expect(formatClassLabel("2/7")).toBe("Lớp 2/7");
  });

  it("keeps existing Lớp prefix", () => {
    expect(formatClassLabel("Lớp 2/7")).toBe("Lớp 2/7");
  });

  it("returns Lớp for empty", () => {
    expect(formatClassLabel()).toBe("Lớp");
  });
});

describe("formatClassroomAppTitle", () => {
  it("combines teacher and class", () => {
    expect(formatClassroomAppTitle("Cô Thu", "2/7")).toBe("Cô Thu – Lớp 2/7");
  });

  it("returns teacher only without class", () => {
    expect(formatClassroomAppTitle("Cô Thu")).toBe("Cô Thu");
  });
});
