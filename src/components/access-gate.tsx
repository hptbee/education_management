"use client";

import { useEffect, useRef } from "react";
import { ClassroomButton, ClassroomCard } from "@/src/components/classroom";
import { useAuth } from "@/src/store/AuthContext";
import { getGoogleClientId } from "@/src/auth/api";
import type { AccessState } from "@/src/auth/types";
import { isTauri } from "@/src/database/tauri-fs.service";

const MESSAGES: Record<AccessState, { title: string; body: string; emoji: string }> = {
  AUTH_REQUIRED: {
    emoji: "🌸",
    title: "Chào cô giáo!",
    body: "Vui lòng đăng nhập bằng Google để sử dụng ứng dụng.",
  },
  ONLINE_VERIFICATION_REQUIRED: {
    emoji: "🌸",
    title: "Ứng dụng cần xác minh",
    body: "Vui lòng kết nối Internet để tiếp tục.",
  },
  LICENSE_EXPIRED: {
    emoji: "⚠️",
    title: "Gói sử dụng đã hết hạn",
    body: "Gói sử dụng của cô đã hết hạn. Vui lòng liên hệ quản trị viên.",
  },
  ACCOUNT_DISABLED: {
    emoji: "⚠️",
    title: "Tài khoản hiện không khả dụng",
    body: "Tài khoản của cô hiện đã bị tạm ngưng. Vui lòng liên hệ quản trị viên.",
  },
  ACCOUNT_SUSPENDED: {
    emoji: "⚠️",
    title: "Tài khoản hiện không khả dụng",
    body: "Tài khoản của cô hiện đã bị tạm ngưng. Vui lòng liên hệ quản trị viên.",
  },
  AUTHENTICATED_AND_ACTIVE: { emoji: "", title: "", body: "" },
  OFFLINE_GRACE: { emoji: "", title: "", body: "" },
};

function GoogleSignInButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTauri()) return;
    const clientId = getGoogleClientId();
    if (!clientId || !buttonRef.current) return;

    const scriptId = "google-gsi-script";
    const renderButton = () => {
      const google = (window as unknown as { google?: { accounts: { id: { initialize: Function; renderButton: Function } } } }).google;
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
  }, [onCredential]);

  if (isTauri()) return null;
  return <div ref={buttonRef} className="flex justify-center" />;
}

export function AccessGate({ children }: { children: React.ReactNode }) {
  const { isLoading, accessState, loginWithGoogle, refreshSession, logout } = useAuth();

  const allowed =
    accessState === "AUTHENTICATED_AND_ACTIVE" || accessState === "OFFLINE_GRACE";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-page">
        <p className="text-sm font-semibold text-slate-500">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  if (allowed) {
    return <>{children}</>;
  }

  const message = MESSAGES[accessState];

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-6">
      <ClassroomCard className="w-full max-w-md text-center">
        <p className="text-4xl">{message.emoji}</p>
        <h1 className="mt-4 font-display text-2xl font-black text-slate-800">{message.title}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">{message.body}</p>

        <div className="mt-6 flex flex-col gap-3">
          {accessState === "AUTH_REQUIRED" ? (
            <>
              {isTauri() ? (
                <ClassroomButton onClick={() => void loginWithGoogle()}>
                  Đăng nhập bằng Google
                </ClassroomButton>
              ) : (
                <GoogleSignInButton onCredential={(token) => void loginWithGoogle(token)} />
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
