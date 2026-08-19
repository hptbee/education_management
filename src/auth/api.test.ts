import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchMe,
  getGoogleClientId,
  getGoogleDesktopClientId,
  getGoogleWebClientId,
  getWorkerBaseUrl,
  listCloudClassrooms,
  postAuthGoogle,
  refreshEntitlement,
  restoreCloudClassroom,
} from "./api";

vi.mock("@/src/database/tauri-fs.service", () => ({
  isTauri: vi.fn(() => false),
}));

import { isTauri } from "@/src/database/tauri-fs.service";

describe("api env helpers", () => {
  const originalUrl = process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
  const originalClient = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const originalDesktop = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP;

  afterEach(() => {
    if (originalUrl) process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = originalUrl;
    else delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
    if (originalClient) process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalClient;
    else delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (originalDesktop) process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP = originalDesktop;
    else delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP;
    vi.mocked(isTauri).mockReturnValue(false);
  });

  it("reads worker base url", () => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL = "https://worker.example.com";
    expect(getWorkerBaseUrl()).toBe("https://worker.example.com");
  });

  it("reads web google client id", () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "web-client";
    expect(getGoogleWebClientId()).toBe("web-client");
    expect(getGoogleClientId()).toBe("web-client");
  });

  it("reads desktop google client id for tauri", () => {
    vi.stubGlobal("window", {});
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "web-client";
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP = "desktop-client";
    vi.mocked(isTauri).mockReturnValue(true);
    expect(getGoogleDesktopClientId()).toBe("desktop-client");
    expect(getGoogleClientId()).toBe("desktop-client");
    vi.unstubAllGlobals();
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

  it("throws when cloud classroom list fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ ok: false, error: "Forbidden" }),
    } as Response);
    await expect(listCloudClassrooms("token")).rejects.toThrow("Forbidden");
  });

  it("restores cloud classroom", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ payload: {} }),
    } as Response);
    const data = await restoreCloudClassroom("token", "c1");
    expect(data).toEqual({ payload: {} });
  });

  it("returns null when cloud restore is 404", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "not found",
    } as Response);
    await expect(restoreCloudClassroom("token", "c1")).resolves.toBeNull();
  });

  it("throws when cloud restore is not 404", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    } as Response);
    await expect(restoreCloudClassroom("token", "c1")).rejects.toThrow(
      "Không thể tải bản sao lưu trên đám mây (401).",
    );
  });

  it("returns validation error without worker url", async () => {
    delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_URL;
    const result = await postAuthGoogle({ idToken: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR");
  });
});
