export interface Env {
  BACKUP_BUCKET: R2Bucket;
  BACKUP_API_TOKEN?: string;
}

export interface BackupUploadBody {
  deviceId: string;
  classroomId: string;
  fileName: string;
  schemaVersion: number;
  timestamp: string;
  payload: unknown;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function sanitizeBackupIdentifier(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function buildBackupStorageKey(deviceId: string, classroomId: string): string {
  const safeDevice = sanitizeBackupIdentifier(deviceId);
  const safeClassroom = sanitizeBackupIdentifier(classroomId);
  if (!safeDevice || !safeClassroom) {
    throw new Error("Invalid backup identifiers");
  }
  return `backups/${safeDevice}/${safeClassroom}/latest.json`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function assertUploadBody(data: unknown): BackupUploadBody {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid request body");
  }

  const record = data as Record<string, unknown>;
  const required = ["deviceId", "classroomId", "fileName", "schemaVersion", "timestamp", "payload"] as const;

  for (const key of required) {
    if (record[key] === undefined || record[key] === null) {
      throw new Error(`Missing field: ${key}`);
    }
  }

  if (typeof record.deviceId !== "string" || typeof record.classroomId !== "string") {
    throw new Error("Invalid identifiers");
  }

  if (typeof record.fileName !== "string" || typeof record.timestamp !== "string") {
    throw new Error("Invalid metadata");
  }

  if (typeof record.schemaVersion !== "number") {
    throw new Error("Invalid schemaVersion");
  }

  return record as unknown as BackupUploadBody;
}

function requireBackupAuth(request: Request, env: Env): Response | null {
  if (!env.BACKUP_API_TOKEN) return null;
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${env.BACKUP_API_TOKEN}`) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (request.method === "PUT" && url.pathname === "/backup") {
        const authError = requireBackupAuth(request, env);
        if (authError) return authError;

        const body = assertUploadBody(await request.json());
        const key = buildBackupStorageKey(body.deviceId, body.classroomId);

        await env.BACKUP_BUCKET.put(key, JSON.stringify(body), {
          httpMetadata: { contentType: "application/json" },
          customMetadata: {
            classroomId: body.classroomId,
            deviceId: body.deviceId,
            schemaVersion: String(body.schemaVersion),
            timestamp: body.timestamp,
          },
        });

        return jsonResponse({ ok: true, key });
      }

      if (request.method === "GET" && url.pathname === "/backup") {
        const authError = requireBackupAuth(request, env);
        if (authError) return authError;

        const deviceId = url.searchParams.get("deviceId");
        const classroomId = url.searchParams.get("classroomId");

        if (!deviceId || !classroomId) {
          return jsonResponse({ ok: false, error: "deviceId and classroomId are required" }, 400);
        }

        const key = buildBackupStorageKey(deviceId, classroomId);
        const object = await env.BACKUP_BUCKET.get(key);
        if (!object) {
          return jsonResponse({ ok: false, error: "Backup not found" }, 404);
        }

        const text = await object.text();
        return new Response(text, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        });
      }

      return jsonResponse({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return jsonResponse({ ok: false, error: message }, 400);
    }
  },
};
