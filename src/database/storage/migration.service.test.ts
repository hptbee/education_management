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
    isMigrationComplete: vi.fn().mockResolvedValue(false),
    markMigrationComplete: vi.fn().mockResolvedValue(undefined),
    ensureEmptyIndex: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn(),
    ...overrides,
  } as unknown as TauriFsClassroomStorage;
}

describe("migrateIndexedDbToJson", () => {
  it("skips when migration marker exists", async () => {
    const storage = makeTauriStorage({ isMigrationComplete: vi.fn().mockResolvedValue(true) });
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
    expect(storage.markMigrationComplete).toHaveBeenCalled();
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
    const stored = new Map<string, typeof db>();
    const storage = makeTauriStorage({
      save: vi.fn().mockImplementation(async (next) => {
        stored.set(next.metadata.id, next);
      }),
      load: vi.fn().mockImplementation(async (id: string) => stored.get(id) ?? null),
    });
    const result = await migrateIndexedDbToJson(storage);
    expect(result.status).toBe("completed");
    expect(result.migratedCount).toBe(1);
    expect(storage.save).toHaveBeenCalledWith(db);
    expect(storage.markMigrationComplete).toHaveBeenCalled();
  });

  it("resumes remaining classrooms when index exists but marker does not", async () => {
    const db1 = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: {
        id: "t1",
        name: "Teacher",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    });
    const db2 = createEmptyDatabase({
      className: "3A",
      schoolYear: "2026-2027",
      teacher: {
        id: "t1",
        name: "Teacher",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    });
    mockIndexedDb.list.mockResolvedValue([
      { id: db1.metadata.id },
      { id: db2.metadata.id },
    ]);
    mockIndexedDb.load.mockImplementation(async (id: string) => {
      if (id === db1.metadata.id) return db1;
      if (id === db2.metadata.id) return db2;
      return null;
    });
    const stored = new Map<string, typeof db1>([[db1.metadata.id, db1]]);
    const storage = makeTauriStorage({
      save: vi.fn().mockImplementation(async (next) => {
        stored.set(next.metadata.id, next);
      }),
      load: vi.fn().mockImplementation(async (id: string) => stored.get(id) ?? null),
    });
    const result = await migrateIndexedDbToJson(storage);
    expect(result.status).toBe("completed");
    expect(result.migratedCount).toBe(1);
    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(storage.save).toHaveBeenCalledWith(db2);
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
