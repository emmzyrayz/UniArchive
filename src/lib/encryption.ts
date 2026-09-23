// lib/encryption.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey)
    throw new Error("ENCRYPTION_KEY environment variable is required.");

  // Accept exactly 64 hex chars (= 32 bytes)
  if (!/^[0-9a-fA-F]{64}$/.test(envKey)) {
    throw new Error(
      `ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ` +
        `Generate one with: openssl rand -hex 32. ` +
        `Got ${envKey.length} characters.`,
    );
  }

  return Buffer.from(envKey, "hex");
}

// Computed once per process, not per call
const KEY_BUFFER = getEncryptionKey();

if (KEY_BUFFER.length !== 32) {
  throw new Error(
    `Invalid encryption key length: expected 32 bytes, got ${KEY_BUFFER.length}`,
  );
}

export function encryptSensitiveData(data: string): string {
  if (!data || typeof data !== "string") {
    throw new Error("Invalid data for encryption");
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

export function decryptSensitiveData(encryptedData: string): string {
  if (!encryptedData || typeof encryptedData !== "string") {
    throw new Error("Invalid encrypted data provided");
  }

  const parts = encryptedData.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid encrypted data format — expected "iv:ciphertext"`);
  }

  const [ivHex, encrypted] = parts;

  if (ivHex.length !== 32 || !/^[0-9a-fA-F]+$/.test(ivHex)) {
    throw new Error("Invalid IV in encrypted data");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// One-way hash for searchable-but-encrypted fields (email, phone, regNumber)
export function hashForSearch(data: string): string {
  const HASH_SALT = process.env.HASH_SALT;
  if (!HASH_SALT)
    throw new Error("HASH_SALT environment variable is required.");
  return crypto
    .createHash("sha256")
    .update(data.toLowerCase().trim() + HASH_SALT)
    .digest("hex");
}
