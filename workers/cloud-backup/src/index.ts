import {
  handleAdminCreateLicense,
  handleAdminListLicenses,
  handleAdminListUsers,
  handleAdminPatchLicense,
  handleAdminPatchUser,
} from "./admin-handlers";
import {
  handleAuthGoogle,
  handleAuthLogout,
  handleAuthRefresh,
  handleMe,
} from "./auth-handlers";
import { handleBackupPut, handleListClassrooms, handleRestore } from "./backup-handlers";
import { CORS_HEADERS, errorResponse, jsonResponse } from "./http";
import type { Env } from "./types";

export { sanitizeBackupIdentifier, buildUserClassroomKey, buildLegacyBackupStorageKey as buildBackupStorageKey } from "./paths";
export { signEntitlement, verifyEntitlement, importPublicKeyFromPem } from "./entitlement";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (request.method === "POST" && url.pathname === "/auth/google") {
        return await handleAuthGoogle(request, env);
      }
      if (request.method === "GET" && url.pathname === "/me") {
        return await handleMe(request, env);
      }
      if (request.method === "POST" && url.pathname === "/auth/refresh") {
        return await handleAuthRefresh(request, env);
      }
      if (request.method === "POST" && url.pathname === "/auth/logout") {
        return await handleAuthLogout();
      }

      if (request.method === "PUT" && url.pathname === "/backup") {
        return await handleBackupPut(request, env);
      }
      if (request.method === "GET" && url.pathname === "/classrooms") {
        return await handleListClassrooms(request, env);
      }
      if (request.method === "GET" && url.pathname.startsWith("/restore/")) {
        const classroomId = decodeURIComponent(url.pathname.slice("/restore/".length));
        return await handleRestore(request, env, classroomId);
      }

      if (request.method === "GET" && url.pathname === "/admin/users") {
        return await handleAdminListUsers(request, env);
      }
      if (request.method === "PATCH" && url.pathname.startsWith("/admin/users/")) {
        const userId = decodeURIComponent(url.pathname.slice("/admin/users/".length));
        return await handleAdminPatchUser(request, env, userId);
      }
      if (request.method === "GET" && url.pathname === "/admin/licenses") {
        return await handleAdminListLicenses(request, env);
      }
      if (request.method === "POST" && url.pathname === "/admin/licenses") {
        return await handleAdminCreateLicense(request, env);
      }
      if (request.method === "PATCH" && url.pathname.startsWith("/admin/licenses/")) {
        const licenseId = decodeURIComponent(url.pathname.slice("/admin/licenses/".length));
        return await handleAdminPatchLicense(request, env, licenseId);
      }

      return jsonResponse({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return errorResponse("VALIDATION_ERROR", message, 400);
    }
  },
};
