import type { CloudDirtyState } from "./cloud-types";
import { toLocalDateKey } from "./local-date";
import { emptyCloudDirtyState } from "./cloud-types";

export class CloudDirtyTracker {
  private readonly byClassroom = new Map<string, CloudDirtyState>();

  get(classroomKey: string): CloudDirtyState {
    if (!this.byClassroom.has(classroomKey)) {
      this.byClassroom.set(classroomKey, emptyCloudDirtyState());
    }
    return this.byClassroom.get(classroomKey)!;
  }

  hasDirty(classroomKey: string): boolean {
    const dirty = this.get(classroomKey);
    return (
      dirty.classroom ||
      dirty.students ||
      dirty.teams ||
      dirty.roles ||
      dirty.recognitions ||
      dirty.rewards ||
      dirty.settings ||
      dirty.catalog ||
      dirty.activityIndex ||
      dirty.activityDates.length > 0 ||
      dirty.registry ||
      dirty.dirtyAssets.length > 0
    );
  }

  mark(classroomKey: string, patch: Partial<Omit<CloudDirtyState, "activityDates" | "dirtyAssets"> & { dirtyAssets?: string[] }>): void {
    const current = this.get(classroomKey);
    this.byClassroom.set(classroomKey, {
      ...current,
      ...patch,
      activityDates: current.activityDates,
      dirtyAssets: patch.dirtyAssets ?? current.dirtyAssets,
    });
  }

  markActivityDates(classroomKey: string, dates: string[]): void {
    const current = this.get(classroomKey);
    const merged = new Set(current.activityDates);
    for (const date of dates) merged.add(date);
    this.byClassroom.set(classroomKey, {
      ...current,
      activityIndex: true,
      activityDates: [...merged],
    });
  }

  markAll(classroomKey: string): void {
    this.byClassroom.set(classroomKey, {
      classroom: true,
      students: true,
      teams: true,
      roles: true,
      recognitions: true,
      rewards: true,
      settings: true,
      catalog: true,
      activityIndex: true,
      activityDates: [],
      registry: true,
      dirtyAssets: [],
    });
  }

  clear(classroomKey: string): void {
    this.byClassroom.set(classroomKey, emptyCloudDirtyState());
  }

  clearClassroom(classroomKey: string): void {
    this.byClassroom.delete(classroomKey);
  }
}

export const cloudDirtyTracker = new CloudDirtyTracker();

export function inferDirtyFromDatabaseChange(
  prev: { metadata?: { updatedAt?: string }; students?: unknown[] } | null,
  next: {
    metadata: { id: string; updatedAt: string };
    classroomSettings: unknown;
    students: unknown[];
    teams: unknown[];
    classroomRoles: unknown[];
    recognitions: unknown[];
    rewards: unknown[];
    appSettings: unknown;
    badges: unknown[];
    pointActions: unknown[];
    recognitionTitles: unknown[];
    wheelStudentBag: unknown[];
    pointHistory: unknown[];
    rewardHistory: unknown[];
    teamScoreHistory: unknown[];
    luckyWheelHistory: unknown[];
    badgeAwardHistory: unknown[];
  },
): Partial<CloudDirtyState> {
  const patch: Partial<CloudDirtyState> = {};

  const prevClassroom = prev as typeof next | null;
  if (
    !prevClassroom ||
    prevClassroom.metadata?.updatedAt !== next.metadata.updatedAt ||
    JSON.stringify(prevClassroom.classroomSettings) !== JSON.stringify(next.classroomSettings)
  ) {
    patch.classroom = true;
  }

  if (!prev || prev.metadata?.updatedAt !== next.metadata.updatedAt) {
    patch.registry = true;
  }

  if (!prev || JSON.stringify(prev.students) !== JSON.stringify(next.students)) {
    patch.students = true;
  }

  if (!prev || JSON.stringify((prev as typeof next).teams) !== JSON.stringify(next.teams)) {
    patch.teams = true;
  }

  if (!prev || JSON.stringify((prev as typeof next).classroomRoles) !== JSON.stringify(next.classroomRoles)) {
    patch.roles = true;
  }

  if (!prev || JSON.stringify((prev as typeof next).recognitions) !== JSON.stringify(next.recognitions)) {
    patch.recognitions = true;
  }

  if (!prev || JSON.stringify((prev as typeof next).rewards) !== JSON.stringify(next.rewards)) {
    patch.rewards = true;
  }

  if (!prev || JSON.stringify((prev as typeof next).appSettings) !== JSON.stringify(next.appSettings)) {
    patch.settings = true;
  }

  const catalogChanged =
    !prev ||
    JSON.stringify((prev as typeof next).badges) !== JSON.stringify(next.badges) ||
    JSON.stringify((prev as typeof next).pointActions) !== JSON.stringify(next.pointActions) ||
    JSON.stringify((prev as typeof next).recognitionTitles) !== JSON.stringify(next.recognitionTitles) ||
    JSON.stringify((prev as typeof next).wheelStudentBag) !== JSON.stringify(next.wheelStudentBag);

  if (catalogChanged) {
    patch.catalog = true;
  }

  const historyChanged =
    !prev ||
    JSON.stringify((prev as typeof next).pointHistory) !== JSON.stringify(next.pointHistory) ||
    JSON.stringify((prev as typeof next).rewardHistory) !== JSON.stringify(next.rewardHistory) ||
    JSON.stringify((prev as typeof next).teamScoreHistory) !== JSON.stringify(next.teamScoreHistory) ||
    JSON.stringify((prev as typeof next).luckyWheelHistory) !== JSON.stringify(next.luckyWheelHistory) ||
    JSON.stringify((prev as typeof next).badgeAwardHistory) !== JSON.stringify(next.badgeAwardHistory);

  if (historyChanged) {
    patch.activityIndex = true;
  }

  return patch;
}

export function activityDatesFromHistoryChange(
  prev: {
    pointHistory?: Array<{ id: string; createdAt: string }>;
    rewardHistory?: Array<{ id: string; createdAt: string }>;
    teamScoreHistory?: Array<{ id: string; createdAt: string }>;
    luckyWheelHistory?: Array<{ id: string; createdAt: string }>;
    badgeAwardHistory?: Array<{ id: string; createdAt: string }>;
  } | null,
  next: {
    pointHistory: Array<{ id: string; createdAt: string }>;
    rewardHistory: Array<{ id: string; createdAt: string }>;
    teamScoreHistory: Array<{ id: string; createdAt: string }>;
    luckyWheelHistory: Array<{ id: string; createdAt: string }>;
    badgeAwardHistory: Array<{ id: string; createdAt: string }>;
  },
): string[] {
  const dates = new Set<string>();
  const collect = (entries: Array<{ createdAt: string }>) => {
    for (const entry of entries) {
      dates.add(toLocalDateKey(entry.createdAt));
    }
  };

  if (!prev) {
    collect(next.pointHistory);
    collect(next.rewardHistory);
    collect(next.teamScoreHistory);
    collect(next.luckyWheelHistory);
    collect(next.badgeAwardHistory);
    return [...dates];
  }

  const prevIds = new Set<string>();
  const addNew = (entries: Array<{ id: string; createdAt: string }>, prevEntries: Array<{ id: string; createdAt: string }>) => {
    const prevMap = new Map(prevEntries.map((e) => [e.id, e.createdAt]));
    for (const entry of entries) {
      if (!prevMap.has(entry.id) || prevMap.get(entry.id) !== entry.createdAt) {
        dates.add(toLocalDateKey(entry.createdAt));
      }
      prevIds.add(entry.id);
    }
  };

  addNew(next.pointHistory, prev.pointHistory ?? []);
  addNew(next.rewardHistory, prev.rewardHistory ?? []);
  addNew(next.teamScoreHistory, prev.teamScoreHistory ?? []);
  addNew(next.luckyWheelHistory, prev.luckyWheelHistory ?? []);
  addNew(next.badgeAwardHistory, prev.badgeAwardHistory ?? []);

  return [...dates];
}
