import type {
  AppSettings,
  ClassroomSettings,
  LuckyWheelSelection,
  PointAction,
  PointHistory,
  Recognition,
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
  students: Student[];
  teams: Team[];
  pointActions: PointAction[];
  pointHistory: PointHistory[];
  rewards: Reward[];
  rewardHistory: RewardHistory[];
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
