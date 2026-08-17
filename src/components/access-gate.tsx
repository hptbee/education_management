"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Sprout, WifiOff, type LucideIcon } from "lucide-react";
import { AuthBootstrapProgress, AuthLoginProgress } from "@/src/components/auth-login-progress";
import { ClassroomButton, ClassroomCard, useClassroomDialog } from "@/src/components/classroom";
import { LoginCancelledError } from "@/src/auth/login-cancel";
import { useAuth } from "@/src/store/AuthContext";
import { getGoogleClientId } from "@/src/auth/api";
import type { AccessState } from "@/src/auth/types";
import { isTauri } from "@/src/database/tauri-fs.service";

type GateMessage = {
  title: string;
  body: string;
  icon: LucideIcon;
  iconWrap: string;
};

const MESSAGES: Partial<Record<AccessState, GateMessage>> = {
  AUTH_REQUIRED: {
    icon: Sprout,
    iconWrap: "bg-brand-soft text-brand",
    title: "Chào cô giáo!",
    body: "Vui lòng đăng nhập bằng Google để sử dụng ứng dụng.",
  },
  ONLINE_VERIFICATION_REQUIRED: {
    icon: WifiOff,
    iconWrap: "bg-amber-100 text-amber-600",
    title: "Ứng dụng cần xác minh",
    body: "Vui lòng kết nối Internet để tiếp tục.",
  },
  LICENSE_EXPIRED: {
    icon: AlertTriangle,
    iconWrap: "bg-amber-100 text-amber-600",
    title: "Gói sử dụng đã hết hạn",
    body: "Gói sử dụng của cô đã hết hạn. Vui lòng liên hệ quản trị viên.",
  },
  ACCOUNT_DISABLED: {
    icon: AlertTriangle,
    iconWrap: "bg-red-100 text-red-500",
    title: "Tài khoản hiện không khả dụng",
    body: "Tài khoản của cô hiện đã bị tạm ngưng. Vui lòng liên hệ quản trị viên.",
  },
  ACCOUNT_SUSPENDED: {
    icon: AlertTriangle,
    iconWrap: "bg-red-100 text-red-500",
    title: "Tài khoản hiện không khả dụng",
    body: "Tài khoản của cô hiện đã bị tạm ngưng. Vui lòng liên hệ quản trị viên.",
  },
};

function GoogleSignInButton({
  onCredential,
  disabled,
}: {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTauri() || disabled) return;
    const clientId = getGoogleClientId();
    if (!clientId || !buttonRef.current) return;

    const scriptId = "google-gsi-script";
    const renderButton = () => {
      const google = (window as unknown as {
        google?: { accounts: { id: { initialize: Function; renderButton: Function } } };
      }).google;
      if (!google?.accounts?.id || !buttonRef.current) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response.credential) onCredential(response.credential);
        },
      });
      google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
      });
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      renderButton();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.body.appendChild(script);
  }, [disabled, onCredential]);

  if (isTauri()) return null;
  return (
    <div
      ref={buttonRef}
      className={`flex justify-center ${disabled ? "pointer-events-none opacity-50" : ""}`}
      aria-disabled={disabled || undefined}
    />
  );
}

function formatLoginError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/secure storage/i.test(message)) {
    return "Không lưu được phiên đăng nhập an toàn. Vui lòng thử lại hoặc liên hệ hỗ trợ.";
  }
  return message || "Đăng nhập thất bại. Vui lòng thử lại.";
}

export function AccessGate({ children }: { children: React.ReactNode }) {
  const {
    isBootstrapping,
    isLoggingIn,
    loginStep,
    accessState,
    loginWithGoogle,
    cancelLogin,
    refreshSession,
    logout,
  } = useAuth();
  const { showAlert } = useClassroomDialog();

  const handleLogin = async (token?: string) => {
    try {
      await loginWithGoogle(token);
    } catch (error) {
      if (error instanceof LoginCancelledError) return;
      await showAlert(formatLoginError(error), {
        title: "Đăng nhập thất bại",
        variant: "error",
      });
    }
  };

  const allowed =
    accessState === "AUTHENTICATED_AND_ACTIVE" || accessState === "OFFLINE_GRACE";

  if (isBootstrapping) {
    return <AuthBootstrapProgress />;
  }

  if (isLoggingIn && loginStep) {
    return <AuthLoginProgress step={loginStep} onCancel={cancelLogin} />;
  }

  if (allowed) {
    return <>{children}</>;
  }

  const message = MESSAGES[accessState];
  if (!message) return <>{children}</>;

  const Icon = message.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-6">
      <ClassroomCard className="w-full max-w-md text-center">
        <div className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${message.iconWrap}`}>
          <Icon className="size-7" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-2xl font-black text-slate-800">{message.title}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">{message.body}</p>

        <div className="mt-6 flex flex-col gap-3">
          {accessState === "AUTH_REQUIRED" ? (
            <>
              {isTauri() ? (
                <ClassroomButton disabled={isLoggingIn} onClick={() => void handleLogin()}>
                  Đăng nhập bằng Google
                </ClassroomButton>
              ) : (
                <GoogleSignInButton
                  disabled={isLoggingIn}
                  onCredential={(token) => void handleLogin(token)}
                />
              )}
            </>
          ) : (
            <>
              {(accessState === "ONLINE_VERIFICATION_REQUIRED" || accessState === "LICENSE_EXPIRED") && (
                <ClassroomButton onClick={() => void refreshSession()}>Thử lại</ClassroomButton>
              )}
              <ClassroomButton variant="outline" onClick={() => void logout()}>
                Đăng xuất
              </ClassroomButton>
            </>
          )}
        </div>
      </ClassroomCard>
    </div>
  );
}
