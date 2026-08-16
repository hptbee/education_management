import { describe, expect, it } from "vitest";
import * as jose from "jose";
import worker, { buildUserClassroomKey, sanitizeBackupIdentifier } from "./index";
import { handleAuthGoogle } from "./auth-handlers";
import { signEntitlement, verifyEntitlement, permissionsForPlan } from "./entitlement";
import { generateTestKeys, makeTestEnv, MockD1 } from "./test-helpers";
import { createLicense, createUser, findUserById, updateUserStatus } from "./db";

describe("paths", () => {
  it("builds per-user classroom keys", () => {
    expect(buildUserClassroomKey("usr_abc", "2-7_2026-2027")).toBe(
      "users/usr_abc/classrooms/2-7_2026-2027/database.json",
    );
  });

  it("rejects unsafe identifiers", () => {
    expect(sanitizeBackupIdentifier("../evil")).toBeNull();
    expect(() => buildUserClassroomKey("bad/id", "ok")).toThrow();
  });
});

describe("auth and entitlement", () => {
  it("creates user on first Google login and issues entitlement", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);

    const response = await handleAuthGoogle(
      new Request("https://example.com/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "mock" }),
      }),
      env,
      async () => ({
        sub: "google-sub-1",
        email: "teacher@example.com",
        name: "Cô Thảo",
      }),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as { entitlement: string; user: { id: string } };
    expect(json.user.id).toMatch(/^usr_/);
    const verified = await verifyEntitlement(env, json.entitlement);
    expect(verified.claims.userId).toBe(json.user.id);
    expect(verified.claims.permissions.appAccess).toBe(true);
    expect(verified.claims.permissions.cloudBackup).toBe(false);
  });

  it("refreshes entitlement when only private key is configured on worker", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    const privateOnlyEnv = { ...env, ENTITLEMENT_PUBLIC_KEY: "" };

    const login = await handleAuthGoogle(
      new Request("https://example.com/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "mock" }),
      }),
      env,
      async () => ({ sub: "refresh-sub", email: "r@example.com" }),
    );
    const { entitlement } = (await login.json()) as { entitlement: string };

    const response = await worker.fetch(
      new Request("https://example.com/auth/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${entitlement}` },
      }),
      privateOnlyEnv,
    );

    expect(response.status).toBe(200);
  });

  it("rejects disabled user on refresh", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);

    const user = await createUser(mockDb as unknown as D1Database, {
      sub: "sub-disabled",
      email: "d@example.com",
    }, "teacher");
    const license = await createLicense(
      mockDb as unknown as D1Database,
      user.id,
      "lifetime",
      new Date().toISOString(),
      null,
    );
    const disabledUser = (await updateUserStatus(mockDb as unknown as D1Database, user.id, "disabled"))!;
    const entitlement = await signEntitlement(env, disabledUser, license);

    const response = await worker.fetch(
      new Request("https://example.com/auth/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${entitlement}` },
      }),
      env,
    );

    expect(response.status).toBe(403);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("ACCOUNT_DISABLED");
  });

  it("rejects tampered entitlement", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);

    const user = await createUser(mockDb as unknown as D1Database, { sub: "sub-1" }, "teacher");
    const license = await createLicense(
      mockDb as unknown as D1Database,
      user.id,
      "premium",
      new Date().toISOString(),
      null,
    );
    const entitlement = await signEntitlement(env, user, license);
    const tampered = `${entitlement}x`;

    await expect(verifyEntitlement(env, tampered)).rejects.toThrow();
  });

  it("teacher cannot access admin APIs", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);

    const user = await createUser(mockDb as unknown as D1Database, { sub: "teacher-sub" }, "teacher");
    const license = await createLicense(
      mockDb as unknown as D1Database,
      user.id,
      "trial",
      new Date().toISOString(),
      new Date(Date.now() + 86400000).toISOString(),
    );
    const userFromDb = (await findUserById(mockDb as unknown as D1Database, user.id))!;
    const entitlement = await signEntitlement(env, userFromDb, license);

    const response = await worker.fetch(
      new Request("https://example.com/admin/users", {
        headers: { Authorization: `Bearer ${entitlement}` },
      }),
      env,
    );

    expect(response.status).toBe(403);
  });
});

describe("permissionsForPlan", () => {
  it("grants cloud backup for premium and lifetime", () => {
    expect(permissionsForPlan("premium").cloudBackup).toBe(true);
    expect(permissionsForPlan("lifetime").cloudBackup).toBe(true);
  });

  it("denies cloud backup for trial and basic", () => {
    expect(permissionsForPlan("trial").cloudBackup).toBe(false);
    expect(permissionsForPlan("trial").appAccess).toBe(true);
    const basic = permissionsForPlan("basic");
    expect(basic.appAccess).toBe(true);
    expect(basic.cloudBackup).toBe(false);
  });
});

describe("plan tier enforcement", () => {
  async function entitlementForPlan(plan: "trial" | "basic" | "premium", role: "teacher" | "admin" = "teacher") {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    const user = await createUser(mockDb as unknown as D1Database, { sub: `sub-${plan}-${role}` }, role);
    const license = await createLicense(
      mockDb as unknown as D1Database,
      user.id,
      plan,
      new Date().toISOString(),
      plan === "basic" || plan === "trial" ? new Date(Date.now() + 86400000).toISOString() : null,
    );
    const userFromDb = (await findUserById(mockDb as unknown as D1Database, user.id))!;
    const entitlement = await signEntitlement(env, userFromDb, license);
    return { env, user: userFromDb, entitlement };
  }

  it("trial plan entitlement excludes cloud backup", async () => {
    const { env, entitlement } = await entitlementForPlan("trial");
    const verified = await verifyEntitlement(env, entitlement);
    expect(verified.claims.permissions.cloudBackup).toBe(false);
    expect(verified.claims.permissions.appAccess).toBe(true);
  });

  it("basic plan entitlement excludes cloud backup", async () => {
    const { env, entitlement } = await entitlementForPlan("basic");
    const verified = await verifyEntitlement(env, entitlement);
    expect(verified.claims.permissions.cloudBackup).toBe(false);
    expect(verified.claims.permissions.appAccess).toBe(true);
  });

  it("premium plan entitlement includes cloud backup", async () => {
    const { env, entitlement } = await entitlementForPlan("premium");
    const verified = await verifyEntitlement(env, entitlement);
    expect(verified.claims.permissions.cloudBackup).toBe(true);
  });

  it("GET /me succeeds for basic plan", async () => {
    const { env, entitlement } = await entitlementForPlan("basic");
    const response = await worker.fetch(
      new Request("https://example.com/me", {
        headers: { Authorization: `Bearer ${entitlement}` },
      }),
      env,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { permissions: { cloudBackup: boolean } };
    expect(body.permissions.cloudBackup).toBe(false);
  });

  it("PUT /backup returns 403 for trial plan", async () => {
    const { env, entitlement } = await entitlementForPlan("trial");
    const response = await worker.fetch(
      new Request("https://example.com/backup", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${entitlement}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classroomId: "2-7_2026-2027",
          fileName: "class.json",
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          payload: { students: [] },
        }),
      }),
      env,
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("PUT /backup returns 403 for basic plan", async () => {
    const { env, entitlement } = await entitlementForPlan("basic");
    const response = await worker.fetch(
      new Request("https://example.com/backup", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${entitlement}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classroomId: "2-7_2026-2027",
          fileName: "class.json",
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          payload: { students: [] },
        }),
      }),
      env,
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("admin on basic plan can access admin APIs", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    const user = await createUser(mockDb as unknown as D1Database, { sub: "admin-basic" }, "admin");
    const license = await createLicense(
      mockDb as unknown as D1Database,
      user.id,
      "basic",
      new Date().toISOString(),
      null,
    );
    const adminUser = (await findUserById(mockDb as unknown as D1Database, user.id))!;
    const entitlement = await signEntitlement(env, adminUser, license);

    const response = await worker.fetch(
      new Request("https://example.com/admin/users", {
        headers: { Authorization: `Bearer ${entitlement}` },
      }),
      env,
    );

    if (response.status !== 200) {
      const body = await response.text();
      throw new Error(`Expected 200, got ${response.status}: ${body}`);
    }
    expect(response.status).toBe(200);
  });
});

describe("backup ownership", () => {
  it("stores backup under authenticated user prefix", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const putKeys: string[] = [];
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    env.BACKUP_BUCKET = {
      put: async (key: string) => {
        putKeys.push(key);
      },
      get: async () => null,
      list: async () => ({ objects: [] }),
    } as unknown as R2Bucket;

    const user = await createUser(mockDb as unknown as D1Database, { sub: "backup-sub" }, "teacher");
    const license = await createLicense(
      mockDb as unknown as D1Database,
      user.id,
      "premium",
      new Date().toISOString(),
      null,
    );
    const userFromDb = (await findUserById(mockDb as unknown as D1Database, user.id))!;
    const entitlement = await signEntitlement(env, userFromDb, license);

    const response = await worker.fetch(
      new Request("https://example.com/backup", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${entitlement}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classroomId: "2-7_2026-2027",
          fileName: "class.json",
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          payload: {
            metadata: { id: "2-7_2026-2027", version: 1 },
            students: [],
          },
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(putKeys[0]).toBe(`users/${user.id}/classrooms/2-7_2026-2027/database.json`);
  });

  it("returns 401 without entitlement", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const env = makeTestEnv(new MockD1(), privateKeyPem, publicKeyPem);

    const response = await worker.fetch(
      new Request("https://example.com/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroomId: "c1",
          fileName: "class.json",
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          payload: {},
        }),
      }),
      env,
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 when payload is not an object", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    env.BACKUP_BUCKET = {
      put: async () => undefined,
      get: async () => null,
      list: async () => ({ objects: [] }),
    } as unknown as R2Bucket;

    const user = await createUser(mockDb as unknown as D1Database, { sub: "backup-invalid-payload" }, "teacher");
    const license = await createLicense(
      mockDb as unknown as D1Database,
      user.id,
      "premium",
      new Date().toISOString(),
      null,
    );
    const userFromDb = (await findUserById(mockDb as unknown as D1Database, user.id))!;
    const entitlement = await signEntitlement(env, userFromDb, license);

    const response = await worker.fetch(
      new Request("https://example.com/backup", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${entitlement}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classroomId: "2-7_2026-2027",
          fileName: "class.json",
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          payload: null,
        }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("VALIDATION_ERROR");
  });
});

describe("classroom list and restore", () => {
  it("lists classrooms for premium user", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);

    const user = await createUser(mockDb as unknown as D1Database, { sub: "list-sub" }, "teacher");
    env.BACKUP_BUCKET = {
      put: async () => undefined,
      get: async () => null,
      list: async () => ({
        objects: [
          {
            key: `users/${user.id}/classrooms/2-7_2026-2027/database.json`,
            uploaded: new Date(),
            size: 42,
          },
        ],
      }),
    } as unknown as R2Bucket;

    const license = await createLicense(
      mockDb as unknown as D1Database,
      user.id,
      "premium",
      new Date().toISOString(),
      null,
    );
    const userFromDb = (await findUserById(mockDb as unknown as D1Database, user.id))!;
    const entitlement = await signEntitlement(env, userFromDb, license);

    const response = await worker.fetch(
      new Request("https://example.com/classrooms", {
        headers: { Authorization: `Bearer ${entitlement}` },
      }),
      env,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { classrooms: Array<{ classroomId: string }> };
    expect(body.classrooms.length).toBe(1);
    expect(body.classrooms[0].classroomId).toBe("2-7_2026-2027");
  });

  it("restores classroom payload", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    const payload = { students: [{ id: "s1" }] };
    env.BACKUP_BUCKET = {
      put: async () => undefined,
      get: async () => ({
        text: async () => JSON.stringify(payload),
      }),
      list: async () => ({ objects: [] }),
    } as unknown as R2Bucket;

    const user = await createUser(mockDb as unknown as D1Database, { sub: "restore-sub" }, "teacher");
    const license = await createLicense(
      mockDb as unknown as D1Database,
      user.id,
      "premium",
      new Date().toISOString(),
      null,
    );
    const userFromDb = (await findUserById(mockDb as unknown as D1Database, user.id))!;
    const entitlement = await signEntitlement(env, userFromDb, license);

    const response = await worker.fetch(
      new Request("https://example.com/restore/2-7_2026-2027", {
        headers: { Authorization: `Bearer ${entitlement}` },
      }),
      env,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { students: unknown[] };
    expect(body.students.length).toBe(1);
  });
});

describe("admin patch handlers", () => {
  it("patches user status as admin", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    const admin = await createUser(mockDb as unknown as D1Database, { sub: "admin-patch" }, "admin");
    const target = await createUser(mockDb as unknown as D1Database, { sub: "target-user" }, "teacher");
    const adminLicense = await createLicense(
      mockDb as unknown as D1Database,
      admin.id,
      "lifetime",
      new Date().toISOString(),
      null,
    );
    const adminFromDb = (await findUserById(mockDb as unknown as D1Database, admin.id))!;
    const entitlement = await signEntitlement(env, adminFromDb, adminLicense);

    const response = await worker.fetch(
      new Request(`https://example.com/admin/users/${target.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${entitlement}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "disabled" }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    const updated = await findUserById(mockDb as unknown as D1Database, target.id);
    expect(updated?.status).toBe("disabled");
  });

  it("patches license plan as admin", async () => {
    const { privateKeyPem, publicKeyPem } = await generateTestKeys();
    const mockDb = new MockD1();
    const env = makeTestEnv(mockDb, privateKeyPem, publicKeyPem);
    const admin = await createUser(mockDb as unknown as D1Database, { sub: "admin-lic" }, "admin");
    const teacher = await createUser(mockDb as unknown as D1Database, { sub: "teacher-lic" }, "teacher");
    const license = await createLicense(
      mockDb as unknown as D1Database,
      teacher.id,
      "trial",
      new Date().toISOString(),
      new Date(Date.now() + 86400000).toISOString(),
    );
    const adminLicense = await createLicense(
      mockDb as unknown as D1Database,
      admin.id,
      "lifetime",
      new Date().toISOString(),
      null,
    );
    const adminFromDb = (await findUserById(mockDb as unknown as D1Database, admin.id))!;
    const entitlement = await signEntitlement(env, adminFromDb, adminLicense);

    const response = await worker.fetch(
      new Request(`https://example.com/admin/licenses/${license.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${entitlement}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: "premium", status: "active", expiresAt: null }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { license: { plan: string } };
    expect(body.license.plan).toBe("premium");
  });
});
