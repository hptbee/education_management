import type { DbLicense, DbUser, Env, GoogleProfile, LicensePlan, UserRole, UserStatus } from "./types";

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Fallback when `DEFAULT_TRIAL_DAYS` env var is missing or invalid. */
export const DEFAULT_TRIAL_DAYS_FALLBACK = 7;

export function defaultTrialDays(env: Env): number {
  const parsed = Number(env.DEFAULT_TRIAL_DAYS ?? String(DEFAULT_TRIAL_DAYS_FALLBACK));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TRIAL_DAYS_FALLBACK;
}

export async function findUserByGoogleSub(db: D1Database, googleSub: string): Promise<DbUser | null> {
  return await db
    .prepare("SELECT * FROM users WHERE google_sub = ?")
    .bind(googleSub)
    .first<DbUser>();
}

export async function findUserById(db: D1Database, userId: string): Promise<DbUser | null> {
  return await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<DbUser>();
}

export async function listUsers(db: D1Database): Promise<DbUser[]> {
  const result = await db.prepare("SELECT * FROM users ORDER BY created_at DESC").all<DbUser>();
  return result.results ?? [];
}

export async function createUser(
  db: D1Database,
  profile: GoogleProfile,
  role: UserRole,
): Promise<DbUser> {
  const ts = nowIso();
  const user: DbUser = {
    id: createId("usr"),
    google_sub: profile.sub,
    email: profile.email ?? null,
    display_name: profile.name ?? null,
    avatar_url: profile.picture ?? null,
    role,
    status: "active",
    license_version: 1,
    created_at: ts,
    updated_at: ts,
  };

  await db
    .prepare(
      `INSERT INTO users (id, google_sub, email, display_name, avatar_url, role, status, license_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      user.id,
      user.google_sub,
      user.email,
      user.display_name,
      user.avatar_url,
      user.role,
      user.status,
      user.license_version,
      user.created_at,
      user.updated_at,
    )
    .run();

  return user;
}

export async function updateUserProfile(db: D1Database, userId: string, profile: GoogleProfile): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET email = ?, display_name = ?, avatar_url = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(profile.email ?? null, profile.name ?? null, profile.picture ?? null, nowIso(), userId)
    .run();
}

export async function bumpLicenseVersion(db: D1Database, userId: string): Promise<number> {
  const user = await findUserById(db, userId);
  if (!user) throw new Error("User not found");
  const next = user.license_version + 1;
  await db
    .prepare(`UPDATE users SET license_version = ?, updated_at = ? WHERE id = ?`)
    .bind(next, nowIso(), userId)
    .run();
  return next;
}

export async function updateUserStatus(
  db: D1Database,
  userId: string,
  status: UserStatus,
): Promise<DbUser | null> {
  await db
    .prepare(`UPDATE users SET status = ?, updated_at = ? WHERE id = ?`)
    .bind(status, nowIso(), userId)
    .run();
  if (status !== "active") {
    await bumpLicenseVersion(db, userId);
  }
  return findUserById(db, userId);
}

export async function updateUserRole(db: D1Database, userId: string, role: UserRole): Promise<DbUser | null> {
  await db
    .prepare(`UPDATE users SET role = ?, updated_at = ? WHERE id = ?`)
    .bind(role, nowIso(), userId)
    .run();
  return findUserById(db, userId);
}

export async function cancelActiveLicenses(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(`UPDATE licenses SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND status = 'active'`)
    .bind(nowIso(), userId)
    .run();
}

export async function createLicense(
  db: D1Database,
  userId: string,
  plan: LicensePlan,
  startsAt: string,
  expiresAt: string | null,
): Promise<DbLicense> {
  await cancelActiveLicenses(db, userId);
  const ts = nowIso();
  const license: DbLicense = {
    id: createId("lic"),
    user_id: userId,
    plan,
    status: "active",
    starts_at: startsAt,
    expires_at: expiresAt,
    created_at: ts,
    updated_at: ts,
  };

  await db
    .prepare(
      `INSERT INTO licenses (id, user_id, plan, status, starts_at, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      license.id,
      license.user_id,
      license.plan,
      license.status,
      license.starts_at,
      license.expires_at,
      license.created_at,
      license.updated_at,
    )
    .run();

  await bumpLicenseVersion(db, userId);
  return license;
}

export async function createTrialLicense(db: D1Database, userId: string, env: Env): Promise<DbLicense> {
  const days = defaultTrialDays(env);
  const startsAt = nowIso();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return createLicense(db, userId, "trial", startsAt, expiresAt);
}

export async function findActiveLicense(db: D1Database, userId: string): Promise<DbLicense | null> {
  const now = nowIso();
  const license = await db
    .prepare(
      `SELECT * FROM licenses
       WHERE user_id = ? AND status = 'active' AND starts_at <= ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(userId, now)
    .first<DbLicense>();

  if (!license) return null;
  if (license.expires_at && license.expires_at <= now) {
    await db
      .prepare(`UPDATE licenses SET status = 'expired', updated_at = ? WHERE id = ?`)
      .bind(now, license.id)
      .run();
    return null;
  }
  return license;
}

export async function listLicensesForUser(db: D1Database, userId: string): Promise<DbLicense[]> {
  const result = await db
    .prepare(`SELECT * FROM licenses WHERE user_id = ? ORDER BY created_at DESC`)
    .bind(userId)
    .all<DbLicense>();
  return result.results ?? [];
}

export async function findLicenseById(db: D1Database, licenseId: string): Promise<DbLicense | null> {
  return await db.prepare(`SELECT * FROM licenses WHERE id = ?`).bind(licenseId).first<DbLicense>();
}

export async function updateLicense(
  db: D1Database,
  licenseId: string,
  patch: { plan?: LicensePlan; status?: DbLicense["status"]; expires_at?: string | null },
): Promise<DbLicense | null> {
  const existing = await findLicenseById(db, licenseId);
  if (!existing) return null;

  const updated: DbLicense = {
    ...existing,
    plan: patch.plan ?? existing.plan,
    status: patch.status ?? existing.status,
    expires_at: patch.expires_at !== undefined ? patch.expires_at : existing.expires_at,
    updated_at: nowIso(),
  };

  await db
    .prepare(
      `UPDATE licenses SET plan = ?, status = ?, expires_at = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(updated.plan, updated.status, updated.expires_at, updated.updated_at, licenseId)
    .run();

  await bumpLicenseVersion(db, existing.user_id);
  return updated;
}

export async function findOrCreateUserFromGoogle(
  db: D1Database,
  env: Env,
  profile: GoogleProfile,
): Promise<{ user: DbUser; license: DbLicense }> {
  let user = await findUserByGoogleSub(db, profile.sub);

  if (!user) {
    const role: UserRole =
      env.INITIAL_ADMIN_GOOGLE_SUB && env.INITIAL_ADMIN_GOOGLE_SUB === profile.sub ? "admin" : "teacher";
    user = await createUser(db, profile, role);
    const license = await createTrialLicense(db, user.id, env);
    return { user, license };
  }

  await updateUserProfile(db, user.id, profile);
  user = (await findUserById(db, user.id))!;

  let license = await findActiveLicense(db, user.id);
  if (!license) {
    license = await createTrialLicense(db, user.id, env);
  }

  return { user, license };
}
