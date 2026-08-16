import { describe, expect, it } from "vitest";
import {
  generateDatabaseId,
  generateExportFilename,
  makeClassroomFileName,
} from "./database.utils";

describe("generateDatabaseId", () => {
  it("slugifies class name and school year", () => {
    expect(generateDatabaseId("2/7", "2026-2027")).toBe("2-7_2026-2027");
  });
});

describe("makeClassroomFileName", () => {
  it("builds safe classroom JSON filename", () => {
    expect(makeClassroomFileName("2-7_2026-2027")).toBe("Lop-2-7_2026-2027.json");
  });

  it("rejects unsafe database ids", () => {
    expect(() => makeClassroomFileName("../evil")).toThrow(
      "Mã dữ liệu lớp không hợp lệ cho tên file.",
    );
  });
});

describe("generateExportFilename", () => {
  it("matches classroom file naming convention", () => {
    expect(generateExportFilename("2/7", "2026-2027")).toBe("Lop-2-7_2026-2027.json");
  });
});
