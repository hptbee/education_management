import { describe, expect, it } from "vitest";
import { createId } from "./id";

describe("createId", () => {
  it("prefixes a uuid", () => {
    const id = createId("student");
    expect(id.startsWith("student-")).toBe(true);
    expect(id.length).toBeGreaterThan("student-".length);
  });
});
