import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearLastClassroomId, getLastClassroomId, setLastClassroomId } from "./lastClassroom";

describe("lastClassroom", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("stores and reads last classroom id", () => {
    setLastClassroomId("class-1");
    expect(getLastClassroomId()).toBe("class-1");
  });

  it("clears last classroom id", () => {
    setLastClassroomId("class-1");
    clearLastClassroomId();
    expect(getLastClassroomId()).toBeNull();
  });
});
