import { describe, expect, it } from "vitest";
import worker, { buildBackupStorageKey, sanitizeBackupIdentifier } from "./index";

describe("worker backup key sanitization", () => {
  it("builds safe storage keys", () => {
    expect(buildBackupStorageKey("device-abc", "2-7_2026-2027")).toBe(
      "backups/device-abc/2-7_2026-2027/latest.json",
    );
  });

  it("rejects traversal and unsafe characters", () => {
    expect(sanitizeBackupIdentifier("..")).toBeNull();
    expect(sanitizeBackupIdentifier("a/b")).toBeNull();
    expect(() => buildBackupStorageKey("bad/id", "ok")).toThrow();
  });
});

describe("worker auth", () => {
  const env = {
    BACKUP_BUCKET: {
      put: async () => undefined,
      get: async () => null,
    },
    BACKUP_API_TOKEN: "test-token",
  } as never;

  it("returns 401 for GET without bearer token", async () => {
    const request = new Request("https://example.com/backup?deviceId=d1&classroomId=c1", {
      method: "GET",
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("returns 401 for PUT without bearer token", async () => {
    const request = new Request("https://example.com/backup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "d1",
        classroomId: "c1",
        fileName: "class.json",
        schemaVersion: 1,
        timestamp: "2026-01-01T00:00:00.000Z",
        payload: {},
      }),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });
});
