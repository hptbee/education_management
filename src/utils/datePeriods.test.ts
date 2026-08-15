import { describe, expect, it } from "vitest";
import { getMondayWeekStart, getMonthStart } from "./datePeriods";

describe("datePeriods", () => {
  it("returns Monday 00:00 for week start", () => {
    const wednesday = new Date(2026, 7, 12, 15, 30, 0);
    const start = getMondayWeekStart(wednesday);

    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it("returns first day of month at midnight", () => {
    const midMonth = new Date(2026, 7, 20, 12, 0, 0);
    const start = getMonthStart(midMonth);

    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(7);
    expect(start.getHours()).toBe(0);
  });
});
