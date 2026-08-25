"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { postAuthGoogle, postAuthLogout } from "@/src/auth/api";
import { mapApiCodeToAccessState, resolveAccessState, verifyEntitlementToken } from "@/src/auth/entitlement";
import { loginWithGoogleDesktop, loginWithGoogleWeb } from "@/src/auth/google-login";
import {
  clearLoginCancel,
  isLoginCancelRequested,
  LoginCancelledError,
  requestLoginCancel,
} from "@/src/auth/login-cancel";
import { clearAuthSession, loadAuthSession, rememberAuthSession, saveAuthSession } from "@/src/auth/secure-storage";
import {
  isRevokedAuthDenial,
  reconcileStoredSessionOnline,
} from "@/src/store/auth-session-reconcile";
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
  storageError: string | null;
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
  retrySessionRestore: () => Promise<void>;
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
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep | null>(null);
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [accessState, setAccessState] = useState<AccessState>("AUTH_REQUIRED");
  const [serverDenied, setServerDenied] = useState<AccessState | null>(null);
  const [offlineValidUntil, setOfflineValidUntil] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<EntitlementPermissions | null>(null);

  const cacheAndSetSession = useCallback((next: StoredAuthSession | null) => {
    rememberAuthSession(next);
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
    setStorageError(null);
    try {
      const stored = await loadAuthSession();
      cacheAndSetSession(stored);
      setServerDenied(null);
      await recomputeAccess(stored, null);

      if (stored && isOnline()) {
        try {
          const result = await reconcileStoredSessionOnline(stored);
          if (result.kind === "updated") {
            await saveAuthSession(result.session);
            cacheAndSetSession(result.session);
            setServerDenied(null);
            await recomputeAccess(result.session, null);
          } else if (result.kind === "denied") {
            if (isRevokedAuthDenial(result.access)) {
              await clearAuthSession();
              cacheAndSetSession(null);
              setServerDenied("AUTH_REQUIRED");
              await recomputeAccess(null, "AUTH_REQUIRED");
            } else {
              setServerDenied(result.access);
              await recomputeAccess(stored, result.access);
            }
          }
        } catch (error) {
          console.warn("[AuthProvider] bootstrap refresh persist failed:", error);
          await recomputeAccess(stored, null);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[AuthProvider] secure session bootstrap failed:", error);
      // Keep the storage cache unset so a retry reads Credential Manager again.
      setSession(null);
      setServerDenied("AUTH_REQUIRED");
      await recomputeAccess(null, "AUTH_REQUIRED");
      setStorageError(message || "Unable to load the secure authentication session");
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
        setStorageError(null);
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

    const result = await reconcileStoredSessionOnline(session);
    if (result.kind === "updated") {
      try {
        await saveAuthSession(result.session);
        cacheAndSetSession(result.session);
        setServerDenied(null);
        await recomputeAccess(result.session, null);
      } catch (error) {
        console.warn("[AuthProvider] refreshSession persist failed:", error);
        await recomputeAccess(session, serverDenied);
      }
      return;
    }

    if (result.kind === "denied") {
      if (isRevokedAuthDenial(result.access)) {
        await clearAuthSession();
        cacheAndSetSession(null);
        setServerDenied("AUTH_REQUIRED");
        await recomputeAccess(null, "AUTH_REQUIRED");
      } else {
        setServerDenied(result.access);
        await recomputeAccess(session, result.access);
      }
      return;
    }

    await recomputeAccess(session, serverDenied);
  }, [recomputeAccess, serverDenied, session, cacheAndSetSession]);

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
    setStorageError(null);
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
      storageError,
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
      retrySessionRestore: bootstrap,
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
      bootstrap,
      logout,
      offlineValidUntil,
      permissions,
      refreshSession,
      session,
      storageError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
