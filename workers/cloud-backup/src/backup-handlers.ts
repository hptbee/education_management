import { requireCloudBackup } from "./auth-handlers";
import { MANIFEST_PATH, mergeCloudFilesToClassroom, mergeClassroomRegistries, STRUCTURED_DOMAIN_FILES, type WorkerClassroomsRegistryFile } from "./cloud-serializer";
import {
  errorResponse,
  jsonResponse,
  MAX_RESTORE_ASSET_PAGE_COUNT,
  MAX_RESTORE_ASSET_PAGE_DECODED_BYTES,
  MAX_RESTORE_ASSET_TOTAL_COUNT,
  MAX_SYNC_BATCH_FILES,
  MAX_SYNC_FILE_BYTES,
  readBodyWithLimit,
  ValidationError,
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
import { isAllowedCloudAssetPath, normalizeSyncRelativePath } from "./asset-paths";

const ACTIVITY_DAY_PATTERN = /^activity\/\d{4}-\d{2}-\d{2}\.json$/;
const ALLOWED_SYNC_PATHS = new Set<string>([
  ...STRUCTURED_DOMAIN_FILES,
]);

function isAllowedSyncPath(path: string): boolean {
  const normalized = normalizeSyncRelativePath(path);
  if (ALLOWED_SYNC_PATHS.has(normalized)) return true;
  if (ACTIVITY_DAY_PATTERN.test(normalized)) return true;
  return isAllowedCloudAssetPath(normalized);
}

export function assertUploadBody(data: unknown): BackupUploadBody {
  if (!data || typeof data !== "object") {
    throw new ValidationError("Invalid request body");
  }

  const record = data as Record<string, unknown>;
  const required = ["classroomId", "fileName", "schemaVersion", "timestamp", "payload"] as const;

  for (const key of required) {
    if (record[key] === undefined || record[key] === null) {
      throw new ValidationError(`Missing field: ${key}`);
    }
  }

  if (typeof record.classroomId !== "string") {
    throw new ValidationError("Invalid classroomId");
  }

  if (typeof record.fileName !== "string" || typeof record.timestamp !== "string") {
    throw new ValidationError("Invalid metadata");
  }

  if (typeof record.schemaVersion !== "number") {
    throw new ValidationError("Invalid schemaVersion");
  }

  if (!record.payload || typeof record.payload !== "object") {
    throw new ValidationError("Invalid payload");
  }

  const payload = record.payload as Record<string, unknown>;
  const metadata = payload.metadata as Record<string, unknown> | undefined;
  if (!metadata || typeof metadata.id !== "string" || metadata.id !== record.classroomId) {
    throw new ValidationError("payload.metadata.id must match classroomId");
  }
  if (typeof metadata.version !== "number") {
    throw new ValidationError("Invalid payload.metadata.version");
  }
  if (metadata.version !== record.schemaVersion) {
    throw new ValidationError("payload.metadata.version must match schemaVersion");
  }

  return record as unknown as BackupUploadBody;
}

export function assertSyncBody(data: unknown): SyncUploadBody {
  if (!data || typeof data !== "object") {
    throw new ValidationError("Invalid request body");
  }

  const record = data as Record<string, unknown>;
  if (typeof record.classroomKey !== "string" || !sanitizeBackupIdentifier(record.classroomKey)) {
    throw new ValidationError("Invalid classroomKey");
  }

  if (!Array.isArray(record.files)) {
    throw new ValidationError("Invalid files");
  }

  let registry: string | undefined;
  if (record.registry !== undefined && record.registry !== null) {
    if (typeof record.registry !== "string") {
      throw new ValidationError("Invalid registry");
    }
    if (record.registry.length > MAX_SYNC_FILE_BYTES) {
      throw new ValidationError("Registry file too large");
    }
    registry = record.registry;
  }

  if (record.files.length === 0 && !registry) {
    throw new ValidationError("files must not be empty");
  }

  if (record.files.length > MAX_SYNC_BATCH_FILES) {
    throw new ValidationError("Too many files in sync batch");
  }

  const files: SyncUploadBody["files"] = [];
  for (const entry of record.files) {
    if (!entry || typeof entry !== "object") {
      throw new ValidationError("Invalid file entry");
    }
    const file = entry as Record<string, unknown>;
    if (typeof file.path !== "string" || typeof file.content !== "string") {
      throw new ValidationError("Invalid file path or content");
    }
    const path = normalizeSyncRelativePath(file.path);
    if (!path) {
      throw new ValidationError("Invalid file path or content");
    }
    if (!isAllowedSyncPath(path)) {
      throw new ValidationError(`Disallowed sync path: ${file.path}`);
    }
    if (path === "classroom.json") {
      try {
        const classroomMeta = JSON.parse(file.content) as { metadata?: { id?: string } };
        const id = classroomMeta?.metadata?.id;
        if (typeof id !== "string" || id !== record.classroomKey) {
          throw new ValidationError("classroom.json metadata.id must match classroomKey");
        }
      } catch (error) {
        if (error instanceof ValidationError) throw error;
        throw new ValidationError("Invalid classroom.json");
      }
    }
    const encoding = file.encoding === "base64" ? "base64" : undefined;
    const contentLimit = encoding === "base64" ? Math.ceil(MAX_SYNC_FILE_BYTES * 1.37) : MAX_SYNC_FILE_BYTES;
    if (file.content.length > contentLimit) {
      throw new ValidationError(`File too large: ${file.path}`);
    }
    files.push({
      path,
      content: file.content,
      contentType: typeof file.contentType === "string" ? file.contentType : undefined,
      encoding,
    });
  }

  return {
    classroomKey: record.classroomKey,
    files,
    registry,
  };
}

function parseJsonBody(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError("Invalid request body");
  }
}

export async function handleBackupPut(request: Request, env: Env): Promise<Response> {
  const auth = await requireCloudBackup(request, env);
  if ("error" in auth) return auth.error;

  const raw = await readBodyWithLimit(request);
  const body = assertUploadBody(parseJsonBody(raw));
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
  const body = assertSyncBody(parseJsonBody(raw));
  const writtenKeys: string[] = [];

  for (const file of body.files) {
    const key = buildClassroomFileKey(auth.user.id, body.classroomKey, file.path);
    let payload: string | Uint8Array = file.content;
    if (file.encoding === "base64") {
      const binary = atob(file.content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      payload = bytes;
    }
    await env.BACKUP_BUCKET.put(key, payload, {
      httpMetadata: {
        contentType: file.contentType ?? (file.encoding === "base64" ? "application/octet-stream" : "application/json"),
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
    const existingObject = await env.BACKUP_BUCKET.get(registryKey);

    let remoteRegistry: WorkerClassroomsRegistryFile | null = null;
    if (existingObject) {
      try {
        remoteRegistry = JSON.parse(await existingObject.text()) as WorkerClassroomsRegistryFile;
      } catch {
        remoteRegistry = null;
      }
    }

    let localRegistry: WorkerClassroomsRegistryFile;
    try {
      localRegistry = JSON.parse(body.registry) as WorkerClassroomsRegistryFile;
    } catch {
      return errorResponse("VALIDATION_ERROR", "Invalid registry JSON", 400);
    }

    const remoteVisible = (remoteRegistry?.classrooms ?? []).filter(
      (e) => !e.deletedAt || e.deletedAt < e.updatedAt,
    );
    const localVisible = (localRegistry.classrooms ?? []).filter(
      (e) => !e.deletedAt || e.deletedAt < e.updatedAt,
    );

    if (remoteVisible.length > 0 && localVisible.length === 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Cannot overwrite non-empty registry with empty classrooms list",
        400,
      );
    }

    let mergedRegistry: WorkerClassroomsRegistryFile;
    try {
      mergedRegistry = mergeClassroomRegistries(localRegistry, remoteRegistry);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registry merge failed";
      return errorResponse("VALIDATION_ERROR", message, 400);
    }

    const registryPayload = JSON.stringify(mergedRegistry, null, 2);
    await env.BACKUP_BUCKET.put(registryKey, registryPayload, {
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
      const classrooms = (parsed.classrooms ?? [])
        .filter((entry) => !entry.deletedAt || entry.deletedAt < (entry.updatedAt ?? ""))
        .map((entry) => ({
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

  const byClassroomId = new Map<
    string,
    {
      classroomId: string;
      key: string;
      updatedAt: string | null;
      size: number;
      priority: number;
    }
  >();

  for (const obj of listed.objects ?? []) {
    const parts = obj.key.split("/");
    const classroomId = parts[3] ?? "";
    if (!classroomId) continue;

    const relativePath = parts.slice(4).join("/");
    const priority =
      relativePath === "database.json" || relativePath === "classroom.json" || relativePath === "manifest.json"
        ? 2
        : relativePath.endsWith(".json")
          ? 1
          : 0;

    const existing = byClassroomId.get(classroomId);
    if (!existing || priority > existing.priority) {
      byClassroomId.set(classroomId, {
        classroomId,
        key: obj.key,
        updatedAt: obj.uploaded?.toISOString() ?? null,
        size: obj.size,
        priority,
      });
    }
  }

  const classrooms = [...byClassroomId.values()].map(({ classroomId, key, updatedAt, size }) => ({
    classroomId,
    key,
    updatedAt,
    size,
  }));

  return jsonResponse({ ok: true, classrooms, source: "legacy" });
}

export async function handleGetClassroomsRegistry(request: Request, env: Env): Promise<Response> {
  const auth = await requireCloudBackup(request, env);
  if ("error" in auth) return auth.error;

  const registryKey = buildClassroomsRegistryKey(auth.user.id);
  const registryObject = await env.BACKUP_BUCKET.get(registryKey);
  if (!registryObject) {
    return errorResponse("NOT_FOUND", "Registry not found", 404);
  }

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
        deletedAt?: string;
      }>;
      version?: number;
      updatedAt?: string;
    };
    const classrooms = (parsed.classrooms ?? []).filter(
      (entry) => !entry.deletedAt || entry.deletedAt < (entry.updatedAt ?? ""),
    );
    return jsonResponse({
      ok: true,
      source: "registry",
      registry: {
        version: parsed.version ?? 1,
        updatedAt: parsed.updatedAt ?? registryObject.uploaded?.toISOString() ?? new Date().toISOString(),
        classrooms,
      },
    });
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid registry file", 400);
  }
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

type RestoreAssetsCursorState = {
  v: 1;
  prefixIndex: number;
  listCursor?: string;
  totalEmitted: number;
  resumeAfterKey?: string;
};

function encodeRestoreAssetsCursor(state: RestoreAssetsCursorState): string {
  return btoa(JSON.stringify(state)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeRestoreAssetsCursor(raw: string): RestoreAssetsCursorState | null {
  try {
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const json = atob(padded + "=".repeat(padLen));
    const parsed = JSON.parse(json) as RestoreAssetsCursorState;
    if (parsed.v !== 1) return null;
    if (!Number.isInteger(parsed.prefixIndex) || parsed.prefixIndex < 0) return null;
    if (!Number.isInteger(parsed.totalEmitted) || parsed.totalEmitted < 0) return null;
    if (parsed.listCursor !== undefined && typeof parsed.listCursor !== "string") return null;
    if (parsed.resumeAfterKey !== undefined && typeof parsed.resumeAfterKey !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function handleRestoreAssets(
  request: Request,
  env: Env,
  classroomId: string,
): Promise<Response> {
  const auth = await requireCloudBackup(request, env);
  if ("error" in auth) return auth.error;

  if (!sanitizeBackupIdentifier(classroomId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid classroomId", 400);
  }

  const url = new URL(request.url);
  const cursorParam = url.searchParams.get("cursor");
  const initialState = cursorParam
    ? decodeRestoreAssetsCursor(cursorParam)
    : { v: 1 as const, prefixIndex: 0, totalEmitted: 0 };
  if (!initialState) {
    return errorResponse("VALIDATION_ERROR", "Invalid cursor", 400);
  }
  if (initialState.totalEmitted >= MAX_RESTORE_ASSET_TOTAL_COUNT) {
    return jsonResponse({ ok: true, assets: [], nextCursor: null });
  }

  const classroomPrefix = buildClassroomPrefix(auth.user.id, classroomId);
  const assetPrefixes = [`${classroomPrefix}assets/`, `${classroomPrefix}images/gifts/`];
  const assets: Array<{ path: string; content: string; encoding: "base64" }> = [];
  let pageDecodedBytes = 0;
  let prefixIndex = initialState.prefixIndex;
  let listCursor: string | undefined = initialState.listCursor;
  let totalEmitted = initialState.totalEmitted;
  let resumeAfterKey: string | undefined = initialState.resumeAfterKey;

  while (prefixIndex < assetPrefixes.length) {
    if (totalEmitted >= MAX_RESTORE_ASSET_TOTAL_COUNT) {
      break;
    }
    if (assets.length >= MAX_RESTORE_ASSET_PAGE_COUNT || pageDecodedBytes >= MAX_RESTORE_ASSET_PAGE_DECODED_BYTES) {
      return jsonResponse({
        ok: true,
        assets,
        nextCursor: encodeRestoreAssetsCursor({
          v: 1,
          prefixIndex,
          listCursor,
          totalEmitted,
          resumeAfterKey,
        }),
      });
    }

    const assetPrefix = assetPrefixes[prefixIndex]!;
    const listed = await env.BACKUP_BUCKET.list({ prefix: assetPrefix, cursor: listCursor });

    for (const object of listed.objects) {
      if (resumeAfterKey && object.key <= resumeAfterKey) {
        continue;
      }

      if (totalEmitted >= MAX_RESTORE_ASSET_TOTAL_COUNT) {
        break;
      }
      if (assets.length >= MAX_RESTORE_ASSET_PAGE_COUNT) {
        return jsonResponse({
          ok: true,
          assets,
          nextCursor: encodeRestoreAssetsCursor({
            v: 1,
            prefixIndex,
            listCursor,
            totalEmitted,
            resumeAfterKey: object.key,
          }),
        });
      }

      const relativePath = object.key.slice(classroomPrefix.length);
      if (!isAllowedCloudAssetPath(relativePath)) continue;
      const file = await env.BACKUP_BUCKET.get(object.key);
      if (!file) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length > MAX_SYNC_FILE_BYTES) continue;
      if (pageDecodedBytes + bytes.length > MAX_RESTORE_ASSET_PAGE_DECODED_BYTES) {
        return jsonResponse({
          ok: true,
          assets,
          nextCursor: encodeRestoreAssetsCursor({
            v: 1,
            prefixIndex,
            listCursor,
            totalEmitted,
            resumeAfterKey: object.key,
          }),
        });
      }

      assets.push({
        path: relativePath,
        content: bytesToBase64(bytes),
        encoding: "base64",
      });
      pageDecodedBytes += bytes.length;
      totalEmitted += 1;
      resumeAfterKey = undefined;
    }

    if (totalEmitted >= MAX_RESTORE_ASSET_TOTAL_COUNT) {
      break;
    }

    if (listed.truncated && listed.cursor) {
      listCursor = listed.cursor;
      resumeAfterKey = undefined;
      continue;
    }

    prefixIndex += 1;
    listCursor = undefined;
    resumeAfterKey = undefined;
  }

  return jsonResponse({ ok: true, assets, nextCursor: null });
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
