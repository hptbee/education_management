import { describe, expect, it, vi } from "vitest";
import { createEmptyDatabase } from "../database.factory";
import { makeClassroomFileName } from "../database.utils";
import { MemoryFileStorageAdapter } from "./memory-fs.adapter";
import { TauriFsClassroomStorage } from "./tauri-fs.storage";

function makeDb(className: string, schoolYear: string) {
  return createEmptyDatabase({
    className,
    schoolYear,
    teacher: {
      id: "teacher-1",
      name: "Cô Thu",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}

describe("TauriFsClassroomStorage", () => {
  it("creates, saves, loads, and persists a classroom", async () => {
    const fs = new MemoryFileStorageAdapter();
    const storage = new TauriFsClassroomStorage(fs);
    const db = makeDb("2/7", "2026-2027");

    await storage.save(db);
    const loaded = await storage.load(db.metadata.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.metadata.id).toBe(db.metadata.id);
    expect(loaded?.classroomSettings.className).toBe("2/7");
  });

  it("persists a student across a new storage instance", async () => {
    const fs = new MemoryFileStorageAdapter();
    const storage1 = new TauriFsClassroomStorage(fs);
    const db = makeDb("2/7", "2026-2027");
    db.students.push({
      id: "student-1",
      name: "Minh",
      classroomRoleIds: [],
      badgeIds: [],
      points: 0,
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await storage1.save(db);

    const storage2 = new TauriFsClassroomStorage(fs);
    const reloaded = await storage2.load(db.metadata.id);
    expect(reloaded?.students).toHaveLength(1);
    expect(reloaded?.students[0].name).toBe("Minh");
  });

  it("stores separate JSON files per classroom", async () => {
    const fs = new MemoryFileStorageAdapter();
    const storage = new TauriFsClassroomStorage(fs);
    const db1 = makeDb("2/7", "2026-2027");
    const db2 = makeDb("2/7", "2025-2026");

    await storage.save(db1);
    await storage.save(db2);

    const paths = fs.listPaths().filter((p) => p.includes("/classrooms/"));
    expect(paths).toHaveLength(2);
    expect(paths.some((p) => p.endsWith(makeClassroomFileName(db1.metadata.id)))).toBe(true);
    expect(paths.some((p) => p.endsWith(makeClassroomFileName(db2.metadata.id)))).toBe(true);

    const loaded1 = await storage.load(db1.metadata.id);
    const loaded2 = await storage.load(db2.metadata.id);
    expect(loaded1?.classroomSettings.schoolYear).toBe("2026-2027");
    expect(loaded2?.classroomSettings.schoolYear).toBe("2025-2026");
  });

  it("persists point updates", async () => {
    const fs = new MemoryFileStorageAdapter();
    const storage = new TauriFsClassroomStorage(fs);
    const db = makeDb("3A", "2026-2027");
    db.students.push({
      id: "student-1",
      name: "Lan",
      classroomRoleIds: [],
      badgeIds: [],
      points: 5,
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await storage.save(db);

    const loaded = await storage.load(db.metadata.id);
    loaded!.students[0].points = 10;
    loaded!.metadata.updatedAt = new Date().toISOString();
    await storage.save(loaded!);

    const final = await storage.load(db.metadata.id);
    expect(final?.students[0].points).toBe(10);
  });

  it("coalesces rapid writes and keeps the latest state", async () => {
    const fs = new MemoryFileStorageAdapter();
    const storage = new TauriFsClassroomStorage(fs);
    const db = makeDb("2/7", "2026-2027");
    db.students.push({
      id: "student-1",
      name: "A",
      classroomRoleIds: [],
      badgeIds: [],
      points: 0,
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await storage.save(db);

    const writes: Promise<void>[] = [];
    for (let i = 1; i <= 5; i++) {
      const copy = structuredClone(await storage.load(db.metadata.id)!);
      copy!.students[0].points = i;
      writes.push(storage.save(copy!));
    }
    await Promise.all(writes);

    const final = await storage.load(db.metadata.id);
    expect(final?.students[0].points).toBe(5);
  });

  it("surfaces failed writes without losing prior persisted state", async () => {
    const fs = new MemoryFileStorageAdapter();
    const storage = new TauriFsClassroomStorage(fs);
    const db = makeDb("2/7", "2026-2027");
    await storage.save(db);

    const failOnce = vi
      .spyOn(fs, "writeTextFile")
      .mockRejectedValueOnce(new Error("disk full"))
      .mockImplementation(MemoryFileStorageAdapter.prototype.writeTextFile.bind(fs));

    const broken = structuredClone(await storage.load(db.metadata.id)!);
    broken!.students.push({
      id: "student-2",
      name: "Broken",
      classroomRoleIds: [],
      badgeIds: [],
      points: 0,
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await expect(storage.save(broken!)).rejects.toThrow("disk full");

    const stillGood = await storage.load(db.metadata.id);
    expect(stillGood?.students).toHaveLength(0);

    failOnce.mockRestore();
    await storage.save(broken!);
    const recovered = await storage.load(db.metadata.id);
    expect(recovered?.students).toHaveLength(1);
  });

  it("tracks activeClassroomId in index.json", async () => {
    const fs = new MemoryFileStorageAdapter();
    const storage = new TauriFsClassroomStorage(fs);
    const db = makeDb("2/7", "2026-2027");
    await storage.save(db);
    await storage.setActiveClassroomId!(db.metadata.id);

    expect(await storage.getActiveClassroomId!()).toBe(db.metadata.id);
  });

  it("still lists classrooms after a failed index write", async () => {
    const fs = new MemoryFileStorageAdapter();
    const storage = new TauriFsClassroomStorage(fs);
    const db = makeDb("2/7", "2026-2027");
    await storage.save(db);

    const root = await fs.getDataDirectory();
    const indexPath = fs.joinPath(root, "index.json");
    const originalWrite = fs.writeTextFile.bind(fs);
    vi.spyOn(fs, "writeTextFile").mockImplementation(async (path, contents) => {
      if (path === indexPath) {
        throw new Error("index write failed");
      }
      return originalWrite(path, contents);
    });

    const updated = structuredClone(await storage.load(db.metadata.id))!;
    updated.students.push({
      id: "student-2",
      name: "Lan",
      classroomRoleIds: [],
      badgeIds: [],
      points: 0,
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await expect(storage.save(updated)).rejects.toThrow("index update failed");

    const storage2 = new TauriFsClassroomStorage(fs);
    const list = await storage2.list();
    expect(list.some((entry) => entry.id === db.metadata.id)).toBe(true);
  });

  it("rebuilds index from classroom JSON when index is missing", async () => {
    const fs = new MemoryFileStorageAdapter();
    const db = makeDb("2/7", "2026-2027");
    const dataDir = await fs.getDataDirectory();
    const fileName = makeClassroomFileName(db.metadata.id);
    await fs.writeTextFile(fs.joinPath(dataDir, "classrooms", fileName), JSON.stringify(db, null, 2));

    const storage = new TauriFsClassroomStorage(fs);
    const list = await storage.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(db.metadata.id);
  });

  it("recovers corrupt index on save and setActiveClassroomId", async () => {
    const fs = new MemoryFileStorageAdapter();
    const storage = new TauriFsClassroomStorage(fs);
    const db = makeDb("2/7", "2026-2027");
    await storage.save(db);

    const root = await fs.getDataDirectory();
    await fs.writeTextFile(fs.joinPath(root, "index.json"), "{not valid json");

    const updated = structuredClone(await storage.load(db.metadata.id))!;
    updated.students.push({
      id: "student-2",
      name: "Lan",
      classroomRoleIds: [],
      badgeIds: [],
      points: 0,
      totalRewards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await storage.save(updated);

    await storage.setActiveClassroomId!(db.metadata.id);
    expect(await storage.getActiveClassroomId!()).toBe(db.metadata.id);

    const list = await storage.list();
    expect(list.some((entry) => entry.id === db.metadata.id)).toBe(true);
    const loaded = await storage.load(db.metadata.id);
    expect(loaded?.students).toHaveLength(1);
  });
});
