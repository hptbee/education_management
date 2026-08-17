import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleAuthUrl,
  loginWithGoogleDesktop,
  loginWithGoogleWeb,
} from "./google-login";

vi.mock("@/src/database/tauri-fs.service", () => ({
  isTauri: vi.fn(),
}));

import { isTauri } from "@/src/database/tauri-fs.service";

describe("loginWithGoogleWeb", () => {
  it("returns id token when provided", async () => {
    const result = await loginWithGoogleWeb("token-123");
    expect(result.idToken).toBe("token-123");
  });

  it("throws when id token missing", async () => {
    await expect(loginWithGoogleWeb("")).rejects.toThrow(/Không nhận được/);
  });
});

describe("buildGoogleAuthUrl", () => {
  const original = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  afterEach(() => {
    if (original) process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = original;
    else delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  });

  it("builds oauth url with challenge", () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "client-id";
    const url = buildGoogleAuthUrl("challenge", "http://localhost/callback");
    expect(url).toContain("accounts.google.com");
    expect(url).toContain("client-id");
    expect(url).toContain("challenge");
  });

  it("throws without client id", () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    expect(() => buildGoogleAuthUrl("c", "http://localhost")).toThrow();
  });
});

describe("loginWithGoogleDesktop", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("throws on web (non-tauri)", async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "client-id";
    await expect(loginWithGoogleDesktop()).rejects.toThrow(/Tauri/);
  });

  it("returns code from tauri oauth callback", async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "client-id";
    vi.doMock("@tauri-apps/api/core", () => ({
      invoke: vi.fn().mockResolvedValue({
        code: "abc123",
        redirect_uri: "http://localhost/callback",
      }),
    }));
    const result = await loginWithGoogleDesktop();
    expect(result.code).toBe("abc123");
    expect(result.redirectUri).toBe("http://localhost/callback");
  });
});
