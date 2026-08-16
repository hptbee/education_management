import * as jose from "jose";
import type { GoogleProfile } from "./types";

const GOOGLE_JWKS = jose.createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleVerifier = (input: {
  idToken?: string;
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
}) => Promise<GoogleProfile>;

export async function defaultGoogleVerifier(
  clientId: string,
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
      audience: clientId,
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
    const body = new URLSearchParams({
      code: input.code,
      client_id: clientId,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
      code_verifier: input.codeVerifier,
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!tokenRes.ok) {
      throw new Error("Google token exchange failed");
    }

    const tokenJson = (await tokenRes.json()) as { id_token?: string };
    if (!tokenJson.id_token) {
      throw new Error("Missing id_token");
    }
    return defaultGoogleVerifier(clientId, { idToken: tokenJson.id_token });
  }

  throw new Error("Missing Google authentication proof");
}
