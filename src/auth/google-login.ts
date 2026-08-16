import { getGoogleClientId } from "./api";
import { isTauri } from "@/src/database/tauri-fs.service";

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, length);
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function loginWithGoogleDesktop(): Promise<{
  code: string;
  codeVerifier: string;
  redirectUri: string;
}> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("Google client ID chưa được cấu hình.");
  }

  const codeVerifier = randomString(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const callbackUrl = await invoke<string>("start_google_oauth", {
      clientId,
      codeChallenge,
    });
    const parsed = new URL(callbackUrl);
    const code = parsed.searchParams.get("code");
    const redirectUri = `${parsed.origin}${parsed.pathname}`;
    if (!code) {
      throw new Error("Không nhận được mã xác thực Google.");
    }
    return { code, codeVerifier, redirectUri };
  }

  throw new Error("OAuth desktop chỉ hỗ trợ trên ứng dụng Tauri.");
}

export async function loginWithGoogleWeb(idToken: string): Promise<{ idToken: string }> {
  if (!idToken) {
    throw new Error("Không nhận được mã đăng nhập Google.");
  }
  return { idToken };
}

export function buildGoogleAuthUrl(codeChallenge: string, redirectUri: string): string {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error("Google client ID chưa được cấu hình.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
