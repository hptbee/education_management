import { describe, expect, it } from "vitest";
import {
  MAX_BODY_BYTES,
  MAX_JSON_BODY_BYTES,
  readBodyWithLimit,
  readJsonWithLimit,
  resolveCorsHeaders,
} from "./http";
import type { Env } from "./types";

describe("readBodyWithLimit", () => {
  it("rejects Content-Length above MAX_BODY_BYTES", async () => {
    const request = new Request("https://example.com/backup", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "content-length": String(MAX_BODY_BYTES + 1),
      },
      body: "{}",
    });

    await expect(readBodyWithLimit(request)).rejects.toThrow("Payload too large");
  });

  it("rejects body text above MAX_BODY_BYTES", async () => {
    const oversized = "x".repeat(MAX_BODY_BYTES + 1);
    const request = new Request("https://example.com/backup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: oversized,
    });

    await expect(readBodyWithLimit(request)).rejects.toThrow("Payload too large");
  });

  it("returns body text when within limit", async () => {
    const request = new Request("https://example.com/backup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: '{"ok":true}',
    });

    await expect(readBodyWithLimit(request)).resolves.toBe('{"ok":true}');
  });
});

describe("readJsonWithLimit", () => {
  it("rejects Content-Length above MAX_JSON_BODY_BYTES", async () => {
    const request = new Request("https://example.com/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "content-length": String(MAX_JSON_BODY_BYTES + 1),
      },
      body: "{}",
    });

    await expect(readJsonWithLimit(request)).rejects.toThrow("Payload too large");
  });

  it("parses JSON when within limit", async () => {
    const request = new Request("https://example.com/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"idToken":"x"}',
    });

    await expect(readJsonWithLimit<{ idToken: string }>(request)).resolves.toEqual({ idToken: "x" });
  });
});

describe("resolveCorsHeaders", () => {
  const baseEnv = {} as Env;

  it("omits Allow-Origin when allowlist is unset", () => {
    const request = new Request("https://example.com/me", {
      headers: { Origin: "https://app.example.com" },
    });

    const headers = resolveCorsHeaders(request, baseEnv);
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(headers.Vary).toBe("Origin");
  });

  it("omits Allow-Origin when request has no Origin", () => {
    const request = new Request("https://example.com/me");
    const env = { CORS_ALLOWED_ORIGINS: "https://app.example.com" } as Env;

    expect(resolveCorsHeaders(request, env)["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("echoes matching Origin when allowlist is set", () => {
    const request = new Request("https://example.com/me", {
      headers: { Origin: "https://app.example.com" },
    });
    const env = { CORS_ALLOWED_ORIGINS: "https://app.example.com" } as Env;

    const headers = resolveCorsHeaders(request, env);
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://app.example.com");
    expect(headers.Vary).toBe("Origin");
  });

  it("omits Allow-Origin for a disallowed Origin", () => {
    const request = new Request("https://example.com/me", {
      headers: { Origin: "https://evil.example" },
    });
    const env = { CORS_ALLOWED_ORIGINS: "https://app.example.com" } as Env;

    expect(resolveCorsHeaders(request, env)["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("allows wildcard suffix origins", () => {
    const request = new Request("https://example.com/me", {
      headers: { Origin: "https://education-management-u6xm.vercel.app" },
    });
    const env = { CORS_ALLOWED_ORIGINS: "https://*.vercel.app" } as Env;

    const headers = resolveCorsHeaders(request, env);
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://education-management-u6xm.vercel.app");
  });
});
