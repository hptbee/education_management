import type {
  AppSettings,
  Badge,
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
}
