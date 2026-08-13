import { createId } from "../utils/id";
import { defaultData } from "../store/defaultData";
import { generateDatabaseId } from "./database.utils";
import type { ClassroomDatabase } from "./types";
import type { ClassroomSettings } from "../types/models";

export const DATABASE_VERSION = 1;

export function createEmptyDatabase(
  settings: Omit<ClassroomSettings, "id" | "createdAt" | "updatedAt">
): ClassroomDatabase {
  const now = new Date().toISOString();
  
  const id = generateDatabaseId(settings.className, settings.schoolYear);
  
  const classroom: ClassroomSettings = {
    ...settings,
    id: createId("classroom"),
    createdAt: now,
    updatedAt: now,
  };

  return {
    metadata: {
      id,
      version: DATABASE_VERSION,
      createdAt: now,
      updatedAt: now,
    },
    classroomSettings: classroom,
    students: [],
    teams: [],
    pointActions: defaultData.pointActions,
    pointHistory: [],
    rewards: [],
    rewardHistory: [],
    recognitions: [],
    luckyWheelHistory: [],
    wheelStudentBag: [],
    teamScoreHistory: [],
    appSettings: {
      soundEnabled: true,
      animationsEnabled: true,
    },
  };
}
