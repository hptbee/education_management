import { loadAuthSession } from "@/src/auth/secure-storage";
import { isTauri, tauriFs } from "../tauri-fs.service";
import type { FileStorageAdapter } from "../storage/storage.interface";

const LAST_AUTH_STORAGE_KEY = "education-management:last-auth-user-id";
const LAST_AUTH_FILE_NAME = "last-auth-user.json";

interface LastAuthFile {
  userId: string;
}

export async function resolveCurrentUserId(): Promise<string | null> {
  const session = await loadAuthSession();
  return session?.user?.id ?? null;
}

export function canClaimUnownedClassrooms(
  currentUserId: string,
  lastAuthUserId: string | null,
): boolean {
  return lastAuthUserId === null || lastAuthUserId === currentUserId;
}

/** Whether this classroom should sync under the signed-in account's R2 prefix. */
export function shouldIncludeInAccountBackup(
  ownerUserId: string | undefined,
  classroomId: string,
  currentUserId: string,
  registryKeys: Set<string>,
  lastAuthUserId: string | null,
): boolean {
  if (ownerUserId === currentUserId) return true;
  if (ownerUserId && ownerUserId !== currentUserId) return false;
  if (registryKeys.has(classroomId)) return true;
  return canClaimUnownedClassrooms(currentUserId, lastAuthUserId);
}

function readLastAuthUserIdFromLocalStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLastAuthUserIdToLocalStorage(userId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      localStorage.setItem(LAST_AUTH_STORAGE_KEY, userId);
    }
  } catch {
    // ignore quota errors
  }
}

export class LastAuthUserService {
  private cachedId: string | null | undefined;

  constructor(private readonly fs: FileStorageAdapter | null = isTauri() ? tauriFs : null) {}

  resetCacheForTests(): void {
    this.cachedId = undefined;
  }

  async readLastAuthUserId(): Promise<string | null> {
    if (this.cachedId !== undefined) return this.cachedId;

    if (this.fs) {
      try {
        const dataDir = await this.fs.getDataDirectory();
        const path = this.fs.joinPath(dataDir, LAST_AUTH_FILE_NAME);
        if (await this.fs.fileExists(path)) {
          const parsed = JSON.parse(await this.fs.readTextFile(path)) as LastAuthFile;
          if (parsed.userId) {
            this.cachedId = parsed.userId;
            writeLastAuthUserIdToLocalStorage(parsed.userId);
            return parsed.userId;
          }
        }
      } catch {
        // fall through
      }
    }

    const fromStorage = readLastAuthUserIdFromLocalStorage();
    this.cachedId = fromStorage;
    return fromStorage;
  }

  async writeLastAuthUserId(userId: string): Promise<void> {
    this.cachedId = userId;
    writeLastAuthUserIdToLocalStorage(userId);
    if (!this.fs) return;
    const dataDir = await this.fs.getDataDirectory();
    const path = this.fs.joinPath(dataDir, LAST_AUTH_FILE_NAME);
    const payload: LastAuthFile = { userId };
    await this.fs.writeTextFile(path, JSON.stringify(payload, null, 2));
  }
}

export const lastAuthUserService = new LastAuthUserService();
