const SPKI_HEADER = "-----BEGIN PUBLIC KEY-----";
const SPKI_FOOTER = "-----END PUBLIC KEY-----";

/** Normalize SPKI PEM from env vars (quotes, literal \\n, or single-line spacing). */
export function normalizeSpkiPem(raw: string): string {
  let pem = raw.trim();
  if (
    (pem.startsWith('"') && pem.endsWith('"')) ||
    (pem.startsWith("'") && pem.endsWith("'"))
  ) {
    pem = pem.slice(1, -1).trim();
  }

  pem = pem.replace(/\\n/g, "\n");

  const match = pem.match(/-----BEGIN PUBLIC KEY-----([\s\S]*?)-----END PUBLIC KEY-----/);
  if (!match) {
    return pem;
  }

  const body = match[1].replace(/\s+/g, "");
  if (!body) {
    return pem;
  }

  return `${SPKI_HEADER}\n${body}\n${SPKI_FOOTER}\n`;
}
