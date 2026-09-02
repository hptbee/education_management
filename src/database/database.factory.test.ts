import { describe, expect, it } from "vitest";
import { createEmptyDatabase, DATABASE_VERSION } from "./database.factory";

describe("createEmptyDatabase", () => {
  it("generates stable uuid classroom id", () => {
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
    expect(db.metadata.version).toBe(DATABASE_VERSION);
    expect(db.metadata.id).toMatch(/^classroom-/);
    expect(db.metadata.id).toBe(db.classroomSettings.id);
    expect(db.classroomRoles.length).toBeGreaterThan(0);
    expect(db.badges.length).toBeGreaterThan(0);
    expect(db.recognitionTitles.length).toBeGreaterThan(0);
    expect(db.appSettings.cloudBackupEnabled).toBe(false);
  });
});
