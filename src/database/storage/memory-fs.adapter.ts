import type { FileStorageAdapter } from "./storage.interface";

export class MemoryFileStorageAdapter implements FileStorageAdapter {
  private files = new Map<string, string>();
  private binaryFiles = new Map<string, Uint8Array>();
  private readonly root: string;

  constructor(root = "/appdata/ClassroomManagement") {
    this.root = root.replace(/\\/g, "/").replace(/\/$/, "");
    this.files.set(`${this.root}/index.json`, "");
  }

  async getDataDirectory(): Promise<string> {
    return this.root;
  }

  async ensureDir(path: string): Promise<void> {
    const normalized = this.normalize(path);
    if (!this.files.has(normalized)) {
      this.files.set(normalized, "");
    }
  }

  async readTextFile(path: string): Promise<string> {
    const normalized = this.normalize(path);
    const value = this.files.get(normalized);
    if (value === undefined) {
      throw new Error(`ENOENT: ${path}`);
    }
    return value;
  }

  async writeTextFile(path: string, contents: string): Promise<void> {
    const normalized = this.normalize(path);
    this.files.set(normalized, contents);
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    const normalized = this.normalize(path);
    const value = this.binaryFiles.get(normalized);
    if (!value) {
      throw new Error(`ENOENT: ${path}`);
    }
    return value;
  }

  async writeBinaryFile(path: string, contents: Uint8Array): Promise<void> {
    this.binaryFiles.set(this.normalize(path), contents);
  }

  async removeFile(path: string): Promise<void> {
    const normalized = this.normalize(path);
    this.files.delete(normalized);
    this.binaryFiles.delete(normalized);
  }

  async removeDir(path: string): Promise<void> {
    const prefix = `${this.normalize(path)}/`;
    for (const key of [...this.files.keys(), ...this.binaryFiles.keys()]) {
      if (key === this.normalize(path) || key.startsWith(prefix)) {
        this.files.delete(key);
        this.binaryFiles.delete(key);
      }
    }
  }

  async renamePath(from: string, to: string): Promise<void> {
    const fromNorm = this.normalize(from);
    const toNorm = this.normalize(to);
    const fromPrefix = `${fromNorm}/`;

    for (const [key, value] of [...this.files.entries()]) {
      if (key === fromNorm) {
        this.files.set(toNorm, value);
        this.files.delete(key);
      } else if (key.startsWith(fromPrefix)) {
        const nextKey = `${toNorm}/${key.slice(fromPrefix.length)}`;
        this.files.set(nextKey, value);
        this.files.delete(key);
      }
    }

    for (const [key, value] of [...this.binaryFiles.entries()]) {
      if (key === fromNorm) {
        this.binaryFiles.set(toNorm, value);
        this.binaryFiles.delete(key);
      } else if (key.startsWith(fromPrefix)) {
        const nextKey = `${toNorm}/${key.slice(fromPrefix.length)}`;
        this.binaryFiles.set(nextKey, value);
        this.binaryFiles.delete(key);
      }
    }
  }

  async fileExists(path: string): Promise<boolean> {
    const normalized = this.normalize(path);
    return this.files.has(normalized) || this.binaryFiles.has(normalized);
  }

  joinPath(...parts: string[]): string {
    return parts
      .join("/")
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/");
  }

  getFile(path: string): string | undefined {
    return this.files.get(this.normalize(path));
  }

  listPaths(): string[] {
    return [...this.files.keys()];
  }

  private normalize(path: string): string {
    return path.replace(/\\/g, "/").replace(/\/+/g, "/");
  }
}
