/**
 * Tauri File Service
 * Low-level wrapper around Tauri's invoke API for filesystem operations.
 * Feature code should NEVER use this directly — use TauriFsClassroomStorage instead.
 */

// Type guard to detect if we're running inside Tauri
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export const tauriFs = {
  /** Returns the base data directory path (AppData/ClassroomManagement) */
  async getDataDirectory(): Promise<string> {
    return invoke<string>("get_data_directory");
  },

  /** Ensures a directory exists (creates recursively) */
  async ensureDir(path: string): Promise<void> {
    return invoke<void>("ensure_dir", { path });
  },

  /** Reads a text file as a string */
  async readTextFile(path: string): Promise<string> {
    return invoke<string>("read_text_file", { path });
  },

  /** Atomically writes a text file (via temp file rename) */
  async writeTextFile(path: string, contents: string): Promise<void> {
    return invoke<void>("write_text_file", { path, contents });
  },

  /** Removes a file (no-op if not found) */
  async removeFile(path: string): Promise<void> {
    return invoke<void>("remove_file", { path });
  },

  /** Checks if a file exists */
  async fileExists(path: string): Promise<boolean> {
    return invoke<boolean>("file_exists", { path });
  },

  /** Opens a directory in the OS file explorer */
  async openPath(path: string): Promise<void> {
    return invoke<void>("open_path", { path });
  },

  /** Helper: join path segments for the current OS */
  joinPath(...parts: string[]): string {
    // Tauri commands return Windows paths when on Windows, so we use the OS separator
    const sep = parts[0].includes("\\") ? "\\" : "/";
    return parts.join(sep);
  },
};
