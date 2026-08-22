import { findActiveLicense, findOrCreateUserFromGoogle, findUserById, bumpLicenseVersion } from "./db";
import {
  accessErrorForLicense,
  accessErrorForUser,
  permissionsForPlan,
  publicLicense,
  publicUser,
  signEntitlement,
  verifyEntitlement,
} from "./entitlement";
import { errorResponse, jsonResponse, readBearerToken, readJsonWithLimit } from "./http";
import { defaultGoogleVerifier, type GoogleVerifier } from "./google";

export async function handleAuthGoogle(
  request: Request,
  env: Env,
  verifyGoogle: GoogleVerifier = (input) =>
    defaultGoogleVerifier(
      {
        webClientId: env.GOOGLE_CLIENT_ID,
        desktopClientId: env.GOOGLE_CLIENT_ID_DESKTOP,
        desktopClientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      input,
    ),
): Promise<Response> {
  let body: {
    idToken?: string;
    code?: string;
    codeVerifier?: string;
    redirectUri?: string;
  };
  try {
    body = await readJsonWithLimit(request);
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400);
  }

  let profile;
  try {
    profile = await verifyGoogle(body);
  } catch {
    return errorResponse("AUTH_REQUIRED", "Invalid Google authentication", 401);
  }

  const { user, license } = await findOrCreateUserFromGoogle(env.DB, env, profile);

  const userError = accessErrorForUser(user);
  if (userError) {
    return errorResponse(userError, "Account is not active", 403);
  }

  const licenseError = accessErrorForLicense(license);
  if (licenseError) {
    return errorResponse(licenseError, "License is not active", 403);
  }

  const userForToken = (await findUserById(env.DB, user.id)) ?? user;
  const entitlement = await signEntitlement(env, userForToken, license);
  return jsonResponse({
    ok: true,
    entitlement,
    user: publicUser(userForToken),
    license: publicLicense(license),
  });
}

export async function handleMe(request: Request, env: Env): Promise<Response> {
  const token = readBearerToken(request);
  if (!token) {
    return errorResponse("AUTH_REQUIRED", "Authentication required", 401);
  }

  let verified;
  try {
    verified = await verifyEntitlement(env, token);
  } catch {
    return errorResponse("AUTH_REQUIRED", "Invalid entitlement", 401);
  }

  const user = await findUserById(env.DB, verified.claims.userId);
  if (!user) {
    return errorResponse("AUTH_REQUIRED", "User not found", 401);
  }

  const userError = accessErrorForUser(user);
  if (userError) {
    return errorResponse(userError, "Account is not active", 403);
  }

  const license = await findActiveLicense(env.DB, user.id);
  const licenseError = accessErrorForLicense(license);
  if (licenseError) {
    return errorResponse(licenseError, "License is not active", 403);
  }

  if (user.license_version !== verified.claims.licenseVersion) {
    return errorResponse("AUTH_REQUIRED", "Entitlement outdated", 401);
  }

  return jsonResponse({
    ok: true,
    user: publicUser(user),
    license: license ? publicLicense(license) : null,
    permissions: permissionsForPlan(license!.plan),
  });
}

export async function handleAuthRefresh(request: Request, env: Env): Promise<Response> {
  const token = readBearerToken(request);
  if (!token) {
    return errorResponse("AUTH_REQUIRED", "Authentication required", 401);
  }

  let verified;
  try {
    verified = await verifyEntitlement(env, token, { allowOfflineGraceExpiry: true });
  } catch {
    return errorResponse("AUTH_REQUIRED", "Invalid entitlement", 401);
  }

  const now = Math.floor(Date.now() / 1000);
  if (Number(verified.claims.offlineValidUntil) < now) {
    return errorResponse("AUTH_REQUIRED", "Entitlement expired", 401);
  }

  const user = await findUserById(env.DB, verified.claims.userId);
  if (!user) {
    return errorResponse("AUTH_REQUIRED", "User not found", 401);
  }

  const userError = accessErrorForUser(user);
  if (userError) {
    return errorResponse(userError, "Account is not active", 403);
  }

  const license = await findActiveLicense(env.DB, user.id);
  const licenseError = accessErrorForLicense(license);
  if (licenseError) {
    return errorResponse(licenseError, "License is not active", 403);
  }

  if (user.license_version !== verified.claims.licenseVersion) {
    return errorResponse("AUTH_REQUIRED", "Entitlement outdated", 401);
  }

  const entitlement = await signEntitlement(env, user, license!);
  return jsonResponse({
    ok: true,
    entitlement,
    user: publicUser(user),
    license: publicLicense(license!),
  });
}

export async function handleAuthLogout(request: Request, env: Env): Promise<Response> {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;
  await bumpLicenseVersion(env.DB, auth.user.id);
  return new Response(null, { status: 204 });
}

export async function requireAuth(request: Request, env: Env) {
  const token = readBearerToken(request);
  if (!token) {
    return { error: errorResponse("AUTH_REQUIRED", "Authentication required", 401) };
  }

  let verified;
  try {
    verified = await verifyEntitlement(env, token);
  } catch {
    return { error: errorResponse("AUTH_REQUIRED", "Invalid entitlement", 401) };
  }

  const user = await findUserById(env.DB, verified.claims.userId);
  if (!user) {
    return { error: errorResponse("AUTH_REQUIRED", "User not found", 401) };
  }

  const userError = accessErrorForUser(user);
  if (userError) {
    return { error: errorResponse(userError, "Account is not active", 403) };
  }

  if (user.license_version !== verified.claims.licenseVersion) {
    return { error: errorResponse("AUTH_REQUIRED", "Entitlement outdated", 401) };
  }

  const license = await findActiveLicense(env.DB, user.id);
  const licenseError = accessErrorForLicense(license);
  if (licenseError) {
    return { error: errorResponse(licenseError, "License is not active", 403) };
  }

  const permissions = permissionsForPlan(license!.plan);

  return { user, license: license!, permissions, claims: verified.claims, token };
}

export async function requireCloudBackup(request: Request, env: Env) {
  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth;

  if (!auth.permissions.cloudBackup) {
    return { error: errorResponse("FORBIDDEN", "Cloud backup not permitted", 403) };
  }

  return auth;
}
