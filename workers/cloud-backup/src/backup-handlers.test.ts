import { describe, expect, it } from "vitest";
import { assertUploadBody } from "./backup-handlers";

describe("assertUploadBody", () => {
  const validBody = {
    classroomId: "class-1",
    fileName: "class-1.json",
    schemaVersion: 1,
    timestamp: "2026-01-01T00:00:00.000Z",
    payload: {
      metadata: {
        id: "class-1",
        version: 1,
      },
    },
  };

  it("accepts a valid backup body", () => {
    expect(assertUploadBody(validBody).classroomId).toBe("class-1");
  });

  it("rejects mismatched classroom ids", () => {
    expect(() =>
      assertUploadBody({
        ...validBody,
        payload: {
          metadata: {
            id: "other-class",
            version: 1,
          },
        },
      }),
    ).toThrow("payload.metadata.id must match classroomId");
  });

  it("rejects missing metadata version", () => {
    expect(() =>
      assertUploadBody({
        ...validBody,
        payload: {
          metadata: {
            id: "class-1",
          },
        },
      }),
    ).toThrow("Invalid payload.metadata.version");
  });

  it("rejects metadata version that does not match schemaVersion", () => {
    expect(() =>
      assertUploadBody({
        ...validBody,
        schemaVersion: 2,
        payload: {
          metadata: {
            id: "class-1",
            version: 1,
          },
        },
      }),
    ).toThrow("payload.metadata.version must match schemaVersion");
  });
});
