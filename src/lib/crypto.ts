import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Authenticated symmetric encryption for secrets at rest (e.g. a tenant's
 * Razorpay key secret). AES-256-GCM, random 96-bit IV, 128-bit auth tag.
 *
 * Key material, in order of preference:
 *  1. APP_ENCRYPTION_KEY — 32 bytes as base64 or hex (recommended for prod;
 *     rotate independently of auth).
 *  2. Derived (scrypt) from CLERK_SECRET_KEY so it works out of the box in
 *     dev without a new env var. Strong as the Clerk secret; if that secret
 *     is rotated, previously-stored ciphertext can't be decrypted (the tenant
 *     simply re-enters their key).
 *
 * Fails closed if no key material exists — we never store a secret in
 * plaintext (the reason P7-3 deferred this).
 */

const SCRYPT_SALT = "edt-secret-at-rest:v1";

function getKey(): Buffer {
  const explicit = process.env.APP_ENCRYPTION_KEY?.trim();
  if (explicit) {
    const buf = /^[0-9a-fA-F]{64}$/.test(explicit)
      ? Buffer.from(explicit, "hex")
      : Buffer.from(explicit, "base64");
    if (buf.length === 32) return buf;
    throw new Error("APP_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  const fallback = process.env.CLERK_SECRET_KEY;
  if (!fallback) {
    throw new Error(
      "No encryption key: set APP_ENCRYPTION_KEY (32 bytes base64/hex) or ensure CLERK_SECRET_KEY is present.",
    );
  }
  return scryptSync(fallback, SCRYPT_SALT, 32);
}

/** Encrypt a UTF-8 secret → `v1:<iv>:<tag>:<ciphertext>` (all base64). */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/** Decrypt a value produced by encryptSecret. Throws if tampered/garbled. */
export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Unrecognized ciphertext format");
  }
  const key = getKey();
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ct = Buffer.from(parts[3], "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** True if encryption is usable (key material present). */
export function encryptionAvailable(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
