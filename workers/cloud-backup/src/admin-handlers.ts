import { requireAuth } from "./auth-handlers";
import {
  createLicense,
  findLicenseById,
  findUserById,
  listLicensesForUser,
  listUsers,
  nowIso,
  updateLicense,
  updateUserRole,
  updateUserStatus,
} from "./db";
import { errorResponse, jsonResponse, readJsonWithLimit } from "./http";
import type { Env, LicensePlan, UserRole, UserStatus } from "./types";

async function requireAdmin(request: Request, env: Env) {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth;

  if (auth.user.role !== "admin" || auth.user.status !== "active") {
    return { error: errorResponse("FORBIDDEN", "Admin access required", 403) };
  }

  return auth;
}

export async function handleAdminListUsers(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;

  const users = await listUsers(env.DB);
  return jsonResponse({
    ok: true,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role,
      status: u.status,
      licenseVersion: u.license_version,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    })),
  });
}

export async function handleAdminPatchUser(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;

  let body: { status?: UserStatus; role?: UserRole };
  try {
    body = await readJsonWithLimit(request);
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400);
  }
  let user = await findUserById(env.DB, userId);
  if (!user) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  if (body.status) {
    user = (await updateUserStatus(env.DB, userId, body.status))!;
  }
  if (body.role) {
    user = (await updateUserRole(env.DB, userId, body.role))!;
  }

  return jsonResponse({
    ok: true,
    user: {
      id: user!.id,
      email: user!.email,
      displayName: user!.display_name,
      role: user!.role,
      status: user!.status,
      licenseVersion: user!.license_version,
    },
  });
}

export async function handleAdminListLicenses(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return errorResponse("VALIDATION_ERROR", "userId is required", 400);
  }

  const licenses = await listLicensesForUser(env.DB, userId);
  return jsonResponse({ ok: true, licenses });
}

export async function handleAdminCreateLicense(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;

  let body: {
    userId: string;
    plan: LicensePlan;
    startsAt?: string;
    expiresAt?: string | null;
  };
  try {
    body = await readJsonWithLimit(request);
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400);
  }

  if (!body.userId || !body.plan) {
    return errorResponse("VALIDATION_ERROR", "userId and plan are required", 400);
  }

  const user = await findUserById(env.DB, body.userId);
  if (!user) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  const license = await createLicense(
    env.DB,
    body.userId,
    body.plan,
    body.startsAt ?? nowIso(),
    body.expiresAt ?? null,
  );

  return jsonResponse({ ok: true, license });
}

export async function handleAdminPatchLicense(
  request: Request,
  env: Env,
  licenseId: string,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;

  let body: {
    plan?: LicensePlan;
    status?: "active" | "expired" | "disabled" | "cancelled";
    expiresAt?: string | null;
  };
  try {
    body = await readJsonWithLimit(request);
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400);
  }

  const license = await updateLicense(env.DB, licenseId, {
    plan: body.plan,
    status: body.status,
    expires_at: body.expiresAt,
  });

  if (!license) {
    return errorResponse("NOT_FOUND", "License not found", 404);
  }

  return jsonResponse({ ok: true, license });
}
