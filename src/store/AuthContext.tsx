"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, postAuthGoogle, refreshEntitlement } from "@/src/auth/api";
import { mapApiCodeToAccessState, resolveAccessState, verifyEntitlementToken } from "@/src/auth/entitlement";
import { loginWithGoogleDesktop, loginWithGoogleWeb } from "@/src/auth/google-login";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "@/src/auth/secure-storage";
import type { AccessState, AuthLicense, AuthUser, EntitlementPermissions, StoredAuthSession } from "@/src/auth/types";
import { isTauri } from "@/src/database/tauri-fs.service";

interface AuthContextValue {
  isLoading: boolean;
  accessState: AccessState;
  user: AuthUser | null;
  license: AuthLicense | null;
  entitlement: string | null;
  permissions: EntitlementPermissions | null;
  lastVerifiedAt: string | null;
  offlineValidUntil: number | null;
  loginWithGoogle: (idToken?: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [accessState, setAccessState] = useState<AccessState>("AUTH_REQUIRED");
  const [serverDenied, setServerDenied] = useState<AccessState | null>(null);
  const [offlineValidUntil, setOfflineValidUntil] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<EntitlementPermissions | null>(null);

  const recomputeAccess = useCallback(
    async (nextSession: StoredAuthSession | null, denied: AccessState | null = serverDenied) => {
      if (!nextSession) {
        setOfflineValidUntil(null);
        setPermissions(null);
        setAccessState("AUTH_REQUIRED");
        return;
      }

      const verified = await verifyEntitlementToken(nextSession.entitlement);
      setOfflineValidUntil(verified?.claims.offlineValidUntil ?? null);
      setPermissions(verified?.claims.permissions ?? null);
      const state = resolveAccessState({
        hasSession: true,
        claims: verified?.claims ?? null,
        issuedAt: verified?.issuedAt ?? nextSession.lastTrustedIat,
        lastTrustedIat: nextSession.lastTrustedIat,
        isOnline: isOnline(),
        serverDenied: denied,
        licenseExpiresAt: nextSession.license?.expiresAt ?? null,
      });
      setAccessState(state);
    },
    [serverDenied],
  );

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await loadAuthSession();
      setSession(stored);
      setServerDenied(null);
      await recomputeAccess(stored, null);

      if (stored && isOnline()) {
        const refreshed = await refreshEntitlement(stored.entitlement);
        if (refreshed.ok) {
          const verified = await verifyEntitlementToken(refreshed.entitlement);
          const next: StoredAuthSession = {
            entitlement: refreshed.entitlement,
            user: refreshed.user,
            license: refreshed.license,
            lastVerifiedAt: new Date().toISOString(),
            lastTrustedIat: verified?.issuedAt ?? Math.floor(Date.now() / 1000),
          };
          await saveAuthSession(next);
          setSession(next);
          setServerDenied(null);
          await recomputeAccess(next, null);
        } else {
          const denied = mapApiCodeToAccessState(refreshed.code);
          setServerDenied(denied);
          await recomputeAccess(stored, denied);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [recomputeAccess]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const loginWithGoogle = useCallback(
    async (idToken?: string) => {
      setIsLoading(true);
      try {
        let result;
        if (idToken) {
          result = await postAuthGoogle(await loginWithGoogleWeb(idToken));
        } else if (isTauri()) {
          const oauth = await loginWithGoogleDesktop();
          result = await postAuthGoogle({
            code: oauth.code,
            codeVerifier: oauth.codeVerifier,
            redirectUri: oauth.redirectUri,
          });
        } else {
          throw new Error("Vui lòng đăng nhập bằng Google trên web.");
        }

        if (!result.ok) {
          const denied = mapApiCodeToAccessState(result.code) ?? "AUTH_REQUIRED";
          setServerDenied(denied);
          setAccessState(denied);
          return;
        }

        const verified = await verifyEntitlementToken(result.entitlement);
        const next: StoredAuthSession = {
          entitlement: result.entitlement,
          user: result.user,
          license: result.license,
          lastVerifiedAt: new Date().toISOString(),
          lastTrustedIat: verified?.issuedAt ?? Math.floor(Date.now() / 1000),
        };
        await saveAuthSession(next);
        setSession(next);
        setServerDenied(null);
        await recomputeAccess(next, null);
      } finally {
        setIsLoading(false);
      }
    },
    [recomputeAccess],
  );

  const refreshSession = useCallback(async () => {
    if (!session) return;
    if (!isOnline()) {
      await recomputeAccess(session, serverDenied);
      return;
    }

    const refreshed = await refreshEntitlement(session.entitlement);
    if (refreshed.ok) {
      const verified = await verifyEntitlementToken(refreshed.entitlement);
      const next: StoredAuthSession = {
        entitlement: refreshed.entitlement,
        user: refreshed.user,
        license: refreshed.license,
        lastVerifiedAt: new Date().toISOString(),
        lastTrustedIat: verified?.issuedAt ?? Math.floor(Date.now() / 1000),
      };
      await saveAuthSession(next);
      setSession(next);
      setServerDenied(null);
      await recomputeAccess(next, null);
      return;
    }

    const me = await fetchMe(session.entitlement);
    if (!me.ok) {
      const denied = mapApiCodeToAccessState(me.code);
      setServerDenied(denied);
      await recomputeAccess(session, denied);
      return;
    }

    const next: StoredAuthSession = {
      ...session,
      user: me.user,
      license: me.license,
      lastVerifiedAt: new Date().toISOString(),
    };
    await saveAuthSession(next);
    setSession(next);
    await recomputeAccess(next, serverDenied);
  }, [recomputeAccess, serverDenied, session]);

  const logout = useCallback(async () => {
    await clearAuthSession();
    setSession(null);
    setServerDenied(null);
    setOfflineValidUntil(null);
    setPermissions(null);
    setAccessState("AUTH_REQUIRED");
  }, []);

  useEffect(() => {
    const onOnline = () => {
      void refreshSession();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refreshSession]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !isOnline()) return;
      void refreshSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      accessState,
      user: session?.user ?? null,
      license: session?.license ?? null,
      entitlement: session?.entitlement ?? null,
      permissions,
      lastVerifiedAt: session?.lastVerifiedAt ?? null,
      offlineValidUntil,
      loginWithGoogle,
      refreshSession,
      logout,
    }),
    [accessState, isLoading, loginWithGoogle, logout, offlineValidUntil, permissions, refreshSession, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
