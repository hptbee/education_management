import { afterEach, describe, expect, it, vi } from "vitest";
import { getTeamMotivationMessage, timeAgo } from "./teams";

describe("timeAgo", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Vừa xong for recent dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    expect(timeAgo("2026-06-15T11:59:30.000Z")).toBe("Vừa xong");
  });

  it("returns minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:10:00.000Z"));
    expect(timeAgo("2026-06-15T12:00:00.000Z")).toBe("10 phút trước");
  });

  it("returns hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T15:00:00.000Z"));
    expect(timeAgo("2026-06-15T12:00:00.000Z")).toBe("3 giờ trước");
  });

  it("returns Hôm qua", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    expect(timeAgo("2026-06-14T12:00:00.000Z")).toBe("Hôm qua");
  });

  it("returns days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    expect(timeAgo("2026-06-10T12:00:00.000Z")).toBe("5 ngày trước");
  });

  it("returns months ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    expect(timeAgo("2026-03-15T12:00:00.000Z")).toBe("3 tháng trước");
  });

  it("returns years ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    expect(timeAgo("2024-06-15T12:00:00.000Z")).toBe("2 năm trước");
  });

  it("returns invalid label for bad dates", () => {
    expect(timeAgo("not-a-date")).toBe("Không xác định");
  });
});

describe("getTeamMotivationMessage", () => {
  it("returns leader message for rank 0", () => {
    expect(getTeamMotivationMessage(0, 5)).toBe("Tuyệt vời! Đang dẫn đầu!");
  });

  it("returns champions message when count > 0", () => {
    expect(getTeamMotivationMessage(3, 5, 2)).toContain("quán quân");
  });
});
