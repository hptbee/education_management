import { defaultData } from "./defaultData";
import type {
  AppData,
  AppSettings,
  ClassroomSettings,
  PointAction,
  PointHistory,
  Reward,
  Student,
  Team,
} from "../types/models";

const STORAGE_KEY = "chibi-classroom-data";
const nowIso = () => new Date().toISOString();

export interface StorageResult {
  data: AppData;
  hasValidSettings: boolean;
  warning?: string;
}

export function loadStoredData(): StorageResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { data: defaultData, hasValidSettings: false };
    }

    const parsed = JSON.parse(raw) as Partial<AppData>;
    const data = normalizeAppData(parsed);
    return { data, hasValidSettings: isValidClassroomSettings(data.classroomSettings) };
  } catch {
    return {
      data: defaultData,
      hasValidSettings: false,
      warning: "Không thể đọc dữ liệu đã lưu. Ứng dụng đang dùng dữ liệu mặc định.",
    };
  }
}

export function saveStoredData(data: AppData): string | undefined {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return undefined;
  } catch {
    return "Không thể lưu dữ liệu vào trình duyệt. Vui lòng kiểm tra dung lượng lưu trữ.";
  }
}

export function isValidClassroomSettings(settings: ClassroomSettings | undefined): settings is ClassroomSettings {
  if (!settings) return false;
  return (
    settings.className.trim().length >= 1 &&
    settings.className.trim().length <= 50 &&
    settings.teacherName.trim().length >= 1 &&
    settings.teacherName.trim().length <= 50 &&
    settings.schoolYear.trim().length >= 1 &&
    settings.schoolYear.trim().length <= 30
  );
}

export function normalizeClassroomSettings(settings: Partial<ClassroomSettings> | undefined): ClassroomSettings {
  const fallback = defaultData.classroomSettings;
  const createdAt = stringOr(settings?.createdAt, fallback.createdAt);
  return {
    id: stringOr(settings?.id, fallback.id),
    className: stringOr(settings?.className, fallback.className).trim(),
    classAvatar: optionalString(settings?.classAvatar),
    teacherName: stringOr(settings?.teacherName, fallback.teacherName).trim(),
    teacherAvatar: optionalString(settings?.teacherAvatar),
    schoolYear: stringOr(settings?.schoolYear, fallback.schoolYear).trim(),
    createdAt,
    updatedAt: stringOr(settings?.updatedAt, createdAt),
  };
}

export function normalizeAppData(input: Partial<AppData>): AppData {
  return {
    classroomSettings: normalizeClassroomSettings(input.classroomSettings),
    students: arrayOr(input.students).map(normalizeStudent),
    teams: arrayOr(input.teams).map(normalizeTeam),
    teamScoreHistory: arrayOr(input.teamScoreHistory),
    pointActions: arrayOr(input.pointActions).map(normalizePointAction),
    pointHistory: arrayOr(input.pointHistory).map(normalizePointHistory),
    rewards: arrayOr(input.rewards).map(normalizeReward),
    rewardHistory: arrayOr(input.rewardHistory),
    recognitions: arrayOr(input.recognitions),
    luckyWheelHistory: arrayOr(input.luckyWheelHistory),
    wheelStudentBag: arrayOr(input.wheelStudentBag).filter((id): id is string => typeof id === "string"),
    appSettings: normalizeAppSettings(input.appSettings),
  };
}

function normalizeStudent(student: Partial<Student>): Student {
  const createdAt = stringOr(student.createdAt, nowIso());
  return {
    id: stringOr(student.id, crypto.randomUUID()),
    name: stringOr(student.name, "Học sinh").trim(),
    avatar: optionalString(student.avatar),
    dateOfBirth: optionalString(student.dateOfBirth),
    gender: student.gender === "male" || student.gender === "female" ? student.gender : undefined,
    previousClass: optionalString(student.previousClass),
    previousAchievements: optionalString(student.previousAchievements),
    classroomRole: optionalString(student.classroomRole),
    potentialNote: optionalString(student.potentialNote),
    teamId: optionalString(student.teamId),
    points: numberOr(student.points, 0),
    totalRewards: numberOr(student.totalRewards, 0),
    createdAt,
    updatedAt: stringOr(student.updatedAt, createdAt),
  };
}

function normalizeTeam(team: Partial<Team>): Team {
  const createdAt = stringOr(team.createdAt, nowIso());
  return {
    id: stringOr(team.id, crypto.randomUUID()),
    name: stringOr(team.name, "Tổ").trim(),
    avatar: optionalString(team.avatar),
    score: numberOr(team.score, 0),
    createdAt,
    updatedAt: stringOr(team.updatedAt, createdAt),
  };
}

function normalizePointAction(action: Partial<PointAction>): PointAction {
  const points = numberOr(action.points, action.type === "penalty" ? -1 : 1);
  return {
    id: stringOr(action.id, crypto.randomUUID()),
    name: stringOr(action.name, "Tác vụ điểm").trim(),
    points,
    type: action.type === "penalty" || points < 0 ? "penalty" : "reward",
    icon: optionalString(action.icon),
    isActive: action.isActive ?? true,
  };
}

function normalizePointHistory(history: Partial<PointHistory>): PointHistory {
  return {
    id: stringOr(history.id, crypto.randomUUID()),
    studentId: stringOr(history.studentId, ""),
    actionId: optionalString(history.actionId),
    actionName: stringOr(history.actionName, "Điều chỉnh điểm"),
    points: numberOr(history.points, 0),
    source: history.source ?? "action",
    createdAt: stringOr(history.createdAt, nowIso()),
    note: optionalString(history.note),
  };
}

function normalizeReward(reward: Partial<Reward>): Reward {
  const createdAt = stringOr(reward.createdAt, nowIso());
  return {
    id: stringOr(reward.id, crypto.randomUUID()),
    name: stringOr(reward.name, "Phần thưởng").trim(),
    image: optionalString(reward.image),
    description: optionalString(reward.description),
    requiredPoints: Math.max(1, Math.trunc(numberOr(reward.requiredPoints, 1))),
    isActive: reward.isActive ?? true,
    createdAt,
    updatedAt: stringOr(reward.updatedAt, createdAt),
  };
}

function normalizeAppSettings(settings: Partial<AppSettings> | undefined): AppSettings {
  return {
    soundEnabled: settings?.soundEnabled ?? true,
    animationsEnabled: settings?.animationsEnabled ?? true,
  };
}

function arrayOr<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
