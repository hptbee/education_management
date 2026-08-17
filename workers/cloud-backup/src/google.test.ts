import { beforeEach, describe, expect, it, vi } from "vitest";

const { jwtVerify } = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
}));

vi.mock("jose", () => ({
  jwtVerify,
  createRemoteJWKSet: vi.fn(),
}));

import { defaultGoogleVerifier } from "./google";

const webConfig = { webClientId: "web-client-id" };
const dualConfig = {
  webClientId: "web-client-id",
  desktopClientId: "desktop-client-id",
};

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

    const profile = await defaultGoogleVerifier(webConfig, { idToken: "jwt" });
    expect(profile.sub).toBe("google-sub");
    expect(profile.email).toBe("a@example.com");
  });

  it("accepts id tokens from desktop client audience when configured", async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: "desktop-sub" } });

    await defaultGoogleVerifier(dualConfig, { idToken: "jwt" });

    expect(jwtVerify.mock.calls[0][2]?.audience).toEqual(["web-client-id", "desktop-client-id"]);
  });

  it("exchanges code with desktop client id", async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: "from-code" } });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: "jwt-from-exchange" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const profile = await defaultGoogleVerifier(dualConfig, {
      code: "code",
      codeVerifier: "verifier",
      redirectUri: "http://localhost/callback",
    });
    expect(profile.sub).toBe("from-code");

    const body = String(fetchMock.mock.calls[0][1]?.body);
    expect(body).toContain("client_id=desktop-client-id");

    vi.unstubAllGlobals();
  });

  it("throws when proof missing", async () => {
    await expect(defaultGoogleVerifier(webConfig, {})).rejects.toThrow(/Missing Google/);
  });
});
