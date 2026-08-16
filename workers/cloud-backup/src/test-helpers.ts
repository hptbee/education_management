import * as jose from "jose";
import type { DbLicense, DbUser } from "./types";

type Row = Record<string, unknown>;

export class MockD1 {
  users: DbUser[] = [];
  licenses: DbLicense[] = [];

  prepare(query: string) {
    const db = this;
    const runner = (args: unknown[]) => ({
      async first<T>(): Promise<T | null> {
        const row = db.runQuery(query, args, "first");
        return (row as T) ?? null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        const rows = db.runQuery(query, args, "all") as T[];
        return { results: rows };
      },
      async run(): Promise<{ success: boolean }> {
        db.runMutation(query, args);
        return { success: true };
      },
    });

    return {
      bind(...args: unknown[]) {
        return runner(args);
      },
      first<T>(): Promise<T | null> {
        return runner([]).first<T>();
      },
      all<T>(): Promise<{ results: T[] }> {
        return runner([]).all<T>();
      },
      run(): Promise<{ success: boolean }> {
        return runner([]).run();
      },
    };
  }

  private runQuery(query: string, args: unknown[], mode: "first" | "all"): unknown {
    const q = query.replace(/\s+/g, " ").trim().toLowerCase();

    if (q.startsWith("select * from users where google_sub")) {
      const found = this.users.find((u) => u.google_sub === args[0]);
      return mode === "first" ? found ?? null : found ? [found] : [];
    }
    if (q.startsWith("select * from users where id")) {
      const found = this.users.find((u) => u.id === args[0]);
      return mode === "first" ? found ?? null : found ? [found] : [];
    }
    if (q.startsWith("select * from users order")) {
      return mode === "first" ? this.users[0] ?? null : [...this.users];
    }
    if (q.includes("from licenses") && q.includes("user_id = ? and status = 'active'")) {
      const now = args[1] as string;
      const found = this.licenses
        .filter((l) => l.user_id === args[0] && l.status === "active" && l.starts_at <= now)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      if (found?.expires_at && found.expires_at <= now) {
        found.status = "expired";
        return mode === "first" ? null : [];
      }
      return mode === "first" ? found ?? null : found ? [found] : [];
    }
    if (q.startsWith("select * from licenses where user_id")) {
      const rows = this.licenses.filter((l) => l.user_id === args[0]);
      return mode === "first" ? rows[0] ?? null : rows;
    }
    if (q.startsWith("select * from licenses where id")) {
      const found = this.licenses.find((l) => l.id === args[0]);
      return mode === "first" ? found ?? null : found ? [found] : [];
    }

    return mode === "first" ? null : [];
  }

  private runMutation(query: string, args: unknown[]): void {
    const q = query.replace(/\s+/g, " ").trim().toLowerCase();

    if (q.startsWith("insert into users")) {
      const user: DbUser = {
        id: args[0] as string,
        google_sub: args[1] as string,
        email: args[2] as string | null,
        display_name: args[3] as string | null,
        avatar_url: args[4] as string | null,
        role: args[5] as DbUser["role"],
        status: args[6] as DbUser["status"],
        license_version: args[7] as number,
        created_at: args[8] as string,
        updated_at: args[9] as string,
      };
      this.users.push(user);
      return;
    }

    if (q.startsWith("update users set email")) {
      const user = this.users.find((u) => u.id === args[4]);
      if (user) {
        user.email = args[0] as string | null;
        user.display_name = args[1] as string | null;
        user.avatar_url = args[2] as string | null;
        user.updated_at = args[3] as string;
      }
      return;
    }

    if (q.startsWith("update users set license_version")) {
      const user = this.users.find((u) => u.id === args[2]);
      if (user) {
        user.license_version = args[0] as number;
        user.updated_at = args[1] as string;
      }
      return;
    }

    if (q.startsWith("update users set status")) {
      const user = this.users.find((u) => u.id === args[2]);
      if (user) {
        user.status = args[0] as DbUser["status"];
        user.updated_at = args[1] as string;
      }
      return;
    }

    if (q.startsWith("update users set role")) {
      const user = this.users.find((u) => u.id === args[2]);
      if (user) {
        user.role = args[0] as DbUser["role"];
        user.updated_at = args[1] as string;
      }
      return;
    }

    if (q.startsWith("update licenses set status = 'cancelled'")) {
      for (const lic of this.licenses) {
        if (lic.user_id === args[1] && lic.status === "active") {
          lic.status = "cancelled";
          lic.updated_at = args[0] as string;
        }
      }
      return;
    }

    if (q.startsWith("insert into licenses")) {
      const license: DbLicense = {
        id: args[0] as string,
        user_id: args[1] as string,
        plan: args[2] as DbLicense["plan"],
        status: args[3] as DbLicense["status"],
        starts_at: args[4] as string,
        expires_at: args[5] as string | null,
        created_at: args[6] as string,
        updated_at: args[7] as string,
      };
      this.licenses.push(license);
      return;
    }

    if (q.startsWith("update licenses set status = 'expired'")) {
      const lic = this.licenses.find((l) => l.id === args[1]);
      if (lic) {
        lic.status = "expired";
        lic.updated_at = args[0] as string;
      }
      return;
    }

    if (q.startsWith("update licenses set plan")) {
      const lic = this.licenses.find((l) => l.id === args[4]);
      if (lic) {
        lic.plan = args[0] as DbLicense["plan"];
        lic.status = args[1] as DbLicense["status"];
        lic.expires_at = args[2] as string | null;
        lic.updated_at = args[3] as string;
      }
    }
  }
}

export async function generateTestKeys(): Promise<{ privateKeyPem: string; publicKeyPem: string }> {
  const { privateKey, publicKey } = await jose.generateKeyPair("EdDSA", { extractable: true });
  const privateKeyPem = await jose.exportPKCS8(privateKey);
  const publicKeyPem = await jose.exportSPKI(publicKey);
  return { privateKeyPem, publicKeyPem };
}

export function makeTestEnv(
  mockDb: MockD1,
  privateKeyPem: string,
  publicKeyPem: string,
): import("./types").Env {
  return {
    BACKUP_BUCKET: {
      put: async () => undefined,
      get: async () => null,
      list: async () => ({ objects: [] }),
    } as unknown as R2Bucket,
    DB: mockDb as unknown as D1Database,
    GOOGLE_CLIENT_ID: "test-client-id",
    ENTITLEMENT_PRIVATE_KEY: privateKeyPem,
    ENTITLEMENT_PUBLIC_KEY: publicKeyPem,
    DEFAULT_TRIAL_DAYS: "30",
  };
}
