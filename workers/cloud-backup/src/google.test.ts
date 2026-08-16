import { beforeEach, describe, expect, it, vi } from "vitest";

const { jwtVerify } = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
}));

vi.mock("jose", () => ({
  jwtVerify,
  createRemoteJWKSet: vi.fn(),
}));

import { defaultGoogleVerifier } from "./google";

describe("defaultGoogleVerifier", () => {
  beforeEach(() => {
    jwtVerify.mockReset();
  });

  it("verifies id token payload", async () => {
    jwtVerify.mockResolvedValue({
      payload: {
        sub: "google-sub",
        email: "a@example.com",
        name: "A",
        picture: "http://img",
      },
    });

    const profile = await defaultGoogleVerifier("client-id", { idToken: "jwt" });
    expect(profile.sub).toBe("google-sub");
    expect(profile.email).toBe("a@example.com");
  });

  it("exchanges code for id token", async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: "from-code" } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id_token: "jwt-from-exchange" }),
      }),
    );

    const profile = await defaultGoogleVerifier("client-id", {
      code: "code",
      codeVerifier: "verifier",
      redirectUri: "http://localhost/callback",
    });
    expect(profile.sub).toBe("from-code");
    vi.unstubAllGlobals();
  });

  it("throws when proof missing", async () => {
    await expect(defaultGoogleVerifier("client-id", {})).rejects.toThrow(/Missing Google/);
  });
});
