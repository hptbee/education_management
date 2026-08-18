import { requireCloudBackup } from "./auth-handlers";
import { MANIFEST_PATH, mergeCloudFilesToClassroom, STRUCTURED_DOMAIN_FILES } from "./cloud-serializer";
import {
  errorResponse,
  jsonResponse,
  MAX_SYNC_BATCH_FILES,
  MAX_SYNC_FILE_BYTES,
  readBodyWithLimit,
} from "./http";
import {
  buildClassroomFileKey,
  buildClassroomManifestKey,
  buildClassroomPrefix,
  buildClassroomsRegistryKey,
  buildUserClassroomKey,
  buildUserClassroomsPrefix,
  sanitizeBackupIdentifier,
} from "./paths";
import type { BackupUploadBody, Env, SyncUploadBody } from "./types";

const ACTIVITY_DAY_PATTERN = /^activity\/\d{4}-\d{2}-\d{2}\.json$/;
const ALLOWED_SYNC_PATHS = new Set<string>([
  ...STRUCTURED_DOMAIN_FILES,
]);

function isAllowedSyncPath(path: string): boolean {
  if (ALLOWED_SYNC_PATHS.has(path)) return true;
  return ACTIVITY_DAY_PATTERN.test(path);
}

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

export function assertSyncBody(data: unknown): SyncUploadBody {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid request body");
  }

  const record = data as Record<string, unknown>;
  if (typeof record.classroomKey !== "string" || !sanitizeBackupIdentifier(record.classroomKey)) {
    throw new Error("Invalid classroomKey");
  }

  if (!Array.isArray(record.files)) {
    throw new Error("Invalid files");
  }

  if (record.files.length === 0) {
    throw new Error("files must not be empty");
  }

  if (record.files.length > MAX_SYNC_BATCH_FILES) {
    throw new Error("Too many files in sync batch");
  }

  const files: SyncUploadBody["files"] = [];
  for (const entry of record.files) {
    if (!entry || typeof entry !== "object") {
      throw new Error("Invalid file entry");
    }
    const file = entry as Record<string, unknown>;
    if (typeof file.path !== "string" || typeof file.content !== "string") {
      throw new Error("Invalid file path or content");
    }
    if (!isAllowedSyncPath(file.path)) {
      throw new Error(`Disallowed sync path: ${file.path}`);
    }
    if (file.content.length > MAX_SYNC_FILE_BYTES) {
      throw new Error(`File too large: ${file.path}`);
    }
    files.push({
      path: file.path,
      content: file.content,
      contentType: typeof file.contentType === "string" ? file.contentType : undefined,
    });
  }

  let registry: string | undefined;
  if (record.registry !== undefined && record.registry !== null) {
    if (typeof record.registry !== "string") {
      throw new Error("Invalid registry");
    }
    if (record.registry.length > MAX_SYNC_FILE_BYTES) {
      throw new Error("Registry file too large");
    }
    registry = record.registry;
  }

  return {
    classroomKey: record.classroomKey,
    files,
    registry,
  };
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

export async function handleSyncPut(request: Request, env: Env): Promise<Response> {
  const auth = await requireCloudBackup(request, env);
  if ("error" in auth) return auth.error;

  const raw = await readBodyWithLimit(request);
  const body = assertSyncBody(JSON.parse(raw));
  const writtenKeys: string[] = [];

  for (const file of body.files) {
    const key = buildClassroomFileKey(auth.user.id, body.classroomKey, file.path);
    await env.BACKUP_BUCKET.put(key, file.content, {
      httpMetadata: {
        contentType: file.contentType ?? "application/json",
      },
      customMetadata: {
        classroomKey: body.classroomKey,
        userId: auth.user.id,
        relativePath: file.path,
      },
    });
    writtenKeys.push(key);
  }

  if (body.registry) {
    const registryKey = buildClassroomsRegistryKey(auth.user.id);
    await env.BACKUP_BUCKET.put(registryKey, body.registry, {
      httpMetadata: { contentType: "application/json" },
      customMetadata: {
        userId: auth.user.id,
        relativePath: "classrooms.json",
      },
    });
    writtenKeys.push(registryKey);
  }

  return jsonResponse({ ok: true, keys: writtenKeys, count: writtenKeys.length });
}

export async function handleListClassrooms(request: Request, env: Env): Promise<Response> {
  const auth = await requireCloudBackup(request, env);
  if ("error" in auth) return auth.error;

  const registryKey = buildClassroomsRegistryKey(auth.user.id);
  const registryObject = await env.BACKUP_BUCKET.get(registryKey);

  if (registryObject) {
    const text = await registryObject.text();
    try {
      const parsed = JSON.parse(text) as {
        classrooms?: Array<{
          key: string;
          name?: string;
          schoolYear?: string;
          updatedAt?: string;
          createdAt?: string;
          archived?: boolean;
        }>;
      };
      const classrooms = (parsed.classrooms ?? []).map((entry) => ({
        classroomId: entry.key,
        key: buildClassroomPrefix(auth.user.id, entry.key),
        name: entry.name ?? null,
        schoolYear: entry.schoolYear ?? null,
        updatedAt: entry.updatedAt ?? registryObject.uploaded?.toISOString() ?? null,
        size: null as number | null,
        archived: entry.archived ?? false,
      }));
      return jsonResponse({ ok: true, classrooms, source: "registry" });
    } catch {
      // fall through to legacy list
    }
  }

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

  return jsonResponse({ ok: true, classrooms, source: "legacy" });
}

async function loadStructuredClassroomFiles(
  env: Env,
  userId: string,
  classroomKey: string,
): Promise<Record<string, string> | null> {
  const manifestKey = buildClassroomManifestKey(userId, classroomKey);
  const manifestObject = await env.BACKUP_BUCKET.get(manifestKey);
  if (!manifestObject) return null;

  const files: Record<string, string> = {
    [MANIFEST_PATH]: await manifestObject.text(),
  };

  for (const relativePath of STRUCTURED_DOMAIN_FILES) {
    if (relativePath === MANIFEST_PATH) continue;
    const key = buildClassroomFileKey(userId, classroomKey, relativePath);
    const object = await env.BACKUP_BUCKET.get(key);
    if (object) {
      files[relativePath] = await object.text();
    }
  }

  const activityIndexKey = buildClassroomFileKey(userId, classroomKey, "activity/index.json");
  const activityIndexObject = await env.BACKUP_BUCKET.get(activityIndexKey);
  if (activityIndexObject) {
    const indexText = await activityIndexObject.text();
    files["activity/index.json"] = indexText;
    try {
      const index = JSON.parse(indexText) as { dates?: Array<{ date: string }> };
      for (const entry of index.dates ?? []) {
        if (!entry.date) continue;
        const dayKey = buildClassroomFileKey(userId, classroomKey, `activity/${entry.date}.json`);
        const dayObject = await env.BACKUP_BUCKET.get(dayKey);
        if (dayObject) {
          files[`activity/${entry.date}.json`] = await dayObject.text();
        }
      }
    } catch {
      // ignore malformed index
    }
  }

  return files;
}

export async function handleRestore(request: Request, env: Env, classroomId: string): Promise<Response> {
  const auth = await requireCloudBackup(request, env);
  if ("error" in auth) return auth.error;

  if (!sanitizeBackupIdentifier(classroomId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid classroomId", 400);
  }

  const structuredFiles = await loadStructuredClassroomFiles(env, auth.user.id, classroomId);
  if (structuredFiles) {
    const merged = mergeCloudFilesToClassroom(structuredFiles);
    return new Response(JSON.stringify(merged), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
