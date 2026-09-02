import { describe, expect, it } from "vitest";
import { canClaimUnownedClassrooms, shouldIncludeInAccountBackup } from "./classroom-owner";

describe("classroom owner backup filter", () => {
  it("includes classrooms owned by the current user", () => {
    expect(
      shouldIncludeInAccountBackup("usr_a", "class-1", "usr_a", new Set(), "usr_a"),
    ).toBe(true);
  });

  it("excludes classrooms owned by another user", () => {
    expect(
      shouldIncludeInAccountBackup("usr_a", "class-1", "usr_b", new Set(["class-1"]), null),
    ).toBe(false);
  });

  it("claims unowned classrooms that appear in this account registry", () => {
    expect(
      shouldIncludeInAccountBackup(undefined, "class-1", "usr_b", new Set(["class-1"]), "usr_a"),
    ).toBe(true);
  });

  it("claims unowned local classrooms when this device last belonged to the same user", () => {
    expect(
      shouldIncludeInAccountBackup(undefined, "class-local", "usr_a", new Set(), "usr_a"),
    ).toBe(true);
    expect(canClaimUnownedClassrooms("usr_a", null)).toBe(true);
  });

  it("does not claim unowned local classrooms after a different account used this device", () => {
    expect(
      shouldIncludeInAccountBackup(undefined, "class-local", "usr_b", new Set(), "usr_a"),
    ).toBe(false);
  });
});
