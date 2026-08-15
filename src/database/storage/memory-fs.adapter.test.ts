import { describe, expect, it } from "vitest";
import { MemoryFileStorageAdapter } from "../storage/memory-fs.adapter";

describe("MemoryFileStorageAdapter.renamePath", () => {
  it("moves classroom asset files to a new classroom folder", async () => {
    const fs = new MemoryFileStorageAdapter();
    const root = await fs.getDataDirectory();
    const from = `${root}/classrooms/class-a`;
    const to = `${root}/classrooms/class-b`;
    const sourceFile = `${from}/images/gifts/gift-1.jpg`;

    await fs.writeBinaryFile(sourceFile, new Uint8Array([4, 5, 6]));

    expect(await fs.fileExists(sourceFile)).toBe(true);

    await fs.renamePath(from, to);

    const targetFile = `${to}/images/gifts/gift-1.jpg`;
    expect(await fs.fileExists(sourceFile)).toBe(false);
    expect(await fs.fileExists(targetFile)).toBe(true);

    const bytes = await fs.readBinaryFile(targetFile);
    expect(Array.from(bytes)).toEqual([4, 5, 6]);
  });
});
