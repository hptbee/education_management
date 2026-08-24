import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classroomAssetService } from "./assets/classroom-asset.service";
import { createEmptyDatabase } from "./database.factory";
import { DatabaseService } from "./database.service";
import { cloudDirtyTracker } from "./backup/cloud-dirty-tracker";
import { MemoryFileStorageAdapter } from "./storage/memory-fs.adapter";
import { TauriFsClassroomStorage } from "./storage/tauri-fs.storage";
import {
  CLASSROOM_A,
  CLASSROOM_B,
  CLASSROOM_C,
} from "./test-fixtures/multi-classroom";
import { normalizeClassroomDatabase } from "@/src/utils/classroomRoles";
import { classroomAssetPathFromDataRoot } from "./assets/classroom-asset-paths";

vi.mock("./assets/classroom-asset.service", () => ({
  classroomAssetService: {
    copyClassroomGiftImages: vi.fn().mockResolvedValue(undefined),
    copyClassroomAssets: vi.fn().mockResolvedValue(undefined),
    deleteClassroomAssets: vi.fn().mockResolvedValue(undefined),
  },
}));

function makeService() {
  const fs = new MemoryFileStorageAdapter();
  const storage = new TauriFsClassroomStorage(fs);
  return { service: new DatabaseService(storage), storage, fs };
}

describe("multi-classroom isolation", () => {
  beforeEach(() => {
    cloudDirtyTracker.clear(CLASSROOM_A.db.metadata.id);
    cloudDirtyTracker.clear(CLASSROOM_B.db.metadata.id);
    cloudDirtyTracker.clear(CLASSROOM_C.db.metadata.id);
    vi.stubGlobal("window", {});
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("save/load/switch keep Alice, Bob, and Charlie isolated", async () => {
    const { service } = makeService();
    await service.saveDatabase(CLASSROOM_A.db);
    await service.saveDatabase(CLASSROOM_B.db);
    await service.saveDatabase(CLASSROOM_C.db);

    const openedB = await service.openDatabase(CLASSROOM_B.db.metadata.id);
    expect(openedB?.students[0]?.name).toBe("Bob");
    expect(openedB?.rewards[0]?.name).toBe("Banana");

    const reopenedA = await service.openDatabase(CLASSROOM_A.db.metadata.id);
    expect(reopenedA?.students[0]?.name).toBe("Alice");
    expect(reopenedA?.rewards[0]?.name).toBe("Apple");
    expect(reopenedA?.pointActions[0]?.name).toBe("Point Action A");
  });

  it("duplicate copies assets to a new classroom id without mutating source", async () => {
    const { service } = makeService();
    await service.saveDatabase(CLASSROOM_A.db);

    const clone = await service.duplicateDatabase(
      CLASSROOM_A.db.metadata.id,
      "2/8",
      "2026-2027",
      "full-copy",
      { activate: false },
    );

    expect(clone.metadata.id).not.toBe(CLASSROOM_A.db.metadata.id);
    expect(vi.mocked(classroomAssetService.copyClassroomAssets)).toHaveBeenCalledWith(
      CLASSROOM_A.db.metadata.id,
      clone.metadata.id,
      expect.anything(),
    );

    const source = await service.openDatabase(CLASSROOM_A.db.metadata.id);
    expect(source?.students[0]?.name).toBe("Alice");
  });

  it("archive and delete affect only the targeted classroom", async () => {
    const { service } = makeService();
    await service.saveDatabase(CLASSROOM_A.db);
    await service.saveDatabase(CLASSROOM_B.db);

    const archived = await service.setClassroomArchived(CLASSROOM_A.db.metadata.id, true);
    expect(archived.metadata.archived).toBe(true);

    const list = await service.listDatabases();
    expect(list.find((item) => item.id === CLASSROOM_B.db.metadata.id)?.archived).toBe(false);

    await service.openDatabase(CLASSROOM_B.db.metadata.id);
    await service.deleteDatabase(CLASSROOM_A.db.metadata.id);
    expect(await service.openDatabase(CLASSROOM_A.db.metadata.id)).toBeNull();
    expect(await service.openDatabase(CLASSROOM_B.db.metadata.id)).not.toBeNull();
  });

  it("dirty tracker marks only the changed classroom", () => {
    cloudDirtyTracker.mark(CLASSROOM_A.db.metadata.id, { students: true });
    expect(cloudDirtyTracker.hasDirty(CLASSROOM_A.db.metadata.id)).toBe(true);
    expect(cloudDirtyTracker.hasDirty(CLASSROOM_B.db.metadata.id)).toBe(false);
    expect(cloudDirtyTracker.hasDirty(CLASSROOM_C.db.metadata.id)).toBe(false);
  });

  it("asset paths stay scoped to classroom ids", () => {
    const pathA = classroomAssetPathFromDataRoot(
      CLASSROOM_A.db.metadata.id,
      "assets/students/student-a/avatar.webp",
    );
    const pathB = classroomAssetPathFromDataRoot(
      CLASSROOM_B.db.metadata.id,
      "assets/students/student-b/avatar.webp",
    );
    expect(pathA).toContain(CLASSROOM_A.db.metadata.id);
    expect(pathB).toContain(CLASSROOM_B.db.metadata.id);
    expect(pathA).not.toContain(CLASSROOM_B.db.metadata.id);
  });
});

describe("migration and data safety", () => {
  it("normalizes legacy JSON missing pointsWheelConfig without wiping students", () => {
    const legacy = createEmptyDatabase({
      className: "2/7",
      schoolYear: "2026-2027",
      teacher: {
        id: "teacher-1",
        name: "Teacher",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    legacy.students = CLASSROOM_A.db.students;
    const raw = { ...legacy } as Record<string, unknown>;
    delete raw.pointsWheelConfig;

    const first = normalizeClassroomDatabase(raw as unknown as typeof legacy);
    const second = normalizeClassroomDatabase(first);
    expect(first.pointsWheelConfig.length).toBeGreaterThan(0);
    expect(second.students).toEqual(first.students);
    expect(second.pointHistory).toEqual(first.pointHistory);
    expect(second.pointsWheelConfig).toEqual(first.pointsWheelConfig);
  });

  it("rejects malformed registry merge that would drop all visible classrooms", async () => {
    const { mergeClassroomRegistries } = await import("./backup/cloud-serializer");
    const visible = {
      key: "2-7_2026-2027",
      name: "2/7",
      schoolYear: "2026-2027",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      archived: false,
    };
    expect(() =>
      mergeClassroomRegistries(
        { version: 1, updatedAt: "2026-01-01", classrooms: [visible] },
        {
          version: 1,
          updatedAt: "2026-01-01",
          classrooms: [
            {
              ...visible,
              deletedAt: "2026-01-10T00:00:00.000Z",
              updatedAt: "2026-01-05T00:00:00.000Z",
            },
          ],
        },
      ),
    ).toThrow(/drop all classrooms/i);
  });
});
