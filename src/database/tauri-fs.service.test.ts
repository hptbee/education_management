import { afterEach, describe, expect, it, vi } from "vitest";
import { isTauri, tauriFs } from "./tauri-fs.service";

describe("isTauri", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false without tauri internals", () => {
    vi.stubGlobal("window", {});
    expect(isTauri()).toBe(false);
  });

  it("returns true when tauri internals present", () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    expect(isTauri()).toBe(true);
  });
});

describe("tauriFs", () => {
  it("joins paths with slash or backslash", () => {
    expect(tauriFs.joinPath("a", "b")).toBe("a/b");
    expect(tauriFs.joinPath("C:\\data", "file.json")).toBe("C:\\data\\file.json");
  });

  it("invokes tauri commands when mocked", async () => {
    const invoke = vi.fn().mockImplementation((cmd: string) => {
      if (cmd === "get_data_directory") return "/data";
      if (cmd === "file_exists") return true;
      if (cmd === "read_text_file") return "hello";
      if (cmd === "read_binary_file") return [1, 2, 3];
      return undefined;
    });
    vi.doMock("@tauri-apps/api/core", () => ({ invoke }));
    vi.resetModules();
    const mod = await import("./tauri-fs.service");
    expect(await mod.tauriFs.getDataDirectory()).toBe("/data");
    expect(await mod.tauriFs.fileExists("/data/x")).toBe(true);
    expect(await mod.tauriFs.readTextFile("/data/x")).toBe("hello");
    const bytes = await mod.tauriFs.readBinaryFile("/data/x");
    expect(bytes).toEqual(Uint8Array.from([1, 2, 3]));
  });
});
