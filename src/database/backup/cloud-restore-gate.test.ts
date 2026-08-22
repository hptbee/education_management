import { describe, expect, it, afterEach } from "vitest";
import {
  beginCloudRestore,
  endCloudRestore,
  isCloudRestoreInProgress,
  resetCloudRestoreGateForTests,
} from "./cloud-restore-gate";

describe("cloud-restore-gate", () => {
  afterEach(() => {
    resetCloudRestoreGateForTests();
  });

  it("tracks restore-in-progress for a classroom", () => {
    expect(isCloudRestoreInProgress()).toBe(false);
    beginCloudRestore("class-1");
    expect(isCloudRestoreInProgress()).toBe(true);
    expect(isCloudRestoreInProgress("class-1")).toBe(true);
    expect(isCloudRestoreInProgress("class-2")).toBe(false);
    endCloudRestore("class-1");
    expect(isCloudRestoreInProgress("class-1")).toBe(false);
  });

  it("keeps other classrooms gated when one restore ends", () => {
    beginCloudRestore("class-1");
    beginCloudRestore("class-2");
    endCloudRestore("class-1");
    expect(isCloudRestoreInProgress("class-1")).toBe(false);
    expect(isCloudRestoreInProgress("class-2")).toBe(true);
    expect(isCloudRestoreInProgress()).toBe(true);
    endCloudRestore("class-2");
    expect(isCloudRestoreInProgress()).toBe(false);
  });
});
