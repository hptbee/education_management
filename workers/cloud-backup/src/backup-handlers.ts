import { requireCloudBackup } from "./auth-handlers";
import { errorResponse, jsonResponse, readBodyWithLimit } from "./http";
import { buildUserClassroomKey, buildUserClassroomsPrefix, sanitizeBackupIdentifier } from "./paths";
import type { BackupUploadBody, Env } from "./types";

export function assertUploadBody(data: unknown): BackupUploadBody {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid request body");
  }

  const record = data as Record<string, unknown>;
  const required = ["classroomId", "fileName", "schemaVersion", "timestamp", "payload"] as const;

  for (const key of required) {
    if (record[key] === undefined || record[key] === null) {
      throw new Error(`Missing field: ${key}`);
    }
  }

  if (typeof record.classroomId !== "string") {
    throw new Error("Invalid classroomId");
  }

  if (typeof record.fileName !== "string" || typeof record.timestamp !== "string") {
    throw new Error("Invalid metadata");
  }

  if (typeof record.schemaVersion !== "number") {
    throw new Error("Invalid schemaVersion");
  }

  if (!record.payload || typeof record.payload !== "object") {
    throw new Error("Invalid payload");
  }

  const payload = record.payload as Record<string, unknown>;
  const metadata = payload.metadata as Record<string, unknown> | undefined;
  if (!metadata || typeof metadata.id !== "string" || metadata.id !== record.classroomId) {
    throw new Error("payload.metadata.id must match classroomId");
  }
  if (typeof metadata.version !== "number") {
    throw new Error("Invalid payload.metadata.version");
  }
  if (metadata.version !== record.schemaVersion) {
    throw new Error("payload.metadata.version must match schemaVersion");
  }

  return record as unknown as BackupUploadBody;
}

export async function handleBackupPut(request: Request, env: Env): Promise<Response> {
  const auth = await requireCloudBackup(request, env);
  if ("error" in auth) return auth.error;

  const raw = await readBodyWithLimit(request);
  const body = assertUploadBody(JSON.parse(raw));
  const key = buildUserClassroomKey(auth.user.id, body.classroomId);

  await env.BACKUP_BUCKET.put(key, raw, {
    httpMetadata: { contentType: "application/json" },
    customMetadata: {
      classroomId: body.classroomId,
      userId: auth.user.id,
      schemaVersion: String(body.schemaVersion),
      timestamp: body.timestamp,
    },
  });

  return jsonResponse({ ok: true, key });
}

export async function handleListClassrooms(request: Request, env: Env): Promise<Response> {
  const auth = await requireCloudBackup(request, env);
  if ("error" in auth) return auth.error;

  const prefix = buildUserClassroomsPrefix(auth.user.id);
  const listed = await env.BACKUP_BUCKET.list({ prefix });

  const classrooms = (listed.objects ?? []).map((obj) => {
    const parts = obj.key.split("/");
    const classroomId = parts[3] ?? "";
    return {
      classroomId,
      key: obj.key,
      updatedAt: obj.uploaded?.toISOString() ?? null,
      size: obj.size,
    };
  });

  return jsonResponse({ ok: true, classrooms });
}

export async function handleRestore(request: Request, env: Env, classroomId: string): Promise<Response> {
  const auth = await requireCloudBackup(request, env);
  if ("error" in auth) return auth.error;

  if (!sanitizeBackupIdentifier(classroomId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid classroomId", 400);
  }

  const key = buildUserClassroomKey(auth.user.id, classroomId);
  const object = await env.BACKUP_BUCKET.get(key);
  if (!object) {
    return errorResponse("NOT_FOUND", "Backup not found", 404);
  }

  const text = await object.text();
  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
