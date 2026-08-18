/** Worker-side restore assembler — mirrors client mergeCloudFilesToClassroom. */

export interface WorkerActivityLog {
  id: string;
  type: string;
  studentId?: string;
  teamId?: string;
  title: string;
  note?: string;
  pointDelta?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WorkerActivityDayFile {
  version: number;
  date: string;
  updatedAt: string;
  activities: WorkerActivityLog[];
}

export interface WorkerClassroomDatabase {
  metadata: {
    id: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
  classroomSettings: Record<string, unknown>;
  classroomRoles: unknown[];
  badges: unknown[];
  students: unknown[];
  teams: unknown[];
  pointActions: unknown[];
  pointHistory: unknown[];
  rewards: unknown[];
  rewardHistory: unknown[];
  recognitionTitles: unknown[];
  recognitions: unknown[];
  luckyWheelHistory: unknown[];
  badgeAwardHistory: unknown[];
  wheelStudentBag: unknown[];
  teamScoreHistory: unknown[];
  appSettings: {
    soundEnabled: boolean;
    animationsEnabled: boolean;
    cloudBackupEnabled: boolean;
  };
}

const DOMAIN_PATHS = {
  classroom: "classroom.json",
  students: "students.json",
  teams: "teams.json",
  roles: "roles.json",
  recognitions: "recognitions.json",
  rewards: "rewards.json",
  settings: "settings.json",
  catalog: "catalog.json",
  activityIndex: "activity/index.json",
} as const;

function parseJsonFile<T>(content: string): T {
  return JSON.parse(content) as T;
}

function restoreHistoryFromActivities(activities: WorkerActivityLog[]): {
  pointHistory: unknown[];
  rewardHistory: unknown[];
  teamScoreHistory: unknown[];
  luckyWheelHistory: unknown[];
  badgeAwardHistory: unknown[];
} {
  const pointHistory: unknown[] = [];
  const rewardHistory: unknown[] = [];
  const teamScoreHistory: unknown[] = [];
  const luckyWheelHistory: unknown[] = [];
  const badgeAwardHistory: unknown[] = [];

  for (const activity of activities) {
    const source = (activity.metadata?.source as string) ?? activity.type;
    const payload = activity.metadata?.payload;
    if (!payload || typeof payload !== "object") continue;

    switch (source) {
      case "points":
        pointHistory.push(payload);
        break;
      case "reward":
        rewardHistory.push(payload);
        break;
      case "team-score":
        teamScoreHistory.push(payload);
        break;
      case "lucky-wheel":
        luckyWheelHistory.push(payload);
        break;
      case "badge":
        badgeAwardHistory.push(payload);
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

export function mergeCloudFilesToClassroom(files: Record<string, string>): WorkerClassroomDatabase {
  const classroomRaw = files[DOMAIN_PATHS.classroom];
  if (!classroomRaw) {
    throw new Error("Missing classroom.json in cloud backup");
  }

  const classroomFile = parseJsonFile<{
    metadata: WorkerClassroomDatabase["metadata"];
    classroomSettings: WorkerClassroomDatabase["classroomSettings"];
  }>(classroomRaw);

  const studentsFile = files[DOMAIN_PATHS.students]
    ? parseJsonFile<{ students: unknown[] }>(files[DOMAIN_PATHS.students])
    : { students: [] };
  const teamsFile = files[DOMAIN_PATHS.teams]
    ? parseJsonFile<{ teams: unknown[] }>(files[DOMAIN_PATHS.teams])
    : { teams: [] };
  const rolesFile = files[DOMAIN_PATHS.roles]
    ? parseJsonFile<{ classroomRoles: unknown[] }>(files[DOMAIN_PATHS.roles])
    : { classroomRoles: [] };
  const recognitionsFile = files[DOMAIN_PATHS.recognitions]
    ? parseJsonFile<{ recognitions: unknown[] }>(files[DOMAIN_PATHS.recognitions])
    : { recognitions: [] };
  const rewardsFile = files[DOMAIN_PATHS.rewards]
    ? parseJsonFile<{ rewards: unknown[] }>(files[DOMAIN_PATHS.rewards])
    : { rewards: [] };
  const settingsFile = files[DOMAIN_PATHS.settings]
    ? parseJsonFile<{ appSettings: WorkerClassroomDatabase["appSettings"] }>(files[DOMAIN_PATHS.settings])
    : {
        appSettings: {
          soundEnabled: true,
          animationsEnabled: true,
          cloudBackupEnabled: false,
        },
      };
  const catalogFile = files[DOMAIN_PATHS.catalog]
    ? parseJsonFile<{
        badges: unknown[];
        pointActions: unknown[];
        recognitionTitles: unknown[];
        wheelStudentBag: unknown[];
      }>(files[DOMAIN_PATHS.catalog])
    : {
        badges: [],
        pointActions: [],
        recognitionTitles: [],
        wheelStudentBag: [],
      };

  const allActivities: WorkerActivityLog[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (!path.startsWith("activity/") || path === DOMAIN_PATHS.activityIndex) continue;
    const day = parseJsonFile<WorkerActivityDayFile>(content);
    if (Array.isArray(day.activities)) {
      allActivities.push(...day.activities);
    }
  }

  const history = restoreHistoryFromActivities(allActivities);

  return {
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
}

export const MANIFEST_PATH = "manifest.json";

export const STRUCTURED_DOMAIN_FILES = [
  MANIFEST_PATH,
  DOMAIN_PATHS.classroom,
  DOMAIN_PATHS.students,
  DOMAIN_PATHS.teams,
  DOMAIN_PATHS.roles,
  DOMAIN_PATHS.recognitions,
  DOMAIN_PATHS.rewards,
  DOMAIN_PATHS.settings,
  DOMAIN_PATHS.catalog,
  DOMAIN_PATHS.activityIndex,
] as const;
