import * as jose from "jose";
import type { GoogleProfile } from "./types";

const GOOGLE_JWKS = jose.createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleAuthConfig = {
  webClientId: string;
  desktopClientId?: string;
  /** Optional — only used for desktop PKCE code exchange on the Worker (never in the app). */
  desktopClientSecret?: string;
};

export type GoogleVerifier = (input: {
  idToken?: string;
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
}) => Promise<GoogleProfile>;

function allowedAudiences(config: GoogleAuthConfig): string | string[] {
  const desktop = config.desktopClientId?.trim();
  if (desktop && desktop !== config.webClientId) {
    return [config.webClientId, desktop];
  }
  return config.webClientId;
}

function desktopExchangeClientId(config: GoogleAuthConfig): string {
  return config.desktopClientId?.trim() || config.webClientId;
}

export async function defaultGoogleVerifier(
  config: GoogleAuthConfig,
  input: {
    idToken?: string;
    code?: string;
    codeVerifier?: string;
    redirectUri?: string;
  },
): Promise<GoogleProfile> {
  if (input.idToken) {
    const { payload } = await jose.jwtVerify(input.idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: allowedAudiences(config),
    });
    if (!payload.sub || typeof payload.sub !== "string") {
      throw new Error("Invalid Google identity");
    }
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
    };
  }

  if (input.code && input.codeVerifier && input.redirectUri) {
    const exchangeClientId = desktopExchangeClientId(config);
    const body = new URLSearchParams({
      code: input.code,
      client_id: exchangeClientId,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
      code_verifier: input.codeVerifier,
    });

    const secret = config.desktopClientSecret?.trim();
    if (secret) {
      body.set("client_secret", secret);
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "");
      throw new Error(text || "Google token exchange failed");
    }

    const tokenJson = (await tokenRes.json()) as { id_token?: string };
    if (!tokenJson.id_token) {
      throw new Error("Missing id_token");
    }
    return defaultGoogleVerifier(config, { idToken: tokenJson.id_token });
  }

  throw new Error("Missing Google authentication proof");
}
