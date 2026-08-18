import { describe, expect, it } from "vitest";
import { emptyCloudDirtyState } from "./cloud-types";

describe("cloud dirty assets", () => {
  it("starts with empty dirtyAssets", () => {
    expect(emptyCloudDirtyState().dirtyAssets).toEqual([]);
  });
});
