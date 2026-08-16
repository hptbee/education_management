import { describe, expect, it } from "vitest";
import {
  assertSafeClassroomId,
  isSafeClassroomId,
  sanitizeBackupIdentifier,
} from "./safeIdentifiers";

describe("isSafeClassroomId", () => {
  it("accepts alphanumeric, hyphen, underscore", () => {
    expect(isSafeClassroomId("2-7_2026-2027")).toBe(true);
    expect(isSafeClassroomId("classroom_abc-123")).toBe(true);
  });

  it("rejects traversal, separators, and empty values", () => {
    expect(isSafeClassroomId("")).toBe(false);
    expect(isSafeClassroomId("..")).toBe(false);
    expect(isSafeClassroomId("a/b")).toBe(false);
    expect(isSafeClassroomId("a\\b")).toBe(false);
    expect(isSafeClassroomId("has space")).toBe(false);
  });

  it("rejects ids longer than 128 characters", () => {
    expect(isSafeClassroomId("a".repeat(129))).toBe(false);
    expect(isSafeClassroomId("a".repeat(128))).toBe(true);
  });
});

describe("assertSafeClassroomId", () => {
  it("throws Vietnamese error for unsafe ids", () => {
    expect(() => assertSafeClassroomId("../evil")).toThrow(
      "Mã dữ liệu lớp không hợp lệ",
    );
  });
});

describe("sanitizeBackupIdentifier", () => {
  it("returns trimmed safe identifiers", () => {
    expect(sanitizeBackupIdentifier("device-123_abc")).toBe("device-123_abc");
  });

  it("returns null for unsafe identifiers", () => {
    expect(sanitizeBackupIdentifier("../evil")).toBeNull();
    expect(sanitizeBackupIdentifier("a/b")).toBeNull();
  });
});
