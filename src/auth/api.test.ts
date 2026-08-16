import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchMe,
  getGoogleClientId,
  getWorkerBaseUrl,
  listCloudClassrooms,
  postAuthGoogle,
  refreshEntitlement,
  restoreCloudClassroom,
} from "./api";

describe("api env helpers", () => {
  const originalUrl = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
  const originalClient = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  afterEach(() => {
    if (originalUrl) process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = originalUrl;
    else delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
    if (originalClient) process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalClient;
    else delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  });

  it("reads worker base url", () => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = "https://worker.example.com";
    expect(getWorkerBaseUrl()).toBe("https://worker.example.com");
  });

  it("reads google client id", () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "client-id";
    expect(getGoogleClientId()).toBe("client-id");
  });
});

describe("api fetch wrappers", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = "https://worker.example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          entitlement: "token",
          user: { id: "usr_1" },
          license: { plan: "trial" },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
  });

  it("posts google auth", async () => {
    const result = await postAuthGoogle({ idToken: "x" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entitlement).toBe("token");
  });

  it("refreshes entitlement", async () => {
    const result = await refreshEntitlement("token");
    expect(result.ok).toBe(true);
  });

  it("fetches me", async () => {
    const result = await fetchMe("token");
    expect(result.ok).toBe(true);
  });

  it("lists cloud classrooms", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ classrooms: [{ classroomId: "c1", key: "k", updatedAt: null, size: 1 }] }),
    } as Response);
    const list = await listCloudClassrooms("token");
    expect(list.length).toBe(1);
  });

  it("restores cloud classroom", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ payload: {} }),
    } as Response);
    const data = await restoreCloudClassroom("token", "c1");
    expect(data).toEqual({ payload: {} });
  });

  it("returns validation error without worker url", async () => {
    delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
    const result = await postAuthGoogle({ idToken: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR");
  });
});
