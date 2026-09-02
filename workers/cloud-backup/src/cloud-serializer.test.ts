import { describe, expect, it } from "vitest";
import { mergeCloudFilesToClassroom } from "./cloud-serializer";

describe("mergeCloudFilesToClassroom", () => {
  it("restores duck-race history from activity payloads", () => {
    const duckEntry = {
      id: "duck-1",
      winnerId: "s1",
      winnerIds: ["s1"],
      participantIds: ["s1", "s2"],
      createdAt: "2026-03-16T09:00:00.000Z",
    };

    const merged = mergeCloudFilesToClassroom({
      "classroom.json": JSON.stringify({
        metadata: {
          id: "classroom-1",
          version: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-03-16T09:00:00.000Z",
        },
        classroomSettings: { className: "2/7", schoolYear: "2026-2027" },
      }),
      "activity/2026-03-16.json": JSON.stringify({
        version: 1,
        date: "2026-03-16",
        updatedAt: "2026-03-16T09:00:00.000Z",
        activities: [
          {
            id: "duck-1",
            type: "duck-race",
            title: "Đua vịt",
            createdAt: duckEntry.createdAt,
            metadata: { source: "duck-race", payload: duckEntry },
          },
        ],
      }),
    });

    expect(merged.duckRaceHistory).toEqual([duckEntry]);
    expect(merged.luckyWheelHistory).toEqual([]);
  });
});
