import { describe, expect, it } from "vitest";
import { buildBackupStorageKey, sanitizeBackupIdentifier } from "./index";

describe("worker backup key sanitization", () => {
  it("builds safe storage keys", () => {
    expect(buildBackupStorageKey("device-abc", "2-7_2026-2027")).toBe(
      "backups/device-abc/2-7_2026-2027/latest.json",
    );
  });

  it("rejects traversal and unsafe characters", () => {
    expect(sanitizeBackupIdentifier("..")).toBeNull();
    expect(sanitizeBackupIdentifier("a/b")).toBeNull();
    expect(() => buildBackupStorageKey("bad/id", "ok")).toThrow();
  });
});
