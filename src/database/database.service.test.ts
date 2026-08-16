import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDatabase } from "./database.factory";
import { DatabaseService } from "./database.service";
import { MemoryFileStorageAdapter } from "./storage/memory-fs.adapter";
import { TauriFsClassroomStorage } from "./storage/tauri-fs.storage";

vi.mock("./assets/classroom-asset.service", () => ({
  classroomAssetService: {
    copyClassroomGiftImages: vi.fn().mockResolvedValue(undefined),
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
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates and opens a classroom", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
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
  });

  it("renames classroom database", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    const renamed = await service.renameClassroomDatabase(db.metadata.id, "2/8", "2026-2027");
    expect(renamed.classroomSettings.className).toBe("2/8");
    expect(renamed.metadata.id).toContain("2-8");
  });

  it("deletes database", async () => {
    const { service } = makeService();
    const db = await service.createDatabase(makeSettings());
    await service.deleteDatabase(db.metadata.id);
    const opened = await service.openDatabase(db.metadata.id);
    expect(opened).toBeNull();
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
