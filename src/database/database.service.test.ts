import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDatabase } from "./database.factory";
import { DatabaseService } from "./database.service";
import { MemoryFileStorageAdapter } from "./storage/memory-fs.adapter";
import { TauriFsClassroomStorage } from "./storage/tauri-fs.storage";
import { normalizeClassroomDatabase } from "@/src/utils/classroomRoles";
import { CLASSROOM_A, CLASSROOM_B } from "./test-fixtures/multi-classroom";

vi.mock("./assets/classroom-asset.service", () => ({
  classroomAssetService: {
    copyClassroomGiftImages: vi.fn().mockResolvedValue(undefined),
    copyClassroomAssets: vi.fn().mockResolvedValue(undefined),
    deleteClassroomAssets: vi.fn().mockResolvedValue(undefined),
  },
}));

function makeSettings(className = "2/7", schoolYear = "2026-2027") {
  return {
    className,
    schoolYear,
    teacher: {
      id: "teacher-1",
      name: "Cô Thu",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

function makeService() {
  const fs = new MemoryFileStorageAdapter();
  const storage = new TauriFsClassroomStorage(fs);
  return { service: new DatabaseService(storage), storage, fs };
}

describe("DatabaseService", () => {
  beforeEach(() => {
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
  });

  it("creates and opens a classroom", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    expect(db.metadata.id).toMatch(/^classroom-/);
    const opened = await service.openDatabase(db.metadata.id);
    expect(opened?.metadata.id).toBe(db.metadata.id);
  });

  it("rejects duplicate create", async () => {
    const { service } = makeService();
    await service.createDatabase(makeSettings());
    await expect(service.createDatabase(makeSettings())).rejects.toThrow(/đã tồn tại/);
  });

  it("saves database updates", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    db.students.push({
      id: "s1",
      name: "An",
      classroomRoleIds: [],
      badgeIds: [],
      points: 1,
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const saved = await service.saveDatabase(db);
    expect(saved.students.length).toBe(1);
  });

  it("lists databases", async () => {
    const { service } = makeService();
    await service.createDatabase(makeSettings());
    const list = await service.listDatabases();
    expect(list.length).toBe(1);
  });

  it("imports valid JSON database", async () => {
    const { service } = makeService();
    const db = createEmptyDatabase(makeSettings("3A", "2025-2026"));
    const imported = await service.importDatabaseFromJson(db);
    expect(imported.metadata.id).toBe(db.metadata.id);
  });

  it("normalizes legacy JSON without duckRaceStudentBag to an empty array", async () => {
    const db = createEmptyDatabase(makeSettings("2/7", "2026-2027"));
    const legacy = { ...db } as Record<string, unknown>;
    delete legacy.duckRaceStudentBag;

    const normalized = normalizeClassroomDatabase(legacy as unknown as typeof db);
    expect(normalized.duckRaceStudentBag).toEqual([]);
  });

  it("imports legacy JSON without duckRaceHistory", async () => {
    const { service } = makeService();
    const db = createEmptyDatabase(makeSettings("2/7", "2026-2027"));
    const legacy = { ...db } as Record<string, unknown>;
    delete legacy.duckRaceHistory;

    const imported = await service.importDatabaseFromJson(legacy);
    expect(imported.duckRaceHistory).toEqual([]);
  });

  it("saveCloudRestoredDatabase overwrites an existing classroom", async () => {
    const { service } = makeService();
    const original = await service.createDatabase(makeSettings("2/7", "2026-2027"));
    original.students.push({
      id: "local-only",
      name: "Local",
      points: 0,
      classroomRoleIds: [],
      badgeIds: [],
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await service.saveDatabase(original);

    const cloud = createEmptyDatabase(makeSettings("2/7", "2026-2027"));
    cloud.metadata.id = original.metadata.id;
    cloud.students.push({
      id: "cloud-only",
      name: "Cloud",
      points: 5,
      classroomRoleIds: [],
      badgeIds: [],
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const restored = await service.saveCloudRestoredDatabase(cloud);
    expect(restored.students.some((s) => s.id === "cloud-only")).toBe(true);
    expect(restored.students.some((s) => s.id === "local-only")).toBe(false);
  });

  it("rejects cloud restore when payload id does not match expected classroom key", async () => {
    const { service } = makeService();
    await expect(
      service.saveCloudRestoredDatabase(CLASSROOM_B.db, {
        expectedClassroomId: CLASSROOM_A.db.metadata.id,
      }),
    ).rejects.toThrow(/không khớp/i);
  });

  it("rejects unsafe metadata id on import", async () => {
    const { service } = makeService();
    const db = createEmptyDatabase(makeSettings());
    db.metadata.id = "../evil";
    await expect(service.importDatabaseFromJson(db)).rejects.toThrow(/metadata\.id/);
  });

  it("rejects missing array fields on import", async () => {
    const { service } = makeService();
    const db = createEmptyDatabase(makeSettings()) as unknown as Record<string, unknown>;
    delete db.students;
    await expect(service.importDatabaseFromJson(db)).rejects.toThrow(/students/);
  });

  it("duplicates settings-only database", async () => {
    const { service } = makeService();
    const source = await service.createDatabase(makeSettings());
    const copy = await service.duplicateDatabase(source.metadata.id, "2/8", "2026-2027", "settings-only");
    expect(copy.metadata.id).not.toBe(source.metadata.id);
    expect(copy.students.length).toBe(0);
    expect(copy.pointActions.length).toBeGreaterThan(0);
  });

  it("duplicates full copy", async () => {
    const { service } = makeService();
    const source = await service.createDatabase(makeSettings());
    source.students.push({
      id: "s1",
      name: "An",
      classroomRoleIds: [],
      badgeIds: [],
      points: 0,
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await service.saveDatabase(source);
    const copy = await service.duplicateDatabase(source.metadata.id, "2/8", "2025-2026", "full-copy");
    expect(copy.students.length).toBe(1);
    expect(copy.metadata.id).toMatch(/^classroom-/);
    expect(copy.metadata.id).not.toBe(source.metadata.id);
  });

  it("renames classroom database in place", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    const originalId = db.metadata.id;
    const renamed = await service.renameClassroomDatabase(db.metadata.id, "2/8", "2026-2027");
    expect(renamed.classroomSettings.className).toBe("2/8");
    expect(renamed.metadata.id).toBe(originalId);
  });

  it("deletes database", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    await service.setClassroomArchived(db.metadata.id, true);
    await service.closeDatabase();
    await service.deleteDatabase(db.metadata.id);
    const opened = await service.openDatabase(db.metadata.id);
    expect(opened).toBeNull();
  });

  it("blocks delete while active and not archived", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    await expect(service.deleteDatabase(db.metadata.id)).rejects.toThrow(/lưu trữ/);
  });

  it("blocks delete while not archived", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    await service.closeDatabase();
    await expect(service.deleteDatabase(db.metadata.id)).rejects.toThrow(/lưu trữ/);
  });

  it("updateClassroomInfo preserves metadata id", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    const updated = await service.updateClassroomInfo(db.metadata.id, {
      className: "3A",
      schoolYear: "2027-2028",
    });
    expect(updated.metadata.id).toBe(db.metadata.id);
    expect(updated.classroomSettings.className).toBe("3A");
  });

  it("archives and restores classroom", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    const archived = await service.setClassroomArchived(db.metadata.id, true);
    expect(archived.metadata.archived).toBe(true);
    const list = await service.listDatabases();
    expect(list.find((item) => item.id === db.metadata.id)?.archived).toBe(true);

    const restored = await service.setClassroomArchived(db.metadata.id, false);
    expect(restored.metadata.archived).toBe(false);
  });

  it("duplicate from non-active source without activating", async () => {
    const { service } = makeService();
    const first = await service.createDatabase(makeSettings("2/7", "2026-2027"));
    const second = await service.createDatabase(makeSettings("2/8", "2026-2027"), { activate: false });
    expect(await service.getPreferredClassroomId()).toBe(first.metadata.id);

    const copy = await service.duplicateDatabase(
      second.metadata.id,
      "2/9",
      "2026-2027",
      "settings-only",
      { activate: false },
    );
    expect(copy.metadata.id).not.toBe(second.metadata.id);
    expect(await service.getPreferredClassroomId()).toBe(first.metadata.id);
  });

  it("createDatabase without activate keeps current active id", async () => {
    const { service } = makeService();
    const first = await service.createDatabase(makeSettings("2/7", "2026-2027"));
    await service.createDatabase(makeSettings("2/8", "2025-2026"), { activate: false });
    expect(await service.getPreferredClassroomId()).toBe(first.metadata.id);
  });

  it("switch isolation keeps separate student lists", async () => {
    const { service } = makeService();
    const classA = await service.createDatabase(makeSettings("2/7", "2026-2027"));
    const classB = await service.createDatabase(makeSettings("2/8", "2026-2027"), { activate: false });

    classA.students.push({
      id: "s-a",
      name: "An",
      classroomRoleIds: [],
      badgeIds: [],
      points: 1,
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await service.saveDatabase(classA);

    const openedB = await service.openDatabase(classB.metadata.id);
    expect(openedB?.students.length).toBe(0);

    const reopenedA = await service.openDatabase(classA.metadata.id);
    expect(reopenedA?.students.length).toBe(1);
  });

  it("loadClassroomSnapshot does not change the preferred classroom", async () => {
    const { service } = makeService();
    const classA = await service.createDatabase(makeSettings("2/7", "2026-2027"));
    const classB = await service.createDatabase(makeSettings("3/1", "2026-2027"), { activate: false });

    const snapshot = await service.loadClassroomSnapshot(classB.metadata.id);
    expect(snapshot?.metadata.id).toBe(classB.metadata.id);
    expect(await service.getPreferredClassroomId()).toBe(classA.metadata.id);
  });

  it("closes database clears active id", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    await service.openDatabase(db.metadata.id);
    await service.closeDatabase();
    expect(await service.getPreferredClassroomId()).toBeNull();
  });

  it("imports from File via FileReader", async () => {
    const { service } = makeService();
    const db = createEmptyDatabase(makeSettings("4A", "2024-2025"));
    const file = new File([JSON.stringify(db)], "class.json", { type: "application/json" });

    class MockFileReader {
      onload: ((event: { target: { result: string } }) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText() {
        const result = JSON.stringify(db);
        this.onload?.({ target: { result } });
      }
    }
    vi.stubGlobal("FileReader", MockFileReader);

    const imported = await service.importDatabase(file);
    expect(imported.metadata.id).toBe(db.metadata.id);
    vi.unstubAllGlobals();
  });

  it("exports database as downloadable json", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    const click = vi.fn();
    vi.stubGlobal("document", {
      createElement: () => ({
        href: "",
        download: "",
        click,
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    });
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:url",
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal(
      "Blob",
      class {
        constructor(public parts: unknown[], public options: unknown) {}
      },
    );

    await service.exportDatabase(db);
    expect(click).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("migrates legacy teacher fields on open", async () => {
    const { service, storage } = makeService();
    const db = createEmptyDatabase(makeSettings());
    const legacy = {
      ...db,
      classroomSettings: {
        ...db.classroomSettings,
        teacherName: "Legacy Teacher",
        teacherAvatar: "data:image/png;base64,x",
      },
    };
    delete (legacy.classroomSettings as { teacher?: unknown }).teacher;
    await storage.save(legacy);
    const opened = await service.openDatabase(db.metadata.id);
    expect(opened?.classroomSettings.teacher?.name).toBe("Legacy Teacher");
  });
});
