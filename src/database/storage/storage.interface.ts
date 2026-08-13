import type { ClassroomDatabase, DatabaseSummary } from "../types";

export interface ClassroomDatabaseStorage {
  load(id: string): Promise<ClassroomDatabase | null>;
  save(database: ClassroomDatabase): Promise<void>;
  delete(id: string): Promise<void>;
  list(): Promise<DatabaseSummary[]>;
}
