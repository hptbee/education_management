import { describe, expect, it } from "vitest";
import { MAX_BODY_BYTES, readBodyWithLimit } from "./http";

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
