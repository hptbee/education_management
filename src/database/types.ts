import type {
  AppSettings,
  Badge,
  BadgeAwardHistory,
  ClassroomRole,
  ClassroomSettings,
  LuckyWheelSelection,
  PointAction,
  PointHistory,
  Recognition,
  RecognitionTitle,
  Reward,
  RewardHistory,
  Student,
  Team,
  TeamScoreHistory,
} from "../types/models";

export interface DatabaseMetadata {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  /** When true, hidden from active lists and sidebar switcher until restored. */
  archived?: boolean;
  /** Local placeholder from cloud registry — full data not downloaded yet. */
  cloudStub?: boolean;
}

export interface ClassroomDatabase {
  metadata: DatabaseMetadata;
  classroomSettings: ClassroomSettings;
  classroomRoles: ClassroomRole[];
  badges: Badge[];
  students: Student[];
  teams: Team[];
  pointActions: PointAction[];
  pointHistory: PointHistory[];
  rewards: Reward[];
  rewardHistory: RewardHistory[];
  recognitionTitles: RecognitionTitle[];
  recognitions: Recognition[];
  luckyWheelHistory: LuckyWheelSelection[];
  badgeAwardHistory: BadgeAwardHistory[];
  wheelStudentBag: string[];
  teamScoreHistory: TeamScoreHistory[];
  appSettings: AppSettings;
}

export interface DatabaseSummary {
  id: string;
  className: string;
  schoolYear: string;
  teacherName: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  /** False when only registry metadata exists locally (cloud stub). */
  hydrated?: boolean;
}
