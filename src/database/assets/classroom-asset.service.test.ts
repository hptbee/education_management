import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Gift } from "../../types/models";

const readGiftImage = vi.fn();
const writeBinaryFile = vi.fn();

vi.mock("../tauri-fs.service", () => ({
  isTauri: () => false,
  tauriFs: {},
}));

vi.mock("./indexeddb-asset.store", () => ({
  IndexedDbAssetAdapter: vi.fn().mockImplementation(() => ({
    writeBinaryFile,
    readBinaryFile: vi.fn(),
    removeFile: vi.fn(),
    removeDir: vi.fn(),
    renamePath: vi.fn(),
    fileExists: vi.fn(),
  })),
  webAssetStorageKey: (classroomId: string, relativePath: string) => `${classroomId}::${relativePath}`,
}));

describe("ClassroomAssetService.copyClassroomGiftImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies each unique gift image path to the target classroom", async () => {
    const { ClassroomAssetService } = await import("./classroom-asset.service");
    const service = new ClassroomAssetService();

    const gifts: Gift[] = [
      {
        id: "gift-1",
        name: "A",
        imagePath: "images/gifts/gift-1.jpg",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "gift-2",
        name: "B",
        imagePath: "images/gifts/gift-1.jpg",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    vi.spyOn(service, "readGiftImage").mockResolvedValue(new Uint8Array([9, 8, 7]));

    await service.copyClassroomGiftImages("from-class", "to-class", gifts);

    expect(service.readGiftImage).toHaveBeenCalledTimes(1);
    expect(service.readGiftImage).toHaveBeenCalledWith("from-class", "images/gifts/gift-1.jpg");
    expect(writeBinaryFile).toHaveBeenCalledWith(
      "to-class::images/gifts/gift-1.jpg",
      new Uint8Array([9, 8, 7]),
    );
  });
});
