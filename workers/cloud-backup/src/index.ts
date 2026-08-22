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
import { handleBackupPut, handleGetClassroomsRegistry, handleListClassrooms, handleRestore, handleRestoreAssets, handleSyncPut } from "./backup-handlers";
import { applyCorsHeaders, errorResponse, jsonResponse, resolveCorsHeaders, ValidationError } from "./http";
import type { Env } from "./types";

export { sanitizeBackupIdentifier, buildUserClassroomKey, buildLegacyBackupStorageKey as buildBackupStorageKey } from "./paths";
export { signEntitlement, verifyEntitlement, importPublicKeyFromPem } from "./entitlement";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = resolveCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    try {
      let response: Response;

      if (request.method === "POST" && url.pathname === "/auth/google") {
        response = await handleAuthGoogle(request, env);
      } else if (request.method === "GET" && url.pathname === "/me") {
        response = await handleMe(request, env);
      } else if (request.method === "POST" && url.pathname === "/auth/refresh") {
        response = await handleAuthRefresh(request, env);
      } else if (request.method === "POST" && url.pathname === "/auth/logout") {
        response = await handleAuthLogout(request, env);
      } else if (request.method === "PUT" && url.pathname === "/backup") {
        response = await handleBackupPut(request, env);
      } else if (request.method === "PUT" && url.pathname === "/sync") {
        response = await handleSyncPut(request, env);
      } else if (request.method === "GET" && url.pathname === "/classrooms") {
        response = await handleListClassrooms(request, env);
      } else if (request.method === "GET" && url.pathname === "/classrooms/registry") {
        response = await handleGetClassroomsRegistry(request, env);
      } else if (request.method === "GET" && url.pathname.startsWith("/restore/")) {
        const rest = decodeURIComponent(url.pathname.slice("/restore/".length));
        if (rest.endsWith("/assets")) {
          const classroomId = rest.slice(0, -"/assets".length);
          response = await handleRestoreAssets(request, env, classroomId);
        } else {
          response = await handleRestore(request, env, rest);
        }
      } else if (request.method === "GET" && url.pathname === "/admin/users") {
        response = await handleAdminListUsers(request, env);
      } else if (request.method === "PATCH" && url.pathname.startsWith("/admin/users/")) {
        const userId = decodeURIComponent(url.pathname.slice("/admin/users/".length));
        response = await handleAdminPatchUser(request, env, userId);
      } else if (request.method === "GET" && url.pathname === "/admin/licenses") {
        response = await handleAdminListLicenses(request, env);
      } else if (request.method === "POST" && url.pathname === "/admin/licenses") {
        response = await handleAdminCreateLicense(request, env);
      } else if (request.method === "PATCH" && url.pathname.startsWith("/admin/licenses/")) {
        const licenseId = decodeURIComponent(url.pathname.slice("/admin/licenses/".length));
        response = await handleAdminPatchLicense(request, env, licenseId);
      } else {
        response = jsonResponse({ ok: false, error: "Not found" }, 404);
      }

      return applyCorsHeaders(response, cors);
    } catch (error) {
      if (error instanceof ValidationError) {
        return applyCorsHeaders(errorResponse("VALIDATION_ERROR", error.message, 400), cors);
      }
      console.error("Unhandled worker error", error);
      return applyCorsHeaders(
        errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500),
        cors,
      );
    }
  },
};
