export interface Classroom {
  id: string;
  name: string;
  avatar?: string;
  schoolYear?: string;
}

export interface Student {
  id: string;
  name: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: "male" | "female";
  previousClass?: string;
  previousAchievements?: string;
  classroomRole?: string;
  potentialNote?: string;
  teamId?: string;
  points: number;
  totalRewards?: number;
}

export interface Team {
  id: string;
  name: string;
  avatar?: string;
  score: number;
}

export interface PointAction {
  id: string;
  name: string;
  points: number;
  type: "reward" | "penalty";
  icon?: string;
}

export interface PointHistory {
  id: string;
  studentId: string;
  actionId?: string;
  actionName: string;
  points: number;
  createdAt: string;
  note?: string;
}

export interface Reward {
  id: string;
  name: string;
  image?: string;
  description?: string;
  requiredPoints: number;
}

export interface RewardHistory {
  id: string;
  studentId: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  createdAt: string;
}

export interface Recognition {
  id: string;
  studentId: string;
  type: string;
  title: string;
  message?: string;
  createdAt: string;
}

export type LuckyWheelMode = "student" | "team" | "reward" | "activity";

export interface AppData {
  classroom: Classroom;
  students: Student[];
  teams: Team[];
  pointActions: PointAction[];
  pointHistory: PointHistory[];
  rewards: Reward[];
  rewardHistory: RewardHistory[];
  recognitions: Recognition[];
  wheelStudentBag: string[];
}
