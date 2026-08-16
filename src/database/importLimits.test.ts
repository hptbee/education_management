import { describe, expect, it } from "vitest";
import { MAX_IMPORT_FILE_BYTES, assertImportFileSize } from "./importLimits";

describe("assertImportFileSize", () => {
  it("allows files under limit", () => {
    const file = new File(["{}"], "class.json", { type: "application/json" });
    expect(() => assertImportFileSize(file)).not.toThrow();
  });

  it("rejects files over limit", () => {
    const big = new File([new Uint8Array(MAX_IMPORT_FILE_BYTES + 1)], "big.json");
    expect(() => assertImportFileSize(big)).toThrow(/File quá lớn/);
  });
});
