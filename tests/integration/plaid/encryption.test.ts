/**
 * Integration tests for Plaid token encryption.
 * Tests that encrypt/decrypt round-trips correctly and detects tampering.
 */

// Set up test encryption key (32 bytes = 64 hex chars)
process.env.PLAID_TOKEN_ENCRYPTION_KEY =
  "a".repeat(64); // 64 hex chars = 32 bytes for test

import { encryptToken, decryptToken } from "@/lib/plaid/encryption";

describe("encryptToken / decryptToken", () => {
  it("round-trips a plaintext access token", () => {
    const token = "access-sandbox-abc123-plaid-token-xyz";
    const encrypted = encryptToken(token);

    expect(encrypted).not.toBe(token);
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(token);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const token = "access-sandbox-same-token";
    const enc1 = encryptToken(token);
    const enc2 = encryptToken(token);

    expect(enc1).not.toBe(enc2);

    // But both should decrypt to the same plaintext
    expect(decryptToken(enc1)).toBe(token);
    expect(decryptToken(enc2)).toBe(token);
  });

  it("throws on tampered ciphertext", () => {
    const token = "access-sandbox-tamper-test";
    const encrypted = encryptToken(token);

    // Corrupt the last byte of the ciphertext
    const parts = encrypted.split(":");
    parts[2] = parts[2]!.slice(0, -2) + "ff";
    const tampered = parts.join(":");

    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws on malformed encrypted value", () => {
    expect(() => decryptToken("not:valid")).toThrow("Invalid encrypted token format");
    expect(() => decryptToken("")).toThrow();
    expect(() => decryptToken("a:b:c:d")).toThrow("Invalid encrypted token format");
  });

  it("encrypts empty string", () => {
    const encrypted = encryptToken("");
    expect(decryptToken(encrypted)).toBe("");
  });

  it("handles long tokens", () => {
    const longToken = "access-sandbox-" + "x".repeat(200);
    expect(decryptToken(encryptToken(longToken))).toBe(longToken);
  });
});
