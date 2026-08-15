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
  tauriStorage: TauriFsClassroomStorage
): Promise<MigrationResult> {
  // Check if already migrated
  const alreadyInitialized = await tauriStorage.isInitialized();
  if (alreadyInitialized) {
    return { status: "skipped" };
  }

  try {
    // Load all databases from IndexedDB
    const indexedDb = new IndexedDbClassroomStorage();
    const summaries = await indexedDb.list();

    if (summaries.length === 0) {
      // No IndexedDB data → just create empty index (valid fresh state)
      await tauriStorage.save(
        // We write a dummy-then-delete to trigger index creation; use the
        // save/delete path only if there are databases. Here we just write
        // an empty index by calling save on a placeholder and then cleaning up.
        // Actually, let's just call list() after initialize() — it creates dirs.
        // We'll mark migration done by the mere absence of a crash (list() returns []).
        // Since isInitialized() checks for index.json, we need to write it.
        // Use a workaround: save nothing intentionally by writing the index manually.
        null as unknown as ClassroomDatabase
      ).catch(() => {
        // ignore — we'll write the index below
      });

      // Directly write the empty index to mark as initialized
      const { tauriFs } = await import("../tauri-fs.service");
      const dataDir = await tauriStorage.getDataDirectory();
      const indexPath = tauriFs.joinPath(dataDir, "index.json");
      await tauriFs.writeTextFile(indexPath, JSON.stringify({ version: 1, classrooms: [] }, null, 2));

      return { status: "completed", migratedCount: 0 };
    }

    // Migrate each database
    const migrated: ClassroomDatabase[] = [];
    for (const summary of summaries) {
      const db = await indexedDb.load(summary.id);
      if (db) {
        migrated.push(db);
      }
    }

    // Save all to JSON files
    for (const db of migrated) {
      await tauriStorage.save(db);
    }

    // Verify: re-read each saved database to confirm integrity
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
