import { describe, expect, it, vi } from "vitest";
import { createEmptyDatabase } from "../database.factory";
import { migrateIndexedDbToJson } from "./migration.service";
import type { TauriFsClassroomStorage } from "./tauri-fs.storage";

const mockIndexedDb = {
  list: vi.fn(),
  load: vi.fn(),
};

vi.mock("./indexed-db.storage", () => ({
  IndexedDbClassroomStorage: vi.fn(() => mockIndexedDb),
}));

function makeTauriStorage(overrides?: Partial<TauriFsClassroomStorage>): TauriFsClassroomStorage {
  return {
    isInitialized: vi.fn().mockResolvedValue(false),
    ensureEmptyIndex: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn(),
    ...overrides,
  } as unknown as TauriFsClassroomStorage;
}

describe("migrateIndexedDbToJson", () => {
  it("skips when already initialized", async () => {
    const storage = makeTauriStorage({ isInitialized: vi.fn().mockResolvedValue(true) });
    const result = await migrateIndexedDbToJson(storage);
    expect(result.status).toBe("skipped");
  });

  it("migrates empty index when no classrooms", async () => {
    mockIndexedDb.list.mockResolvedValue([]);
    const storage = makeTauriStorage();
    const result = await migrateIndexedDbToJson(storage);
    expect(result.status).toBe("completed");
    expect(result.migratedCount).toBe(0);
    expect(storage.ensureEmptyIndex).toHaveBeenCalled();
  });

  it("migrates classrooms and verifies load", async () => {
    const db = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: {
        id: "t1",
        name: "Teacher",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    });
    mockIndexedDb.list.mockResolvedValue([{ id: db.metadata.id }]);
    mockIndexedDb.load.mockResolvedValue(db);
    const storage = makeTauriStorage({
      load: vi.fn().mockResolvedValue(db),
    });
    const result = await migrateIndexedDbToJson(storage);
    expect(result.status).toBe("completed");
    expect(result.migratedCount).toBe(1);
    expect(storage.save).toHaveBeenCalledWith(db);
  });

  it("returns failed on verification error", async () => {
    const db = createEmptyDatabase({
      className: "3A",
      schoolYear: "2026-2027",
      teacher: {
        id: "t1",
        name: "Teacher",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    });
    mockIndexedDb.list.mockResolvedValue([{ id: db.metadata.id }]);
    mockIndexedDb.load.mockResolvedValue(db);
    const storage = makeTauriStorage({
      load: vi.fn().mockResolvedValue(null),
    });
    const result = await migrateIndexedDbToJson(storage);
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/Verification failed/);
  });
});
