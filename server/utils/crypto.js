const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM

/**
 * Returns the secret string for key derivation.
 * 1. process.env.ENCRYPTION_SECRET
 * 2. Reload from .env in case it was updated while server was running
 * 3. Fallback to process.env.JWT_SECRET with salt
 */
function getSecretString() {
  if (process.env.ENCRYPTION_SECRET && process.env.ENCRYPTION_SECRET.trim().length > 0) {
    return process.env.ENCRYPTION_SECRET.trim();
  }

  try {
    require('dotenv').config();
    if (process.env.ENCRYPTION_SECRET && process.env.ENCRYPTION_SECRET.trim().length > 0) {
      return process.env.ENCRYPTION_SECRET.trim();
    }
  } catch (_) {}

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0) {
    return `${process.env.JWT_SECRET.trim()}_weektrack_aes_fallback_salt`;
  }

  return null;
}

/**
 * Check whether ENCRYPTION_SECRET is configured or available via fallback.
 */
function isEncryptionConfigured() {
  return !!getSecretString();
}

/**
 * Derives a 32-byte key from secret string using SHA-256.
 */
function getEncryptionKey() {
  const secret = getSecretString();
  if (!secret) {
    return null;
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns formatted string "iv:authTag:encryptedHex".
 */
function encryptApiKey(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Invalid plaintext for encryption');
  }
  const key = getEncryptionKey();
  if (!key) {
    const err = new Error('ENCRYPTION_SECRET is not configured on the server');
    err.code = 'ENCRYPTION_UNAVAILABLE';
    throw err;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string "iv:authTag:encryptedHex" using AES-256-GCM.
 * Throws on failure or tampering.
 */
function decryptApiKey(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Invalid ciphertext for decryption');
  }
  const key = getEncryptionKey();
  if (!key) {
    const err = new Error('ENCRYPTION_SECRET is not configured on the server');
    err.code = 'ENCRYPTION_UNAVAILABLE';
    throw err;
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  isEncryptionConfigured,
  encryptApiKey,
  decryptApiKey,
};
