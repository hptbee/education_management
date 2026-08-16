import { describe, expect, it } from "vitest";
import {
  bumpLicenseVersion,
  createId,
  createLicense,
  createTrialLicense,
  createUser,
  DEFAULT_TRIAL_DAYS_FALLBACK,
  defaultTrialDays,
  findActiveLicense,
  findLicenseById,
  findOrCreateUserFromGoogle,
  findUserByGoogleSub,
  findUserById,
  listLicensesForUser,
  listUsers,
  nowIso,
  updateLicense,
  updateUserProfile,
  updateUserRole,
  updateUserStatus,
} from "./db";
import { generateTestKeys, makeTestEnv, MockD1 } from "./test-helpers";

describe("db helpers", () => {
  it("creates ids with prefix", () => {
    expect(createId("usr")).toMatch(/^usr_/);
  });

  it("returns iso timestamp", () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("parses default trial days", () => {
    const env = makeTestEnv(new MockD1(), "", "");
    expect(DEFAULT_TRIAL_DAYS_FALLBACK).toBe(7);
    expect(defaultTrialDays(env)).toBe(7);
    expect(defaultTrialDays({ ...env, DEFAULT_TRIAL_DAYS: "14" })).toBe(14);
    expect(defaultTrialDays({ ...env, DEFAULT_TRIAL_DAYS: "invalid" })).toBe(7);
  });
});

describe("db users and licenses", () => {
  it("creates and finds user by google sub", async () => {
    const mockDb = new MockD1();
    const db = mockDb as unknown as D1Database;
    const user = await createUser(db, { sub: "google-1", email: "a@example.com", name: "A" }, "teacher");
    const found = await findUserByGoogleSub(db, "google-1");
    expect(found?.id).toBe(user.id);
    expect(await findUserById(db, user.id)).not.toBeNull();
  });

  it("lists users", async () => {
    const mockDb = new MockD1();
    const db = mockDb as unknown as D1Database;
    await createUser(db, { sub: "g1" }, "teacher");
    expect((await listUsers(db)).length).toBe(1);
  });

  it("updates user profile and status", async () => {
    const mockDb = new MockD1();
    const db = mockDb as unknown as D1Database;
    const user = await createUser(db, { sub: "g2" }, "teacher");
    await updateUserProfile(db, user.id, { sub: "g2", email: "new@example.com", name: "New" });
    const updated = await updateUserStatus(db, user.id, "suspended");
    expect(updated?.status).toBe("suspended");
    const roleUpdated = await updateUserRole(db, user.id, "admin");
    expect(roleUpdated?.role).toBe("admin");
  });

  it("creates trial license and bumps license version", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    const db = mockDb as unknown as D1Database;
    const user = await createUser(db, { sub: "trial-user" }, "teacher");
    const before = Date.now();
    const license = await createTrialLicense(db, user.id, env);
    const after = Date.now();
    expect(license.plan).toBe("trial");
    expect(license.expires_at).not.toBeNull();
    const expiresMs = new Date(license.expires_at!).getTime();
    const minMs = before + DEFAULT_TRIAL_DAYS_FALLBACK * 24 * 60 * 60 * 1000;
    const maxMs = after + DEFAULT_TRIAL_DAYS_FALLBACK * 24 * 60 * 60 * 1000;
    expect(expiresMs).toBeGreaterThanOrEqual(minMs - 1000);
    expect(expiresMs).toBeLessThanOrEqual(maxMs + 1000);
    const active = await findActiveLicense(db, user.id);
    expect(active?.id).toBe(license.id);
    const nextVersion = await bumpLicenseVersion(db, user.id);
    expect(nextVersion).toBeGreaterThan(1);
  });

  it("creates license and updates it", async () => {
    const mockDb = new MockD1();
    const db = mockDb as unknown as D1Database;
    const user = await createUser(db, { sub: "lic-user" }, "teacher");
    const license = await createLicense(db, user.id, "premium", nowIso(), null);
    const listed = await listLicensesForUser(db, user.id);
    expect(listed.length).toBe(1);
    const byId = await findLicenseById(db, license.id);
    expect(byId?.plan).toBe("premium");
    const patched = await updateLicense(db, license.id, { plan: "lifetime" });
    expect(patched?.plan).toBe("lifetime");
  });

  it("findOrCreateUserFromGoogle creates trial on first login", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    const db = mockDb as unknown as D1Database;
    const result = await findOrCreateUserFromGoogle(db, env, { sub: "new-google", email: "n@example.com" });
    expect(result.user.google_sub).toBe("new-google");
    expect(result.license.plan).toBe("trial");
  });

  it("findOrCreateUserFromGoogle returns existing user", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    const db = mockDb as unknown as D1Database;
    await findOrCreateUserFromGoogle(db, env, { sub: "existing" });
    const again = await findOrCreateUserFromGoogle(db, env, { sub: "existing", email: "e@example.com" });
    expect(again.user.google_sub).toBe("existing");
  });
});
