import { describe, expect, it } from "vitest";
import { getAvatarPastelClass, getRolePastelStyle, getTeamPastelStyle } from "./pastelPalette";

describe("getTeamPastelStyle", () => {
  it("cycles palette by index", () => {
    expect(getTeamPastelStyle(0).bg).toContain("pastel");
    expect(getTeamPastelStyle(5).bg).toBe(getTeamPastelStyle(0).bg);
  });
});

describe("getRolePastelStyle", () => {
  it("returns badge class", () => {
    expect(getRolePastelStyle(1).badge).toContain("pastel");
  });
});

describe("getAvatarPastelClass", () => {
  it("uses string length as seed", () => {
    expect(getAvatarPastelClass("abc")).toContain("pastel");
  });

  it("uses numeric seed", () => {
    expect(getAvatarPastelClass(2)).toContain("pastel");
  });
});
