import { describe, expect, it } from "vitest";
import {
  buildClassroomFileKey,
  buildClassroomsRegistryKey,
  buildLegacyBackupStorageKey,
  buildUserClassroomKey,
  buildUserClassroomsPrefix,
  sanitizeBackupIdentifier,
} from "./paths";

describe("paths", () => {
  it("sanitizes valid identifiers", () => {
    expect(sanitizeBackupIdentifier("2-7_2026-2027")).toBe("2-7_2026-2027");
  });

  it("rejects unsafe identifiers", () => {
    expect(sanitizeBackupIdentifier("../evil")).toBeNull();
    expect(sanitizeBackupIdentifier("")).toBeNull();
  });

  it("builds user classroom key", () => {
    expect(buildUserClassroomKey("usr_abc", "class-1")).toBe(
      "users/usr_abc/classrooms/class-1/database.json",
    );
  });

  it("builds legacy backup key", () => {
    expect(buildLegacyBackupStorageKey("device-1", "class-1")).toBe(
      "backups/device-1/class-1/latest.json",
    );
  });

  it("builds classrooms prefix", () => {
    expect(buildUserClassroomsPrefix("usr_abc")).toBe("users/usr_abc/classrooms/");
  });

  it("builds classroom file and registry keys", () => {
    expect(buildClassroomFileKey("usr_abc", "2-7_2026-2027", "students.json")).toBe(
      "users/usr_abc/classrooms/2-7_2026-2027/students.json",
    );
    expect(buildClassroomsRegistryKey("usr_abc")).toBe("users/usr_abc/classrooms.json");
  });
});
