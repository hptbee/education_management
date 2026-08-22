import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { ClassroomDatabase } from "../database/types";
import { databaseService } from "../database/database.service";
import { backupMetadataService } from "../database/backup/backup-metadata.service";
import { cloudBackupScheduler } from "../database/backup/cloud-backup.service";
import { logAppEvent } from "../logging/app-log";

export type LocalSaveStatus = "saved" | "saving" | "error";

const SAVE_DEBOUNCE_MS = 400;
const SAVE_BACKOFF_MS = [1000, 2000, 5000];
const MAX_AUTO_SAVE_ATTEMPTS = 3;

export interface AppDataAutosaveOptions {
  dataRef: RefObject<ClassroomDatabase | null>;
  setLocalSaveStatus: (status: LocalSaveStatus) => void;
  setSaveError: (message: string | null) => void;
}

export function useAppDataAutosave({
  dataRef,
  setLocalSaveStatus,
  setSaveError,
}: AppDataAutosaveOptions) {
  const lastPersistedRef = useRef<ClassroomDatabase | null>(null);
  const saveGenerationRef = useRef(0);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<ClassroomDatabase | null>(null);
  const saveInFlightRef = useRef(false);
  const saveFailureCountRef = useRef(0);
  const saveRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      logAppEvent("error", "app-data.save", message, error);
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
  }, [dataRef, setLocalSaveStatus, setSaveError]);

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
      if (!ok) {
        if (saveInFlightRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          continue;
        }
        return false;
      }
      if (!pendingSaveRef.current) return true;
    }
  }, [dataRef, flushSave]);

  const scheduleSave = useCallback(() => {
    pendingSaveRef.current = dataRef.current;
    setLocalSaveStatus("saving");
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      saveDebounceRef.current = null;
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [dataRef, flushSave, setLocalSaveStatus]);

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
  }, [dataRef, flushSave]);

  const cancelPendingSaveForClassroom = useCallback((classroomId: string) => {
    saveGenerationRef.current += 1;
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    const pending = pendingSaveRef.current;
    if (pending && pending.metadata.id === classroomId) {
      pendingSaveRef.current = null;
    }
  }, []);

  const setLastPersisted = useCallback((db: ClassroomDatabase | null) => {
    lastPersistedRef.current = db;
  }, []);

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

  return {
    lastPersistedRef,
    pendingSaveRef,
    saveGenerationRef,
    saveDebounceRef,
    flushSave,
    persistNow,
    scheduleSave,
    retrySave,
    cancelPendingSaveForClassroom,
    setLastPersisted,
  };
}
