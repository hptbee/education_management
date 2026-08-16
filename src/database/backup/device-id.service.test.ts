import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceIdService } from "./device-id.service";
import type { FileStorageAdapter } from "../storage/storage.interface";

describe("DeviceIdService", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("creates and caches device id from localStorage", async () => {
    const service = new DeviceIdService(null);
    const id1 = await service.getDeviceId();
    const id2 = await service.getDeviceId();
    expect(id1).toBe(id2);
    expect(id1.length).toBeGreaterThan(10);
  });

  it("reads device id from fs adapter", async () => {
    const fs: FileStorageAdapter = {
      getDataDirectory: async () => "/data",
      joinPath: (...parts: string[]) => parts.join("/"),
      fileExists: async () => true,
      readTextFile: async () => JSON.stringify({ deviceId: "device-from-file" }),
      writeTextFile: vi.fn(),
      ensureDir: vi.fn(),
      readBinaryFile: vi.fn(),
      writeBinaryFile: vi.fn(),
      removeFile: vi.fn(),
      removeDir: vi.fn(),
      renamePath: vi.fn(),
      openPath: vi.fn(),
    };
    const service = new DeviceIdService(fs);
    expect(await service.getDeviceId()).toBe("device-from-file");
  });
});
