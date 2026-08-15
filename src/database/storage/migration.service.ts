/**
 * IndexedDB → JSON Migration
 *
 * Runs once on first Tauri launch. Reads all existing ClassroomDatabase records
 * from IndexedDB and writes them to the Tauri JSON file storage.
 *
 * Safety guarantees:
 * - IndexedDB data is NEVER deleted (serves as backup).
 * - Migration only runs if the JSON index file does NOT already exist.
 * - If any error occurs, migration is NOT marked as complete.
 * - Migration result (ok / error) is returned to the caller.
 */

import { IndexedDbClassroomStorage } from "./indexed-db.storage";
import type { TauriFsClassroomStorage } from "./tauri-fs.storage";
import type { ClassroomDatabase } from "../types";

export interface MigrationResult {
  status: "skipped" | "completed" | "failed";
  migratedCount?: number;
  error?: string;
}

export async function migrateIndexedDbToJson(
  tauriStorage: TauriFsClassroomStorage,
): Promise<MigrationResult> {
  const alreadyInitialized = await tauriStorage.isInitialized();
  if (alreadyInitialized) {
    return { status: "skipped" };
  }

  try {
    const indexedDb = new IndexedDbClassroomStorage();
    const summaries = await indexedDb.list();

    if (summaries.length === 0) {
      await tauriStorage.ensureEmptyIndex();
      return { status: "completed", migratedCount: 0 };
    }

    const migrated: ClassroomDatabase[] = [];
    for (const summary of summaries) {
      const db = await indexedDb.load(summary.id);
      if (db) {
        migrated.push(db);
      }
    }

    for (const db of migrated) {
      await tauriStorage.save(db);
    }

    for (const db of migrated) {
      const loaded = await tauriStorage.load(db.metadata.id);
      if (!loaded) {
        throw new Error(`Verification failed: database ${db.metadata.id} could not be read back.`);
      }
      if (loaded.metadata.id !== db.metadata.id) {
        throw new Error(`Verification failed: ID mismatch for ${db.metadata.id}.`);
      }
    }

    console.log(`[Migration] Successfully migrated ${migrated.length} classroom(s) from IndexedDB to JSON files.`);
    return { status: "completed", migratedCount: migrated.length };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Migration] Failed:", message);
    return { status: "failed", error: message };
  }
}
