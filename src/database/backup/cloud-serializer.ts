import type { ClassroomDatabase } from "../types";
import type {
  BadgeAwardHistory,
  LuckyWheelSelection,
  PointHistory,
  RewardHistory,
  TeamScoreHistory,
} from "../../types/models";
import { DATABASE_VERSION } from "../database.factory";
import { normalizeClassroomDatabase } from "../../utils/classroomRoles";
import { toLocalDateKey } from "./local-date";
import {
  CLOUD_ACTIVITY_FILE_VERSION,
  CLOUD_FILE_VERSION,
  CLOUD_STORAGE_FORMAT,
  CLOUD_STORAGE_VERSION,
  type ActivityLog,
  type CloudActivityDayFile,
  type CloudActivityIndexFile,
  type CloudClassroomRegistryEntry,
  type CloudClassroomsRegistryFile,
  type CloudFileUpload,
  type CloudManifestFile,
  type CloudSyncDomain,
  type SplitClassroomResult,
} from "./cloud-types";

const DOMAIN_PATHS = {
  classroom: "classroom.json",
  students: "students.json",
  teams: "teams.json",
  roles: "roles.json",
  recognitions: "recognitions.json",
  rewards: "rewards.json",
  settings: "settings.json",
  catalog: "catalog.json",
  manifest: "manifest.json",
  activityIndex: "activity/index.json",
} as const;

function wrapFile(updatedAt: string, data: Record<string, unknown>): Record<string, unknown> {
  return { version: CLOUD_FILE_VERSION, updatedAt, ...data };
}

function activityFromPointHistory(entry: PointHistory): ActivityLog {
  return {
    id: entry.id,
    type: "points",
    studentId: entry.studentId,
    title: entry.actionName,
    note: entry.note,
    pointDelta: entry.points,
    createdAt: entry.createdAt,
    metadata: { source: "points", payload: entry },
  };
}

function activityFromRewardHistory(entry: RewardHistory): ActivityLog {
  return {
    id: entry.id,
    type: "reward",
    studentId: entry.studentId,
    title: `Đổi quà: ${entry.rewardName}`,
    pointDelta: -entry.pointsSpent,
    createdAt: entry.createdAt,
    metadata: { source: "reward", payload: entry },
  };
}

function activityFromTeamScore(entry: TeamScoreHistory): ActivityLog {
  return {
    id: entry.id,
    type: "team-score",
    teamId: entry.teamId,
    title: entry.actionName,
    note: entry.note,
    pointDelta: entry.points,
    createdAt: entry.createdAt,
    metadata: { source: "team-score", payload: entry },
  };
}

function activityFromWheel(entry: LuckyWheelSelection): ActivityLog {
  const studentIds = entry.studentIds?.length ? entry.studentIds : [entry.studentId];
  return {
    id: entry.id,
    type: "lucky-wheel",
    studentId: studentIds[0],
    title: "Vòng quay may mắn",
    createdAt: entry.createdAt,
    metadata: { source: "lucky-wheel", payload: entry, studentIds },
  };
}

function activityFromBadge(entry: BadgeAwardHistory): ActivityLog {
  return {
    id: entry.id,
    type: "badge",
    studentId: entry.studentIds[0],
    title: entry.studentIds.length > 1 ? "Trao huy hiệu" : "Nhận huy hiệu",
    note: entry.note,
    createdAt: entry.createdAt,
    metadata: { source: "badge", payload: entry, studentIds: entry.studentIds },
  };
}

export function buildActivityLogsFromDatabase(db: ClassroomDatabase): ActivityLog[] {
  const logs: ActivityLog[] = [];
  for (const entry of db.pointHistory ?? []) logs.push(activityFromPointHistory(entry));
  for (const entry of db.rewardHistory ?? []) logs.push(activityFromRewardHistory(entry));
  for (const entry of db.teamScoreHistory ?? []) logs.push(activityFromTeamScore(entry));
  for (const entry of db.luckyWheelHistory ?? []) logs.push(activityFromWheel(entry));
  for (const entry of db.badgeAwardHistory ?? []) logs.push(activityFromBadge(entry));
  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function groupActivitiesByDate(activities: ActivityLog[]): Map<string, ActivityLog[]> {
  const map = new Map<string, ActivityLog[]>();
  for (const activity of activities) {
    const date = toLocalDateKey(activity.createdAt);
    const list = map.get(date) ?? [];
    list.push(activity);
    map.set(date, list);
  }
  return map;
}

export function buildActivityIndex(activities: ActivityLog[], updatedAt: string): CloudActivityIndexFile {
  const byDate = groupActivitiesByDate(activities);
  const dates = [...byDate.entries()]
    .map(([date, list]) => ({
      date,
      count: list.length,
      updatedAt,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    version: CLOUD_FILE_VERSION,
    updatedAt,
    dates,
  };
}

export function splitClassroomToCloudFiles(
  db: ClassroomDatabase,
  options?: { migrationComplete?: boolean },
): SplitClassroomResult {
  const normalized = normalizeClassroomDatabase(db);
  const updatedAt = normalized.metadata.updatedAt;
  const classroomKey = normalized.metadata.id;
  const activities = buildActivityLogsFromDatabase(normalized);
  const byDate = groupActivitiesByDate(activities);

  const files: Record<string, unknown> = {
    [DOMAIN_PATHS.manifest]: {
      version: CLOUD_STORAGE_VERSION,
      format: CLOUD_STORAGE_FORMAT,
      classroomKey,
      createdAt: normalized.metadata.createdAt,
      updatedAt,
      schemaVersion: normalized.metadata.version ?? DATABASE_VERSION,
      migrationComplete: options?.migrationComplete ?? true,
    } satisfies CloudManifestFile,
    [DOMAIN_PATHS.classroom]: wrapFile(updatedAt, {
      metadata: normalized.metadata,
      classroomSettings: normalized.classroomSettings,
    }),
    [DOMAIN_PATHS.students]: wrapFile(updatedAt, { students: normalized.students }),
    [DOMAIN_PATHS.teams]: wrapFile(updatedAt, { teams: normalized.teams }),
    [DOMAIN_PATHS.roles]: wrapFile(updatedAt, { classroomRoles: normalized.classroomRoles }),
    [DOMAIN_PATHS.recognitions]: wrapFile(updatedAt, { recognitions: normalized.recognitions }),
    [DOMAIN_PATHS.rewards]: wrapFile(updatedAt, { rewards: normalized.rewards }),
    [DOMAIN_PATHS.settings]: wrapFile(updatedAt, { appSettings: normalized.appSettings }),
    [DOMAIN_PATHS.catalog]: wrapFile(updatedAt, {
      badges: normalized.badges,
      pointActions: normalized.pointActions,
      recognitionTitles: normalized.recognitionTitles,
      wheelStudentBag: normalized.wheelStudentBag,
    }),
    [DOMAIN_PATHS.activityIndex]: buildActivityIndex(activities, updatedAt),
  };

  for (const [date, dayActivities] of byDate.entries()) {
    const dayFile: CloudActivityDayFile = {
      version: CLOUD_ACTIVITY_FILE_VERSION,
      date,
      updatedAt,
      activities: dayActivities,
    };
    files[`activity/${date}.json`] = dayFile;
  }

  return { files, paths: Object.keys(files) };
}

export function buildRegistryEntry(db: ClassroomDatabase): CloudClassroomRegistryEntry {
  return {
    key: db.metadata.id,
    name: db.classroomSettings.className,
    schoolYear: db.classroomSettings.schoolYear,
    createdAt: db.metadata.createdAt,
    updatedAt: db.metadata.updatedAt,
    archived: db.metadata.archived ?? false,
  };
}

export function buildClassroomsRegistry(
  entries: CloudClassroomRegistryEntry[],
  updatedAt: string,
): CloudClassroomsRegistryFile {
  return {
    version: 1,
    updatedAt,
    classrooms: entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

export function buildClassroomsRegistryFromSummaries(
  summaries: Array<{
    id: string;
    className: string;
    schoolYear: string;
    createdAt: string;
    updatedAt: string;
    archived?: boolean;
  }>,
  updatedAt: string,
): CloudClassroomsRegistryFile {
  const entries = summaries.map((s) => ({
    key: s.id,
    name: s.className,
    schoolYear: s.schoolYear,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    archived: s.archived ?? false,
  }));
  return buildClassroomsRegistry(entries, updatedAt);
}

function parseJsonFile<T>(content: string): T {
  return JSON.parse(content) as T;
}

function restoreHistoryFromActivities(activities: ActivityLog[]): {
  pointHistory: PointHistory[];
  rewardHistory: RewardHistory[];
  teamScoreHistory: TeamScoreHistory[];
  luckyWheelHistory: LuckyWheelSelection[];
  badgeAwardHistory: BadgeAwardHistory[];
} {
  const pointHistory: PointHistory[] = [];
  const rewardHistory: RewardHistory[] = [];
  const teamScoreHistory: TeamScoreHistory[] = [];
  const luckyWheelHistory: LuckyWheelSelection[] = [];
  const badgeAwardHistory: BadgeAwardHistory[] = [];

  for (const activity of activities) {
    const source = (activity.metadata?.source as string) ?? activity.type;
    const payload = activity.metadata?.payload;
    if (!payload || typeof payload !== "object") continue;

    switch (source) {
      case "points":
        pointHistory.push(payload as PointHistory);
        break;
      case "reward":
        rewardHistory.push(payload as RewardHistory);
        break;
      case "team-score":
        teamScoreHistory.push(payload as TeamScoreHistory);
        break;
      case "lucky-wheel":
        luckyWheelHistory.push(payload as LuckyWheelSelection);
        break;
      case "badge":
        badgeAwardHistory.push(payload as BadgeAwardHistory);
        break;
      default:
        break;
    }
  }

  return {
    pointHistory,
    rewardHistory,
    teamScoreHistory,
    luckyWheelHistory,
    badgeAwardHistory,
  };
}

export function mergeCloudFilesToClassroom(files: Record<string, string>): ClassroomDatabase {
  const classroomRaw = files[DOMAIN_PATHS.classroom];
  if (!classroomRaw) {
    throw new Error("Missing classroom.json in cloud backup");
  }

  const classroomFile = parseJsonFile<{
    metadata: ClassroomDatabase["metadata"];
    classroomSettings: ClassroomDatabase["classroomSettings"];
  }>(classroomRaw);

  const studentsFile = files[DOMAIN_PATHS.students]
    ? parseJsonFile<{ students: ClassroomDatabase["students"] }>(files[DOMAIN_PATHS.students])
    : { students: [] };
  const teamsFile = files[DOMAIN_PATHS.teams]
    ? parseJsonFile<{ teams: ClassroomDatabase["teams"] }>(files[DOMAIN_PATHS.teams])
    : { teams: [] };
  const rolesFile = files[DOMAIN_PATHS.roles]
    ? parseJsonFile<{ classroomRoles: ClassroomDatabase["classroomRoles"] }>(files[DOMAIN_PATHS.roles])
    : { classroomRoles: [] };
  const recognitionsFile = files[DOMAIN_PATHS.recognitions]
    ? parseJsonFile<{ recognitions: ClassroomDatabase["recognitions"] }>(files[DOMAIN_PATHS.recognitions])
    : { recognitions: [] };
  const rewardsFile = files[DOMAIN_PATHS.rewards]
    ? parseJsonFile<{ rewards: ClassroomDatabase["rewards"] }>(files[DOMAIN_PATHS.rewards])
    : { rewards: [] };
  const settingsFile = files[DOMAIN_PATHS.settings]
    ? parseJsonFile<{ appSettings: ClassroomDatabase["appSettings"] }>(files[DOMAIN_PATHS.settings])
    : {
        appSettings: {
          soundEnabled: true,
          animationsEnabled: true,
          cloudBackupEnabled: false,
        },
      };
  const catalogFile = files[DOMAIN_PATHS.catalog]
    ? parseJsonFile<{
        badges: ClassroomDatabase["badges"];
        pointActions: ClassroomDatabase["pointActions"];
        recognitionTitles: ClassroomDatabase["recognitionTitles"];
        wheelStudentBag: ClassroomDatabase["wheelStudentBag"];
      }>(files[DOMAIN_PATHS.catalog])
    : {
        badges: [],
        pointActions: [],
        recognitionTitles: [],
        wheelStudentBag: [],
      };

  const allActivities: ActivityLog[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (!path.startsWith("activity/") || path === DOMAIN_PATHS.activityIndex) continue;
    const day = parseJsonFile<CloudActivityDayFile>(content);
    if (Array.isArray(day.activities)) {
      allActivities.push(...day.activities);
    }
  }

  const history = restoreHistoryFromActivities(allActivities);

  const db: ClassroomDatabase = {
    metadata: classroomFile.metadata,
    classroomSettings: classroomFile.classroomSettings,
    classroomRoles: rolesFile.classroomRoles,
    badges: catalogFile.badges,
    students: studentsFile.students,
    teams: teamsFile.teams,
    pointActions: catalogFile.pointActions,
    pointHistory: history.pointHistory,
    rewards: rewardsFile.rewards,
    rewardHistory: history.rewardHistory,
    recognitionTitles: catalogFile.recognitionTitles,
    recognitions: recognitionsFile.recognitions,
    luckyWheelHistory: history.luckyWheelHistory,
    badgeAwardHistory: history.badgeAwardHistory,
    wheelStudentBag: catalogFile.wheelStudentBag,
    teamScoreHistory: history.teamScoreHistory,
    appSettings: settingsFile.appSettings,
  };

  return normalizeClassroomDatabase(db);
}

export function serializeCloudFilesForUpload(
  files: Record<string, unknown>,
  paths: string[],
): CloudFileUpload[] {
  return paths.map((path) => ({
    path,
    content: JSON.stringify(files[path], null, 2),
  }));
}

export function domainsFromDirty(dirty: {
  classroom?: boolean;
  students?: boolean;
  teams?: boolean;
  roles?: boolean;
  recognitions?: boolean;
  rewards?: boolean;
  settings?: boolean;
  catalog?: boolean;
  activityIndex?: boolean;
  activityDates?: string[];
  registry?: boolean;
}): CloudSyncDomain[] {
  const domains: CloudSyncDomain[] = [];
  if (dirty.classroom) domains.push("classroom");
  if (dirty.students) domains.push("students");
  if (dirty.teams) domains.push("teams");
  if (dirty.roles) domains.push("roles");
  if (dirty.recognitions) domains.push("recognitions");
  if (dirty.rewards) domains.push("rewards");
  if (dirty.settings) domains.push("settings");
  if (dirty.catalog) domains.push("catalog");
  if (dirty.activityIndex) domains.push("activityIndex");
  for (const date of dirty.activityDates ?? []) {
    domains.push(`activity:${date}`);
  }
  if (dirty.registry) domains.push("registry");
  return domains;
}

export function pathsForDomains(
  domains: CloudSyncDomain[],
  split: SplitClassroomResult,
): string[] {
  const paths = new Set<string>();
  for (const domain of domains) {
    if (domain === "registry") continue;
    if (domain === "activityIndex") {
      paths.add(DOMAIN_PATHS.activityIndex);
      continue;
    }
    if (domain.startsWith("activity:")) {
      const date = domain.slice("activity:".length);
      paths.add(`activity/${date}.json`);
      continue;
    }
    const path = DOMAIN_PATHS[domain as keyof typeof DOMAIN_PATHS];
    if (path) paths.add(path);
  }
  paths.add(DOMAIN_PATHS.manifest);
  return [...paths].filter((p) => split.paths.includes(p) || p === DOMAIN_PATHS.manifest);
}

export function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 31 + content.charCodeAt(i)) | 0;
  }
  return `${content.length}:${hash}`;
}
