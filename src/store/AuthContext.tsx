"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, postAuthGoogle, postAuthLogout, refreshEntitlement } from "@/src/auth/api";
import { mapApiCodeToAccessState, resolveAccessState, verifyEntitlementToken } from "@/src/auth/entitlement";
import { loginWithGoogleDesktop, loginWithGoogleWeb } from "@/src/auth/google-login";
import {
  clearLoginCancel,
  isLoginCancelRequested,
  LoginCancelledError,
  requestLoginCancel,
} from "@/src/auth/login-cancel";
import { clearAuthSession, loadAuthSession, rememberAuthSession, saveAuthSession } from "@/src/auth/secure-storage";
import type {
  AccessState,
  AuthLicense,
  AuthUser,
  EntitlementPermissions,
  LoginStep,
  StoredAuthSession,
} from "@/src/auth/types";
import { isTauri } from "@/src/database/tauri-fs.service";

interface AuthContextValue {
  isLoading: boolean;
  isBootstrapping: boolean;
  isLoggingIn: boolean;
  loginStep: LoginStep | null;
  accessState: AccessState;
  user: AuthUser | null;
  license: AuthLicense | null;
  entitlement: string | null;
  permissions: EntitlementPermissions | null;
  lastVerifiedAt: string | null;
  offlineValidUntil: number | null;
  loginWithGoogle: (idToken?: string) => Promise<void>;
  cancelLogin: () => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep | null>(null);
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [accessState, setAccessState] = useState<AccessState>("AUTH_REQUIRED");
  const [serverDenied, setServerDenied] = useState<AccessState | null>(null);
  const [offlineValidUntil, setOfflineValidUntil] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<EntitlementPermissions | null>(null);

  const cacheAndSetSession = useCallback((next: StoredAuthSession | null) => {
    if (next) rememberAuthSession(next);
    setSession(next);
  }, []);

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
      });
      setAccessState(state);
    },
    [serverDenied],
  );

  const bootstrap = useCallback(async () => {
    setIsBootstrapping(true);
    try {
      const stored = await loadAuthSession();
      cacheAndSetSession(stored);
      setServerDenied(null);
      await recomputeAccess(stored, null);

      if (stored && isOnline()) {
        try {
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
            cacheAndSetSession(next);
            setServerDenied(null);
            await recomputeAccess(next, null);
          } else {
            const denied = mapApiCodeToAccessState(refreshed.code);
            if (denied === "AUTH_REQUIRED") {
              const verified = await verifyEntitlementToken(stored.entitlement);
              const now = Math.floor(Date.now() / 1000);
              if (verified && now <= verified.claims.offlineValidUntil) {
                await recomputeAccess(stored, null);
              } else {
                setServerDenied(denied);
                await recomputeAccess(stored, denied);
              }
            } else if (denied) {
              setServerDenied(denied);
              await recomputeAccess(stored, denied);
            } else {
              await recomputeAccess(stored, null);
            }
          }
        } catch (error) {
          console.warn("[AuthProvider] bootstrap refresh persist failed:", error);
          await recomputeAccess(stored, null);
        }
      }
    } finally {
      setIsBootstrapping(false);
    }
  }, [recomputeAccess, cacheAndSetSession]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const cancelLogin = useCallback(() => {
    requestLoginCancel();
    if (isTauri()) {
      void import("@tauri-apps/api/core").then(({ invoke }) => {
        void invoke("cancel_google_oauth");
      });
    }
    setIsLoggingIn(false);
    setLoginStep(null);
  }, []);

  const loginWithGoogle = useCallback(
    async (idToken?: string) => {
      clearLoginCancel();
      setIsLoggingIn(true);
      setLoginStep(isTauri() ? "opening_browser" : "verifying");
      try {
        let result;
        if (idToken) {
          if (isLoginCancelRequested()) throw new LoginCancelledError();
          setLoginStep("verifying");
          result = await postAuthGoogle(await loginWithGoogleWeb(idToken));
        } else if (isTauri()) {
          setLoginStep("waiting_callback");
          const oauth = await loginWithGoogleDesktop();
          if (isLoginCancelRequested()) throw new LoginCancelledError();
          setLoginStep("verifying");
          result = await postAuthGoogle({
            code: oauth.code,
            codeVerifier: oauth.codeVerifier,
            redirectUri: oauth.redirectUri,
          });
        } else {
          throw new Error("Vui lòng đăng nhập bằng Google trên web.");
        }

        if (isLoginCancelRequested()) throw new LoginCancelledError();

        if (!result.ok) {
          const denied = mapApiCodeToAccessState(result.code) ?? "AUTH_REQUIRED";
          setServerDenied(denied);
          setAccessState(denied);
          throw new Error(
            result.error || "Đăng nhập thất bại. Kiểm tra cấu hình Worker (GOOGLE_CLIENT_ID_DESKTOP).",
          );
        }

        const verified = await verifyEntitlementToken(result.entitlement);
        if (!verified) {
          throw new Error(
            "Không xác minh được phiên đăng nhập. Kiểm tra NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY trong bản build.",
          );
        }
        const next: StoredAuthSession = {
          entitlement: result.entitlement,
          user: result.user,
          license: result.license,
          lastVerifiedAt: new Date().toISOString(),
          lastTrustedIat: verified?.issuedAt ?? Math.floor(Date.now() / 1000),
        };
        await saveAuthSession(next);
        cacheAndSetSession(next);
        setServerDenied(null);
        await recomputeAccess(next, null);
      } catch (error) {
        if (error instanceof LoginCancelledError || isLoginCancelRequested()) {
          throw new LoginCancelledError();
        }
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Đăng nhập đã bị hủy")) {
          throw new LoginCancelledError();
        }
        throw error;
      } finally {
        clearLoginCancel();
        setIsLoggingIn(false);
        setLoginStep(null);
      }
    },
    [recomputeAccess, cacheAndSetSession],
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
      try {
        await saveAuthSession(next);
        cacheAndSetSession(next);
        setServerDenied(null);
        await recomputeAccess(next, null);
      } catch (error) {
        console.warn("[AuthProvider] refreshSession persist failed:", error);
        await recomputeAccess(session, serverDenied);
      }
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
    try {
      await saveAuthSession(next);
      cacheAndSetSession(next);
      await recomputeAccess(next, serverDenied);
    } catch (error) {
      console.warn("[AuthProvider] refreshSession me persist failed:", error);
      await recomputeAccess(session, serverDenied);
    }
  }, [recomputeAccess, serverDenied, session]);

  const logout = useCallback(async () => {
    const token = session?.entitlement;
    if (token && isOnline()) {
      try {
        await postAuthLogout(token);
      } catch (error) {
        console.warn("[AuthProvider] server logout revoke failed:", error);
      }
    }
    await clearAuthSession();
    setSession(null);
    setServerDenied(null);
    setOfflineValidUntil(null);
    setPermissions(null);
    setAccessState("AUTH_REQUIRED");
  }, [session?.entitlement]);

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
      isLoading: isBootstrapping,
      isBootstrapping,
      isLoggingIn,
      loginStep,
      accessState,
      user: session?.user ?? null,
      license: session?.license ?? null,
      entitlement: session?.entitlement ?? null,
      permissions,
      lastVerifiedAt: session?.lastVerifiedAt ?? null,
      offlineValidUntil,
      loginWithGoogle,
      cancelLogin,
      refreshSession,
      logout,
    }),
    [
      accessState,
      isBootstrapping,
      isLoggingIn,
      loginStep,
      loginWithGoogle,
      cancelLogin,
      logout,
      offlineValidUntil,
      permissions,
      refreshSession,
      session,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
