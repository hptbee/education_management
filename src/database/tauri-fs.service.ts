/**
 * Tauri File Service
 * Low-level wrapper around Tauri's invoke API for filesystem operations.
 * Feature code should NEVER use this directly — use TauriFsClassroomStorage instead.
 */

import type { FileStorageAdapter } from "./storage/storage.interface";

// Type guard to detect if we're running inside Tauri
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export const tauriFs: FileStorageAdapter = {
  async getDataDirectory(): Promise<string> {
    return invoke<string>("get_data_directory");
  },

  async ensureDir(path: string): Promise<void> {
    return invoke<void>("ensure_dir", { path });
  },

  async readTextFile(path: string): Promise<string> {
    return invoke<string>("read_text_file", { path });
  },

  async writeTextFile(path: string, contents: string): Promise<void> {
    return invoke<void>("write_text_file", { path, contents });
  },

  async readBinaryFile(path: string): Promise<Uint8Array> {
    const bytes = await invoke<number[]>("read_binary_file", { path });
    return Uint8Array.from(bytes);
  },

  async writeBinaryFile(path: string, contents: Uint8Array): Promise<void> {
    return invoke<void>("write_binary_file", { path, contents: Array.from(contents) });
  },

  async removeFile(path: string): Promise<void> {
    return invoke<void>("remove_file", { path });
  },

  async removeDir(path: string): Promise<void> {
    return invoke<void>("remove_dir", { path });
  },

  async renamePath(from: string, to: string): Promise<void> {
    return invoke<void>("rename_path", { from, to });
  },

  async fileExists(path: string): Promise<boolean> {
    return invoke<boolean>("file_exists", { path });
  },

  async listDir(path: string): Promise<string[]> {
    return invoke<string[]>("list_dir", { path });
  },

  async openPath(path: string): Promise<void> {
    return invoke<void>("open_path", { path });
  },

  joinPath(...parts: string[]): string {
    const sep = parts[0].includes("\\") ? "\\" : "/";
    return parts.join(sep);
  },
};
