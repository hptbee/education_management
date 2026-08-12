import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  AppData,
  ClassroomSettings,
  PointAction,
  PointHistory,
  Recognition,
  Reward,
  RewardHistory,
  Student,
  Team,
  TeamScoreHistory,
} from "../types/models";
import { createId } from "../utils/id";
import { isValidClassroomSettings, loadStoredData, normalizeClassroomSettings, saveStoredData } from "./storage";

interface AppDataContextValue {
  data: AppData;
  isFirstRun: boolean;
  storageWarning?: string;
  updateClassroomSettings: (settings: ClassroomSettings) => void;
  saveStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;
  saveTeam: (team: Team) => void;
  deleteTeam: (teamId: string) => void;
  updateTeamScore: (teamId: string, delta: number) => void;
  resetTeamScore: (teamId: string) => void;
  savePointAction: (action: PointAction) => void;
  deletePointAction: (actionId: string) => void;
  applyPoints: (studentId: string, action: PointAction, note?: string) => void;
  saveReward: (reward: Reward) => void;
  deleteReward: (rewardId: string) => void;
  redeemReward: (studentId: string, reward: Reward) => boolean;
  addRecognition: (recognition: Omit<Recognition, "id" | "createdAt">) => Recognition;
  setWheelStudentBag: (bag: string[]) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [initialData] = useState(loadStoredData);
  const [data, setDataState] = useState<AppData>(initialData.data);
  const [storageWarning, setStorageWarning] = useState<string | undefined>(initialData.warning);

  const setData = (updater: (current: AppData) => AppData) => {
    setDataState((current) => {
      const next = updater(current);
      setStorageWarning(saveStoredData(next));
      return next;
    });
  };

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      isFirstRun: !isValidClassroomSettings(data.classroomSettings),
      storageWarning,
      updateClassroomSettings: (settings) =>
        setData((current) => ({
          ...current,
          classroomSettings: normalizeClassroomSettings({
            ...settings,
            updatedAt: new Date().toISOString(),
          }),
        })),
      saveStudent: (student) =>
        setData((current) => {
          const existing = current.students.find((item) => item.id === student.id);
          const now = new Date().toISOString();
          const saved: Student = {
            ...student,
            name: student.name.trim(),
            points: existing?.points ?? student.points,
            totalRewards: existing?.totalRewards ?? student.totalRewards,
            createdAt: existing?.createdAt ?? student.createdAt ?? now,
            updatedAt: now,
          };
          return {
            ...current,
            students: existing
              ? current.students.map((item) => (item.id === student.id ? saved : item))
              : [...current.students, saved],
          };
        }),
      deleteStudent: (studentId) =>
        setData((current) => ({
          ...current,
          students: current.students.filter((student) => student.id !== studentId),
          pointHistory: current.pointHistory.filter((item) => item.studentId !== studentId),
          rewardHistory: current.rewardHistory.filter((item) => item.studentId !== studentId),
          recognitions: current.recognitions.filter((item) => item.studentId !== studentId),
          wheelStudentBag: current.wheelStudentBag.filter((id) => id !== studentId),
        })),
      saveTeam: (team) =>
        setData((current) => {
          const existing = current.teams.find((item) => item.id === team.id);
          const now = new Date().toISOString();
          const saved: Team = {
            ...team,
            name: team.name.trim(),
            createdAt: existing?.createdAt ?? team.createdAt ?? now,
            updatedAt: now,
          };
          return {
            ...current,
            teams: existing ? current.teams.map((item) => (item.id === team.id ? saved : item)) : [...current.teams, saved],
          };
        }),
      deleteTeam: (teamId) =>
        setData((current) => ({
          ...current,
          teams: current.teams.filter((team) => team.id !== teamId),
          students: current.students.map((student) =>
            student.teamId === teamId ? { ...student, teamId: undefined } : student,
          ),
        })),
      updateTeamScore: (teamId, delta) =>
        setData((current) => {
          const history: TeamScoreHistory = {
            id: createId("team-score"),
            teamId,
            points: delta,
            actionName: delta > 0 ? "Cộng điểm tổ" : "Trừ điểm tổ",
            createdAt: new Date().toISOString(),
          };
          return {
            ...current,
            teams: current.teams.map((team) =>
              team.id === teamId ? { ...team, score: team.score + delta, updatedAt: history.createdAt } : team,
            ),
            teamScoreHistory: [history, ...current.teamScoreHistory],
          };
        }),
      resetTeamScore: (teamId) =>
        setData((current) => {
          const team = current.teams.find((item) => item.id === teamId);
          const now = new Date().toISOString();
          const history: TeamScoreHistory = {
            id: createId("team-score"),
            teamId,
            points: -(team?.score ?? 0),
            actionName: "Đặt lại điểm tổ",
            createdAt: now,
          };
          return {
            ...current,
            teams: current.teams.map((item) => (item.id === teamId ? { ...item, score: 0, updatedAt: now } : item)),
            teamScoreHistory: [history, ...current.teamScoreHistory],
          };
        }),
      savePointAction: (action) =>
        setData((current) => ({
          ...current,
          pointActions: current.pointActions.some((item) => item.id === action.id)
            ? current.pointActions.map((item) => (item.id === action.id ? { ...action, name: action.name.trim() } : item))
            : [...current.pointActions, { ...action, name: action.name.trim(), isActive: action.isActive ?? true }],
        })),
      deletePointAction: (actionId) =>
        setData((current) => ({
          ...current,
          pointActions: current.pointActions.filter((action) => action.id !== actionId),
        })),
      applyPoints: (studentId, action, note) =>
        setData((current) => {
          const history: PointHistory = {
            id: createId("points"),
            studentId,
            actionId: action.id,
            actionName: action.name,
            points: action.points,
            source: "action",
            createdAt: new Date().toISOString(),
            note,
          };
          return {
            ...current,
            students: current.students.map((student) =>
              student.id === studentId ? { ...student, points: student.points + action.points } : student,
            ),
            pointHistory: [history, ...current.pointHistory],
          };
        }),
      saveReward: (reward) =>
        setData((current) => {
          const existing = current.rewards.find((item) => item.id === reward.id);
          const now = new Date().toISOString();
          const saved: Reward = {
            ...reward,
            name: reward.name.trim(),
            requiredPoints: Math.max(1, Math.trunc(reward.requiredPoints)),
            isActive: reward.isActive ?? true,
            createdAt: existing?.createdAt ?? reward.createdAt ?? now,
            updatedAt: now,
          };
          return {
            ...current,
            rewards: existing
              ? current.rewards.map((item) => (item.id === reward.id ? saved : item))
              : [...current.rewards, saved],
          };
        }),
      deleteReward: (rewardId) =>
        setData((current) => ({ ...current, rewards: current.rewards.filter((reward) => reward.id !== rewardId) })),
      redeemReward: (studentId, reward) => {
        const student = data.students.find((item) => item.id === studentId);
        if (!student || student.points < reward.requiredPoints) {
          return false;
        }
        setData((current) => {
          const createdAt = new Date().toISOString();
          const history: RewardHistory = {
            id: createId("reward-history"),
            studentId,
            rewardId: reward.id,
            rewardName: reward.name,
            pointsSpent: reward.requiredPoints,
            createdAt,
          };
          const pointHistory: PointHistory = {
            id: createId("points"),
            studentId,
            actionId: reward.id,
            actionName: `Đổi quà: ${reward.name}`,
            points: -reward.requiredPoints,
            source: "reward-redemption",
            createdAt,
          };
          return {
            ...current,
            students: current.students.map((item) =>
              item.id === studentId
                ? {
                    ...item,
                    points: item.points - reward.requiredPoints,
                    totalRewards: item.totalRewards + 1,
                    updatedAt: createdAt,
                  }
                : item,
            ),
            rewardHistory: [history, ...current.rewardHistory],
            pointHistory: [pointHistory, ...current.pointHistory],
          };
        });
        return true;
      },
      addRecognition: (recognition) => {
        const saved: Recognition = { ...recognition, id: createId("recognition"), createdAt: new Date().toISOString() };
        setData((current) => ({ ...current, recognitions: [saved, ...current.recognitions] }));
        return saved;
      },
      setWheelStudentBag: (bag) => setData((current) => ({ ...current, wheelStudentBag: bag })),
    }),
    [data, storageWarning],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }
  return context;
}
