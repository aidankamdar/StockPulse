/**
 * AES-256-GCM encryption for Plaid access tokens stored at rest.
 * Requires PLAID_TOKEN_ENCRYPTION_KEY env var (64-char hex = 32 bytes).
 *
 * Encrypted format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG = "aes-256-gcm" as const;
const IV_BYTES = 12;  // 96-bit IV recommended for GCM
const TAG_BYTES = 16; // 128-bit auth tag

function getEncryptionKey(): Buffer {
  const keyHex = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is not set");
  }
  if (keyHex.length !== 64) {
    throw new Error(
      "PLAID_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)"
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypts a plaintext string (e.g. a Plaid access token).
 * Returns a colon-separated string: "iv:authTag:ciphertext" (all hex-encoded).
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);

  const cipher = createCipheriv(ALG, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
}

/**
 * Decrypts a value produced by encryptToken().
 * Throws if the payload is malformed or authentication fails.
 */
export function decryptToken(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  if (iv.length !== IV_BYTES || authTag.length !== TAG_BYTES) {
    throw new Error("Invalid encrypted token structure");
  }

  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
