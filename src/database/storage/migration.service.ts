/**
 * IndexedDB → JSON Migration
 *
 * Runs once on first Tauri launch. Reads all existing ClassroomDatabase records
 * from IndexedDB and writes them to the Tauri JSON file storage.
 *
 * Safety guarantees:
 * - IndexedDB data is NEVER deleted (serves as backup).
 * - Migration resumes until `indexeddb-migration.complete` is written.
 * - Existing JSON classrooms are never overwritten.
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
  if (await tauriStorage.isMigrationComplete?.()) {
    return { status: "skipped" };
  }

  try {
    const indexedDb = new IndexedDbClassroomStorage();
    const summaries = await indexedDb.list();

    if (summaries.length === 0) {
      await tauriStorage.ensureEmptyIndex();
      await tauriStorage.markMigrationComplete?.();
      return { status: "completed", migratedCount: 0 };
    }

    const migrated: ClassroomDatabase[] = [];
    for (const summary of summaries) {
      const existing = await tauriStorage.load(summary.id);
      if (existing) continue;

      const db = await indexedDb.load(summary.id);
      if (!db) continue;

      await tauriStorage.save(db);
      migrated.push(db);
    }

    for (const summary of summaries) {
      const loaded = await tauriStorage.load(summary.id);
      if (!loaded) {
        throw new Error(`Verification failed: database ${summary.id} could not be read back.`);
      }
      if (loaded.metadata.id !== summary.id) {
        throw new Error(`Verification failed: ID mismatch for ${summary.id}.`);
      }
    }

    await tauriStorage.markMigrationComplete?.();

    console.log(
      `[Migration] Successfully migrated ${migrated.length} classroom(s) from IndexedDB to JSON files.`,
    );
    return { status: "completed", migratedCount: migrated.length };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Migration] Failed:", message);
    return { status: "failed", error: message };
  }
}
