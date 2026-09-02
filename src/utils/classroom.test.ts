import { describe, expect, it } from "vitest";
import { duplicateDisplayNameIds, formatClassLabel, formatClassroomAppTitle } from "./classroom";

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

describe("duplicateDisplayNameIds", () => {
  it("marks classrooms that share class name and school year", () => {
    const ids = duplicateDisplayNameIds([
      { id: "a", className: "2/7", schoolYear: "2026-2027" },
      { id: "b", className: "2/7", schoolYear: "2026-2027" },
      { id: "c", className: "2/8", schoolYear: "2026-2027" },
    ]);
    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("returns empty when every display name is unique", () => {
    expect(
      duplicateDisplayNameIds([
        { id: "a", className: "2/7", schoolYear: "2026-2027" },
        { id: "b", className: "2/7", schoolYear: "2027-2028" },
      ]).size,
    ).toBe(0);
  });
});
