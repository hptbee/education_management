"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  Badge,
  ClassroomRole,
  ClassroomSettings,
  PointAction,
  PointHistory,
  PointHistorySource,
  Recognition,
  RecognitionTitle,
  Gift,
  Student,
  TeacherProfile,
  Team,
  TeamScoreHistory,
  AppSettings,
} from "../types/models";
import { createId } from "../utils/id";
import {
  clearStudentLeadershipFromTeams,
  sanitizeAllTeamLeadership,
  sanitizeTeamLeadership,
} from "../utils/classroomRoles";
import type { ClassroomDatabase } from "../database/types";
import { databaseService } from "../database/database.service";
import { buildRecognizeStudentsUpdate, ensureBadgeForTitle, type RecognizeStudentsInput } from "../utils/recognition";
import { capHistory } from "../utils/historyLimits";
import { classroomAssetService } from "../database/assets/classroom-asset.service";
import { normalizeGift, buildRedeemGiftUpdate } from "../utils/gifts";
import {
  clearLastClassroomId,
  setLastClassroomId,
} from "../utils/lastClassroom";
import { backupMetadataService } from "../database/backup/backup-metadata.service";
import {
  cloudBackupScheduler,
  type CloudBackupState,
} from "../database/backup/cloud-backup.service";
import { toastError, toastSuccess } from "../utils/toast";

export type { RecognizeStudentsInput };

export type LocalSaveStatus = "saved" | "saving" | "error";

interface AppDataContextValue {
  data: ClassroomDatabase | null;
  isLoading: boolean;
  initError: string | null;
  saveError: string | null;
  localSaveStatus: LocalSaveStatus;
  cloudBackupState: CloudBackupState;
  clearSaveError: () => void;
  retrySave: () => Promise<void>;
  retryInit: () => Promise<void>;
  switchDatabase: (id: string) => Promise<void>;
  closeDatabase: () => Promise<void>;
  createDatabase: (settings: Omit<ClassroomSettings, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  importDatabase: (file: File) => Promise<void>;
  renameDatabase: (newClassName: string, newSchoolYear: string) => Promise<void>;
  duplicateDatabase: (newClassName: string, newSchoolYear: string, mode: "settings-only" | "full-copy") => Promise<void>;
  deleteDatabase: (id: string) => Promise<void>;
  updateClassroomSettings: (settings: ClassroomSettings) => void;
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  updateTeacherProfile: (teacher: Partial<Omit<TeacherProfile, "id" | "createdAt" | "updatedAt">>) => void;
  saveClassroomRole: (role: ClassroomRole) => void;
  deleteClassroomRole: (roleId: string) => void;
  saveBadge: (badge: Badge) => void;
  deleteBadge: (badgeId: string) => void;
  toggleStudentBadge: (studentId: string, badgeId: string) => void;
  saveStudent: (student: Student) => void;
  saveStudents: (students: Student[]) => void;
  deleteStudent: (studentId: string) => void;
  saveTeam: (team: Team) => void;
  deleteTeam: (teamId: string) => void;
  updateTeamScore: (teamId: string, delta: number, note?: string) => void;
  resetTeamScore: (teamId: string) => void;
  savePointAction: (action: PointAction) => void;
  deletePointAction: (actionId: string) => void;
  applyPoints: (
    studentId: string,
    action: PointAction,
    note?: string,
    source?: PointHistorySource,
  ) => void;
  saveGift: (gift: Gift, options?: { previousImagePath?: string }) => Promise<void>;
  deleteGift: (giftId: string) => Promise<void>;
  redeemGift: (studentId: string, giftId: string) => boolean;
  saveRecognitionTitle: (title: RecognitionTitle) => void;
  deleteRecognitionTitle: (titleId: string) => void;
  recognizeStudents: (input: RecognizeStudentsInput) => Recognition[];
  updateRecognitionMessage: (recognitionId: string, message: string) => void;
  deleteRecognition: (recognitionId: string) => void;
  addRecognition: (recognition: Omit<Recognition, "id" | "createdAt">) => Recognition;
  setWheelStudentBag: (bag: string[]) => void;
  recordLuckyWheelSelection: (studentIds: string[]) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const SAVE_DEBOUNCE_MS = 400;
const SAVE_BACKOFF_MS = [1000, 2000, 5000];
const MAX_AUTO_SAVE_ATTEMPTS = 3;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<ClassroomDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [localSaveStatus, setLocalSaveStatus] = useState<LocalSaveStatus>("saved");
  const [cloudBackupState, setCloudBackupState] = useState<CloudBackupState>("disabled");
  const dataRef = useRef<ClassroomDatabase | null>(null);
  const lastPersistedRef = useRef<ClassroomDatabase | null>(null);
  const saveGenerationRef = useRef(0);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<ClassroomDatabase | null>(null);
  const saveInFlightRef = useRef(false);
  const saveFailureCountRef = useRef(0);
  const saveRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveError = () => setSaveError(null);

  const prevCloudBackupRef = useRef<CloudBackupState>("disabled");

  useEffect(() => {
    const unsubscribe = cloudBackupScheduler.subscribe((state, error) => {
      const prev = prevCloudBackupRef.current;
      if (state === "synced" && prev !== "synced") {
        toastSuccess("Đã sao lưu đám mây thành công");
      } else if (state === "failed" && prev !== "failed") {
        toastError(error ?? "Sao lưu đám mây thất bại");
      }
      prevCloudBackupRef.current = state;
      setCloudBackupState(state);
    });
    cloudBackupScheduler.startPeriodicRetry();
    return () => {
      unsubscribe();
      cloudBackupScheduler.stop();
    };
  }, []);

  const applyLoadedDatabase = useCallback((db: ClassroomDatabase | null) => {
    setDataState(db);
    dataRef.current = db;
    lastPersistedRef.current = db;
    if (db) {
      setLastClassroomId(db.metadata.id);
    } else {
      clearLastClassroomId();
    }
  }, []);

  const loadInitialDatabase = useCallback(async () => {
    setIsLoading(true);
    setInitError(null);
    try {
      await databaseService.initializeAndMigrate();
      const databases = await databaseService.listDatabases();
      if (databases.length > 0) {
        const preferredId = await databaseService.getPreferredClassroomId();
        const preferred = preferredId ? databases.find((item) => item.id === preferredId) : undefined;
        const targetId = preferred?.id ?? databases[0].id;
        const db = await databaseService.openDatabase(targetId);
        applyLoadedDatabase(db);
        if (db) {
          await cloudBackupScheduler.checkStartupBackup(db);
        }
      } else {
        applyLoadedDatabase(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể khởi tạo dữ liệu lớp học.";
      console.error("[AppDataProvider] init failed:", error);
      setInitError(message);
      applyLoadedDatabase(null);
    } finally {
      setIsLoading(false);
    }
  }, [applyLoadedDatabase]);

  useEffect(() => {
    void loadInitialDatabase();
  }, [loadInitialDatabase]);

  const flushSave = useCallback(async (): Promise<boolean> => {
    if (saveInFlightRef.current) return false;

    const next = pendingSaveRef.current ?? dataRef.current;
    if (!next) return true;

    pendingSaveRef.current = null;
    saveInFlightRef.current = true;
    const generation = ++saveGenerationRef.current;
    const payload = next;
    setLocalSaveStatus("saving");

    try {
      const saved = await databaseService.saveDatabase(payload);
      if (generation !== saveGenerationRef.current) return true;

      lastPersistedRef.current = saved;
      setLocalSaveStatus("saved");
      setSaveError(null);
      saveFailureCountRef.current = 0;
      if (saveRetryTimerRef.current) {
        clearTimeout(saveRetryTimerRef.current);
        saveRetryTimerRef.current = null;
      }
      try {
        await backupMetadataService.recordLocalSave(saved.metadata.id, saved.metadata.updatedAt);
      } catch (error) {
        console.warn("[AppDataProvider] backup metadata failed:", error);
      }
      cloudBackupScheduler.scheduleAfterLocalSave(saved);
      return true;
    } catch (error) {
      if (generation !== saveGenerationRef.current) {
        console.warn("[AppDataProvider] ignored stale save failure:", error);
        return true;
      }

      const message =
        error instanceof Error ? error.message : "Không thể lưu dữ liệu. Vui lòng thử lại.";
      console.error("[AppDataProvider] save failed:", error);
      setLocalSaveStatus("error");
      setSaveError(message);
      saveFailureCountRef.current += 1;
      if (!pendingSaveRef.current) {
        pendingSaveRef.current = payload;
      }
      return false;
    } finally {
      saveInFlightRef.current = false;
      if (pendingSaveRef.current) {
        if (saveFailureCountRef.current === 0) {
          void flushSave();
        } else if (saveFailureCountRef.current < MAX_AUTO_SAVE_ATTEMPTS) {
          const delay = SAVE_BACKOFF_MS[Math.min(saveFailureCountRef.current - 1, SAVE_BACKOFF_MS.length - 1)];
          if (saveRetryTimerRef.current) clearTimeout(saveRetryTimerRef.current);
          saveRetryTimerRef.current = setTimeout(() => {
            saveRetryTimerRef.current = null;
            void flushSave();
          }, delay);
        }
      }
    }
  }, []);

  const persistNow = useCallback(async (): Promise<boolean> => {
    if (!dataRef.current) return true;

    pendingSaveRef.current = dataRef.current;
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }

    for (;;) {
      if (saveInFlightRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        continue;
      }
      if (!pendingSaveRef.current && !dataRef.current) return true;
      pendingSaveRef.current = dataRef.current;
      const ok = await flushSave();
      if (!ok) return false;
      if (!pendingSaveRef.current) return true;
    }
  }, [flushSave]);

  const scheduleSave = useCallback(() => {
    pendingSaveRef.current = dataRef.current;
    setLocalSaveStatus("saving");
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      saveDebounceRef.current = null;
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  const retrySave = useCallback(async () => {
    if (!dataRef.current) return;
    saveFailureCountRef.current = 0;
    if (saveRetryTimerRef.current) {
      clearTimeout(saveRetryTimerRef.current);
      saveRetryTimerRef.current = null;
    }
    pendingSaveRef.current = dataRef.current;
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    if (saveInFlightRef.current) return;
    await flushSave();
  }, [flushSave]);

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState === "hidden") {
        void persistNow();
      }
    };
    const flushOnUnload = () => {
      void persistNow();
    };

    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("beforeunload", flushOnUnload);

    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("beforeunload", flushOnUnload);
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
      void persistNow();
    };
  }, [persistNow]);

  const commitData = useCallback(
    (next: ClassroomDatabase) => {
      setDataState(next);
      dataRef.current = next;
      scheduleSave();
    },
    [scheduleSave],
  );

  const setData = useCallback(
    (updater: (current: ClassroomDatabase) => ClassroomDatabase) => {
      const current = dataRef.current;
      if (!current) return;
      const next = updater(current);
      if (next === current) return;
      commitData(next);
    },
    [commitData],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      isLoading,
      initError,
      saveError,
      localSaveStatus,
      cloudBackupState,
      clearSaveError,
      retrySave,
      retryInit: loadInitialDatabase,
      switchDatabase: async (id: string) => {
        setIsLoading(true);
        try {
          const persisted = await persistNow();
          if (!persisted) return;
          const db = await databaseService.openDatabase(id);
          if (!db) {
            setSaveError("Không thể mở lớp học. Dữ liệu có thể bị hỏng hoặc đã bị xóa.");
            return;
          }
          applyLoadedDatabase(db);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Không thể chuyển lớp học.";
          console.error("[AppDataProvider] switchDatabase failed:", error);
          setSaveError(message);
        } finally {
          setIsLoading(false);
        }
      },
      closeDatabase: async () => {
        const persisted = await persistNow();
        if (!persisted) return;
        try {
          await databaseService.closeDatabase();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Không thể đóng lớp học.";
          console.error("[AppDataProvider] closeDatabase failed:", error);
          setSaveError(message);
          return;
        }
        applyLoadedDatabase(null);
      },
      createDatabase: async (settings) => {
        setIsLoading(true);
        try {
          const db = await databaseService.createDatabase(settings);
          applyLoadedDatabase(db);
        } finally {
          setIsLoading(false);
        }
      },
      importDatabase: async (file) => {
        setIsLoading(true);
        try {
          const db = await databaseService.importDatabase(file);
          applyLoadedDatabase(db);
        } finally {
          setIsLoading(false);
        }
      },
      renameDatabase: async (newClassName, newSchoolYear) => {
        if (!data) return;
        setIsLoading(true);
        try {
          const persisted = await persistNow();
          if (!persisted) {
            throw new Error("Không thể lưu dữ liệu. Vui lòng thử lại.");
          }
          const db = await databaseService.renameClassroomDatabase(
            data.metadata.id,
            newClassName,
            newSchoolYear,
          );
          applyLoadedDatabase(db);
        } finally {
          setIsLoading(false);
        }
      },
      duplicateDatabase: async (newClassName, newSchoolYear, mode) => {
        if (!data) return;
        setIsLoading(true);
        try {
          const persisted = await persistNow();
          if (!persisted) {
            throw new Error("Không thể lưu dữ liệu. Vui lòng thử lại.");
          }
          const db = await databaseService.duplicateDatabase(
            data.metadata.id,
            newClassName,
            newSchoolYear,
            mode,
          );
          applyLoadedDatabase(db);
        } finally {
          setIsLoading(false);
        }
      },
      deleteDatabase: async (id) => {
        setIsLoading(true);
        try {
          if (data?.metadata.id === id) {
            const persisted = await persistNow();
            if (!persisted) return;
          }
          await databaseService.deleteDatabase(id);
          if (data?.metadata.id === id) {
            applyLoadedDatabase(null);
          }
        } finally {
          setIsLoading(false);
        }
      },
      updateClassroomSettings: (settings) =>
        setData((current) => ({
          ...current,
          classroomSettings: { ...settings, updatedAt: new Date().toISOString() },
        })),
      updateAppSettings: (updates) =>
        setData((current) => ({
          ...current,
          appSettings: { ...current.appSettings, ...updates },
        })),
      updateTeacherProfile: (teacherUpdates) =>
        setData((current) => ({
          ...current,
          classroomSettings: {
            ...current.classroomSettings,
            teacher: {
              ...current.classroomSettings.teacher,
              ...teacherUpdates,
              updatedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          },
        })),
      saveClassroomRole: (role) =>
        setData((current) => {
          const existing = current.classroomRoles.find((item) => item.id === role.id);
          const saved: ClassroomRole = {
            ...role,
            name: role.name.trim(),
            createdAt: existing?.createdAt ?? role.createdAt ?? new Date().toISOString(),
          };
          return {
            ...current,
            classroomRoles: existing
              ? current.classroomRoles.map((item) => (item.id === role.id ? saved : item))
              : [...current.classroomRoles, saved],
          };
        }),
      deleteClassroomRole: (roleId) =>
        setData((current) => ({
          ...current,
          classroomRoles: current.classroomRoles.filter((role) => role.id !== roleId),
          students: current.students.map((student) => ({
            ...student,
            classroomRoleIds: (student.classroomRoleIds ?? []).filter((id) => id !== roleId),
          })),
        })),
      saveBadge: (badge) =>
        setData((current) => {
          const existing = current.badges.find((item) => item.id === badge.id);
          const saved: Badge = {
            ...badge,
            name: badge.name.trim(),
            createdAt: existing?.createdAt ?? badge.createdAt ?? new Date().toISOString(),
          };
          return {
            ...current,
            badges: existing
              ? current.badges.map((item) => (item.id === badge.id ? saved : item))
              : [...current.badges, saved],
          };
        }),
      deleteBadge: (badgeId) =>
        setData((current) => ({
          ...current,
          badges: current.badges.filter((badge) => badge.id !== badgeId),
          students: current.students.map((student) => ({
            ...student,
            badgeIds: (student.badgeIds ?? []).filter((id) => id !== badgeId),
          })),
        })),
      toggleStudentBadge: (studentId, badgeId) =>
        setData((current) => {
          const student = current.students.find((item) => item.id === studentId);
          if (!student) return current;

          const currentIds = student.badgeIds ?? [];
          const hasBadge = currentIds.includes(badgeId);
          const now = new Date().toISOString();

          if (hasBadge) {
            return {
              ...current,
              students: current.students.map((item) =>
                item.id === studentId
                  ? {
                      ...item,
                      badgeIds: currentIds.filter((id) => id !== badgeId),
                      updatedAt: now,
                    }
                  : item,
              ),
            };
          }

          const badge = current.badges.find((item) => item.id === badgeId);
          const historyEntry = {
            id: createId("badge-award"),
            badgeId,
            badgeName: badge?.name ?? "Huy hiệu",
            badgeIcon: badge?.icon,
            studentIds: [studentId],
            createdAt: now,
          };

          return {
            ...current,
            students: current.students.map((item) =>
              item.id === studentId
                ? { ...item, badgeIds: [...currentIds, badgeId], updatedAt: now }
                : item,
            ),
            badgeAwardHistory: capHistory([historyEntry, ...(current.badgeAwardHistory ?? [])]),
          };
        }),
      saveStudent: (student) =>
        setData((current) => {
          const existing = current.students.find((item) => item.id === student.id);
          const now = new Date().toISOString();
          const saved: Student = {
            ...student,
            name: student.name.trim(),
            classroomRole: undefined,
            classroomRoleIds: student.classroomRoleIds ?? existing?.classroomRoleIds ?? [],
            badgeIds: student.badgeIds ?? existing?.badgeIds ?? [],
            points: existing?.points ?? student.points,
            totalRewards: existing?.totalRewards ?? student.totalRewards,
            createdAt: existing?.createdAt ?? student.createdAt ?? now,
            updatedAt: now,
          };

          let students = existing
            ? current.students.map((item) => (item.id === student.id ? saved : item))
            : [...current.students, saved];

          let teams = current.teams;
          if (existing?.teamId !== saved.teamId) {
            teams = clearStudentLeadershipFromTeams(teams, saved.id);
          }
          teams = sanitizeAllTeamLeadership(teams, students);

          return { ...current, students, teams };
        }),
      saveStudents: (studentsToSave) =>
        setData((current) => {
          if (studentsToSave.length === 0) return current;

          const now = new Date().toISOString();
          const byId = new Map(studentsToSave.map((student) => [student.id, student]));
          let leadershipChanged = false;

          let students = current.students.map((item) => {
            const incoming = byId.get(item.id);
            if (!incoming) return item;

            const saved: Student = {
              ...incoming,
              name: incoming.name.trim(),
              classroomRoleIds: incoming.classroomRoleIds ?? item.classroomRoleIds ?? [],
              badgeIds: incoming.badgeIds ?? item.badgeIds ?? [],
              points: item.points,
              totalRewards: item.totalRewards,
              createdAt: item.createdAt,
              updatedAt: now,
            };

            if (item.teamId !== saved.teamId) {
              leadershipChanged = true;
            }
            return saved;
          });

          for (const student of studentsToSave) {
            if (!current.students.some((item) => item.id === student.id)) {
              const saved: Student = {
                ...student,
                name: student.name.trim(),
                classroomRoleIds: student.classroomRoleIds ?? [],
                badgeIds: student.badgeIds ?? [],
                points: student.points ?? 0,
                totalRewards: student.totalRewards ?? 0,
                createdAt: student.createdAt ?? now,
                updatedAt: now,
              };
              students = [...students, saved];
            }
          }

          let teams = current.teams;
          if (leadershipChanged) {
            for (const student of studentsToSave) {
              teams = clearStudentLeadershipFromTeams(teams, student.id);
            }
          }
          teams = sanitizeAllTeamLeadership(teams, students);

          return { ...current, students, teams };
        }),
      deleteStudent: (studentId) =>
        setData((current) => {
          const luckyWheelHistory = (current.luckyWheelHistory ?? [])
            .map((entry) => {
              const ids = entry.studentIds?.length ? entry.studentIds : [entry.studentId];
              const remainingIds = ids.filter((id) => id !== studentId);
              if (remainingIds.length === 0) return null;
              return {
                ...entry,
                studentId: remainingIds[0],
                studentIds: remainingIds,
              };
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

          const badgeAwardHistory = (current.badgeAwardHistory ?? [])
            .map((entry) => {
              const remainingIds = entry.studentIds.filter((id) => id !== studentId);
              if (remainingIds.length === 0) return null;
              return { ...entry, studentIds: remainingIds };
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

          return {
            ...current,
            students: current.students.filter((student) => student.id !== studentId),
            teams: clearStudentLeadershipFromTeams(current.teams, studentId),
            pointHistory: current.pointHistory.filter((item) => item.studentId !== studentId),
            rewardHistory: current.rewardHistory.filter((item) => item.studentId !== studentId),
            recognitions: current.recognitions.filter((item) => item.studentId !== studentId),
            luckyWheelHistory,
            badgeAwardHistory,
            wheelStudentBag: current.wheelStudentBag.filter((id) => id !== studentId),
          };
        }),
      saveTeam: (team) =>
        setData((current) => {
          const existing = current.teams.find((item) => item.id === team.id);
          const now = new Date().toISOString();
          const memberIds = new Set(
            current.students.filter((student) => student.teamId === team.id).map((student) => student.id),
          );
          const saved = sanitizeTeamLeadership(
            {
              ...team,
              name: team.name.trim(),
              createdAt: existing?.createdAt ?? team.createdAt ?? now,
              updatedAt: now,
            },
            memberIds,
          );
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
          teamScoreHistory: current.teamScoreHistory.filter((item) => item.teamId !== teamId),
        })),
      updateTeamScore: (teamId, delta, note) =>
        setData((current) => {
          const history: TeamScoreHistory = {
            id: createId("team-score"),
            teamId,
            points: delta,
            actionName: delta > 0 ? "Cộng điểm tổ" : "Trừ điểm tổ",
            createdAt: new Date().toISOString(),
            note,
          };
          return {
            ...current,
            teams: current.teams.map((team) =>
              team.id === teamId ? { ...team, score: team.score + delta, updatedAt: history.createdAt } : team,
            ),
            teamScoreHistory: capHistory([history, ...current.teamScoreHistory]),
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
            teamScoreHistory: capHistory([history, ...current.teamScoreHistory]),
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
      applyPoints: (studentId, action, note, source = "action") =>
        setData((current) => {
          const now = new Date().toISOString();
          const history: PointHistory = {
            id: createId("points"),
            studentId,
            actionId: action.id,
            actionName: action.name,
            points: action.points,
            source,
            createdAt: now,
            note,
          };
          return {
            ...current,
            students: current.students.map((student) =>
              student.id === studentId
                ? { ...student, points: student.points + action.points, updatedAt: now }
                : student,
            ),
            pointHistory: capHistory([history, ...current.pointHistory]),
          };
        }),
      saveGift: async (gift, options) => {
        const current = dataRef.current;
        if (!current) return;
        const existing = current.rewards.find((item) => item.id === gift.id);
        const previousImagePath =
          options?.previousImagePath ??
          (existing?.imagePath && existing.imagePath !== gift.imagePath ? existing.imagePath : undefined);
        const classroomId = current.metadata.id;
        const now = new Date().toISOString();
        const saved = normalizeGift({
          ...gift,
          createdAt: existing?.createdAt ?? gift.createdAt ?? now,
          updatedAt: now,
        });
        const next: ClassroomDatabase = {
          ...current,
          rewards: existing
            ? current.rewards.map((item) => (item.id === gift.id ? saved : item))
            : [...current.rewards, saved],
          metadata: { ...current.metadata, updatedAt: now },
        };

        commitData(next);
        const persisted = await persistNow();
        if (!persisted) {
          throw new Error("Không thể lưu dữ liệu. Vui lòng thử lại.");
        }
        if (previousImagePath && previousImagePath !== gift.imagePath) {
          try {
            await classroomAssetService.deleteGiftImage(classroomId, previousImagePath);
          } catch (error) {
            console.warn("[saveGift] failed to remove replaced image file", error);
          }
        }
      },
      deleteGift: async (giftId) => {
        const current = dataRef.current;
        if (!current) return;
        const gift = current.rewards.find((item) => item.id === giftId);
        const classroomId = current.metadata.id;
        const now = new Date().toISOString();
        const next: ClassroomDatabase = {
          ...current,
          rewards: current.rewards.filter((item) => item.id !== giftId),
          metadata: { ...current.metadata, updatedAt: now },
        };

        commitData(next);
        const persisted = await persistNow();
        if (!persisted) {
          throw new Error("Không thể lưu dữ liệu. Vui lòng thử lại.");
        }
        if (!gift?.imagePath) return;

        try {
          await classroomAssetService.deleteGiftImage(classroomId, gift.imagePath);
        } catch (error) {
          console.warn("[deleteGift] failed to remove image file", error);
        }
      },
      redeemGift: (studentId, giftId) => {
        const current = dataRef.current;
        if (!current) return false;
        const result = buildRedeemGiftUpdate(current, studentId, giftId);
        if ("error" in result) return false;
        setData(() => result.next);
        return true;
      },
      saveRecognitionTitle: (title) =>
        setData((current) => {
          const existing = current.recognitionTitles.find((item) => item.id === title.id);
          const now = new Date().toISOString();
          const draft: RecognitionTitle = {
            ...title,
            name: title.name.trim(),
            isActive: title.isActive ?? true,
            createdAt: existing?.createdAt ?? title.createdAt ?? now,
          };
          const { title: linkedTitle, badges } = ensureBadgeForTitle(draft, current.badges);
          return {
            ...current,
            badges,
            recognitionTitles: existing
              ? current.recognitionTitles.map((item) => (item.id === title.id ? linkedTitle : item))
              : [...current.recognitionTitles, linkedTitle],
          };
        }),
      deleteRecognitionTitle: (titleId) =>
        setData((current) => {
          const hasHistory = current.recognitions.some((item) => item.titleId === titleId);
          if (hasHistory) {
            return {
              ...current,
              recognitionTitles: current.recognitionTitles.map((title) =>
                title.id === titleId ? { ...title, isActive: false } : title,
              ),
            };
          }
          return {
            ...current,
            recognitionTitles: current.recognitionTitles.filter((title) => title.id !== titleId),
          };
        }),
      recognizeStudents: (input) => {
        let created: Recognition[] = [];
        setData((current) => {
          const result = buildRecognizeStudentsUpdate(current, input);
          if (!result) return current;
          created = result.created;
          return {
            ...result.next,
            pointHistory: capHistory(result.next.pointHistory),
            recognitions: capHistory(result.next.recognitions),
            badgeAwardHistory: capHistory(result.next.badgeAwardHistory ?? []),
          };
        });
        return created;
      },
      updateRecognitionMessage: (recognitionId, message) =>
        setData((current) => {
          const recognition = current.recognitions.find((item) => item.id === recognitionId);
          const trimmed = message.trim() || undefined;
          return {
            ...current,
            recognitions: current.recognitions.map((item) =>
              item.id === recognitionId ? { ...item, message: trimmed } : item,
            ),
            pointHistory: recognition?.pointHistoryId
              ? current.pointHistory.map((item) =>
                  item.id === recognition.pointHistoryId ? { ...item, note: trimmed } : item,
                )
              : current.pointHistory,
          };
        }),
      deleteRecognition: (recognitionId) =>
        setData((current) => {
          const recognition = current.recognitions.find((item) => item.id === recognitionId);
          if (!recognition) return current;

          let students = current.students;
          let pointHistory = current.pointHistory;

          if (recognition.pointHistoryId && recognition.awardedPoints && recognition.awardedPoints > 0) {
            const original = current.pointHistory.find((h) => h.id === recognition.pointHistoryId);
            if (original) {
              const now = new Date().toISOString();
              const reversal: PointHistory = {
                id: createId("points"),
                studentId: recognition.studentId,
                actionName: `Hoàn tác tuyên dương - ${recognition.title}`,
                points: -recognition.awardedPoints,
                source: "recognition",
                createdAt: now,
                note: "Xóa bản ghi tuyên dương",
              };
              students = students.map((s) =>
                s.id === recognition.studentId
                  ? { ...s, points: s.points - recognition.awardedPoints!, updatedAt: now }
                  : s,
              );
              pointHistory = capHistory([reversal, ...pointHistory]);
            }
          }

          if (recognition.awardedBadgeId) {
            const now = new Date().toISOString();
            students = students.map((s) =>
              s.id === recognition.studentId
                ? {
                    ...s,
                    badgeIds: (s.badgeIds ?? []).filter((id) => id !== recognition.awardedBadgeId),
                    updatedAt: now,
                  }
                : s,
            );
          }

          return {
            ...current,
            students,
            pointHistory,
            recognitions: current.recognitions.filter((item) => item.id !== recognitionId),
          };
        }),
      addRecognition: (recognition) => {
        const saved: Recognition = { ...recognition, id: createId("recognition"), createdAt: new Date().toISOString() };
        setData((current) => ({
          ...current,
          recognitions: capHistory([saved, ...current.recognitions]),
        }));
        return saved;
      },
      setWheelStudentBag: (bag) => setData((current) => ({ ...current, wheelStudentBag: bag })),
      recordLuckyWheelSelection: (studentIds) => {
        const uniqueIds = [...new Set(studentIds)].filter(Boolean);
        if (uniqueIds.length === 0) return;
        setData((current) => {
          const now = new Date().toISOString();
          const entry = {
            id: createId("wheel"),
            studentId: uniqueIds[0],
            studentIds: uniqueIds,
            createdAt: now,
          };
          return {
            ...current,
            luckyWheelHistory: capHistory([entry, ...(current.luckyWheelHistory ?? [])]),
          };
        });
      },
    }),
    [data, isLoading, initError, saveError, localSaveStatus, cloudBackupState, loadInitialDatabase, applyLoadedDatabase, setData, commitData, retrySave, persistNow],
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
