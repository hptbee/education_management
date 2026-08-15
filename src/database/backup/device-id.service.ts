import type { FileStorageAdapter } from "../storage/storage.interface";
import { tauriFs, isTauri } from "../tauri-fs.service";

const DEVICE_STORAGE_KEY = "education-management:device-id";
const DEVICE_FILE_NAME = "device.json";

interface DeviceFile {
  deviceId: string;
}

function createDeviceId(): string {
  return crypto.randomUUID();
}

function readDeviceIdFromLocalStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(DEVICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeDeviceIdToLocalStorage(deviceId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  } catch {
    // ignore quota errors
  }
}

export class DeviceIdService {
  private cachedId: string | null = null;

  constructor(private readonly fs: FileStorageAdapter | null = isTauri() ? tauriFs : null) {}

  async getDeviceId(): Promise<string> {
    if (this.cachedId) return this.cachedId;

    if (this.fs) {
      try {
        const dataDir = await this.fs.getDataDirectory();
        const devicePath = this.fs.joinPath(dataDir, DEVICE_FILE_NAME);
        if (await this.fs.fileExists(devicePath)) {
          const text = await this.fs.readTextFile(devicePath);
          const parsed = JSON.parse(text) as DeviceFile;
          if (parsed.deviceId) {
            this.cachedId = parsed.deviceId;
            writeDeviceIdToLocalStorage(parsed.deviceId);
            return parsed.deviceId;
          }
        }
      } catch {
        // fall through to create new id
      }
    }

    const fromStorage = readDeviceIdFromLocalStorage();
    if (fromStorage) {
      this.cachedId = fromStorage;
      await this.persistDeviceId(fromStorage);
      return fromStorage;
    }

    const newId = createDeviceId();
    this.cachedId = newId;
    await this.persistDeviceId(newId);
    return newId;
  }

  private async persistDeviceId(deviceId: string): Promise<void> {
    writeDeviceIdToLocalStorage(deviceId);
    if (!this.fs) return;

    const dataDir = await this.fs.getDataDirectory();
    const devicePath = this.fs.joinPath(dataDir, DEVICE_FILE_NAME);
    const payload: DeviceFile = { deviceId };
    await this.fs.writeTextFile(devicePath, JSON.stringify(payload, null, 2));
  }
}

export const deviceIdService = new DeviceIdService();
