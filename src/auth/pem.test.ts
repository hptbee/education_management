import { describe, expect, it } from "vitest";
import * as jose from "jose";
import { normalizeSpkiPem } from "./pem";

const SAMPLE_BODY = "MCowBQYDK2VwAyEASva/xyyJL7QpLnWAh3hH6hKb+1DY3GyT9N2ch63ou8c=";

const VALID_PEM = `-----BEGIN PUBLIC KEY-----
${SAMPLE_BODY}
-----END PUBLIC KEY-----`;

describe("normalizeSpkiPem", () => {
  it("keeps a valid multiline PEM unchanged apart from trailing newline", () => {
    expect(normalizeSpkiPem(VALID_PEM)).toBe(`${VALID_PEM}\n`);
  });

  it("strips surrounding quotes", () => {
    expect(normalizeSpkiPem(`"${VALID_PEM}"`)).toBe(`${VALID_PEM}\n`);
  });

  it("converts literal \\n escapes", () => {
    const escaped = `-----BEGIN PUBLIC KEY-----\\n${SAMPLE_BODY}\\n-----END PUBLIC KEY-----`;
    expect(normalizeSpkiPem(escaped)).toBe(`${VALID_PEM}\n`);
  });

  it("reformats single-line PEM with spaces", () => {
    const singleLine = `-----BEGIN PUBLIC KEY----- ${SAMPLE_BODY} -----END PUBLIC KEY-----`;
    expect(normalizeSpkiPem(singleLine)).toBe(`${VALID_PEM}\n`);
  });

  it("produces SPKI that jose can import", async () => {
    const normalized = normalizeSpkiPem(
      `"-----BEGIN PUBLIC KEY----- ${SAMPLE_BODY} -----END PUBLIC KEY-----"`,
    );
    await expect(jose.importSPKI(normalized, "EdDSA")).resolves.toBeTruthy();
  });
});
