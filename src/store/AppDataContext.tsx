import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultData } from "./defaultData";
import type {
  AppData,
  Classroom,
  PointAction,
  PointHistory,
  Recognition,
  Reward,
  RewardHistory,
  Student,
  Team,
} from "../types/models";
import { createId } from "../utils/id";

const STORAGE_KEY = "chibi-classroom-data";

interface AppDataContextValue {
  data: AppData;
  updateClassroom: (classroom: Classroom) => void;
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

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultData;
    }
    return { ...defaultData, ...JSON.parse(raw) } as AppData;
  } catch {
    return defaultData;
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(loadData);

  const setData = (updater: (current: AppData) => AppData) => {
    setDataState((current) => {
      const next = updater(current);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      updateClassroom: (classroom) => setData((current) => ({ ...current, classroom })),
      saveStudent: (student) =>
        setData((current) => ({
          ...current,
          students: current.students.some((item) => item.id === student.id)
            ? current.students.map((item) => (item.id === student.id ? student : item))
            : [...current.students, student],
        })),
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
        setData((current) => ({
          ...current,
          teams: current.teams.some((item) => item.id === team.id)
            ? current.teams.map((item) => (item.id === team.id ? team : item))
            : [...current.teams, team],
        })),
      deleteTeam: (teamId) =>
        setData((current) => ({
          ...current,
          teams: current.teams.filter((team) => team.id !== teamId),
          students: current.students.map((student) =>
            student.teamId === teamId ? { ...student, teamId: undefined } : student,
          ),
        })),
      updateTeamScore: (teamId, delta) =>
        setData((current) => ({
          ...current,
          teams: current.teams.map((team) =>
            team.id === teamId ? { ...team, score: team.score + delta } : team,
          ),
        })),
      resetTeamScore: (teamId) =>
        setData((current) => ({
          ...current,
          teams: current.teams.map((team) => (team.id === teamId ? { ...team, score: 0 } : team)),
        })),
      savePointAction: (action) =>
        setData((current) => ({
          ...current,
          pointActions: current.pointActions.some((item) => item.id === action.id)
            ? current.pointActions.map((item) => (item.id === action.id ? action : item))
            : [...current.pointActions, action],
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
        setData((current) => ({
          ...current,
          rewards: current.rewards.some((item) => item.id === reward.id)
            ? current.rewards.map((item) => (item.id === reward.id ? reward : item))
            : [...current.rewards, reward],
        })),
      deleteReward: (rewardId) =>
        setData((current) => ({ ...current, rewards: current.rewards.filter((reward) => reward.id !== rewardId) })),
      redeemReward: (studentId, reward) => {
        const student = data.students.find((item) => item.id === studentId);
        if (!student || student.points < reward.requiredPoints) {
          return false;
        }
        setData((current) => {
          const history: RewardHistory = {
            id: createId("reward-history"),
            studentId,
            rewardId: reward.id,
            rewardName: reward.name,
            pointsSpent: reward.requiredPoints,
            createdAt: new Date().toISOString(),
          };
          return {
            ...current,
            students: current.students.map((item) =>
              item.id === studentId
                ? {
                    ...item,
                    points: item.points - reward.requiredPoints,
                    totalRewards: (item.totalRewards ?? 0) + 1,
                  }
                : item,
            ),
            rewardHistory: [history, ...current.rewardHistory],
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
    [data],
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
