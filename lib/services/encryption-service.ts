import crypto from 'crypto';

/**
 * Encryption Service for securing sensitive data (e.g., Plex tokens)
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * The key should be a 64-character hex string (32 bytes)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (keyHex.length !== KEY_LENGTH * 2) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH * 2} characters (hex-encoded ${KEY_LENGTH} bytes), got ${keyHex.length}`
    );
  }

  try {
    return Buffer.from(keyHex, 'hex');
  } catch (error) {
    throw new Error('ENCRYPTION_KEY must be a valid hex string');
  }
}

export class EncryptionService {
  /**
   * Encrypt sensitive data (e.g., Plex token)
   *
   * @param text - Plain text to encrypt
   * @returns Encrypted string in format: iv:authTag:encrypted
   *
   * @example
   * const encrypted = EncryptionService.encrypt('my-plex-token-12345');
   * // Returns: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
   */
  static encrypt(text: string): string {
    if (!text) {
      throw new Error('Cannot encrypt empty text');
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   *
   * @param encryptedData - Encrypted string in format: iv:authTag:encrypted
   * @returns Decrypted plain text
   *
   * @example
   * const decrypted = EncryptionService.decrypt('a1b2c3d4....:e5f6g7h8....:i9j0k1l2....');
   * // Returns: "my-plex-token-12345"
   */
  static decrypt(encryptedData: string): string {
    if (!encryptedData) {
      throw new Error('Cannot decrypt empty data');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected format: iv:authTag:encrypted');
    }

    const [ivHex, authTagHex, encrypted] = parts;

    try {
      const key = getEncryptionKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Decryption failed: ${error.message}`);
      }
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate a new encryption key (for initial setup)
   *
   * @returns 64-character hex string (32 bytes)
   *
   * @example
   * const key = EncryptionService.generateKey();
   * console.log('ENCRYPTION_KEY=' + key);
   * // Add to .env.local
   */
  static generateKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }

  /**
   * Generate a random secret (e.g., for webhook URLs)
   *
   * @param length - Number of bytes (default: 32)
   * @returns Hex-encoded random string
   *
   * @example
   * const secret = EncryptionService.generateSecret();
   * // Returns: "a1b2c3d4e5f6g7h8..."
   */
  static generateSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a value (for comparison without decryption)
   * Useful for webhook secret verification
   *
   * @param value - Value to hash
   * @returns SHA-256 hash in hex format
   */
  static hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Compare a value with a hash (constant-time comparison)
   *
   * @param value - Plain value
   * @param hash - Hash to compare against
   * @returns True if value matches hash
   */
  static compareHash(value: string, hash: string): boolean {
    const valueHash = this.hash(value);
    return crypto.timingSafeEqual(
      Buffer.from(valueHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  }
}

/**
 * Example usage:
 *
 * // Generate a new key (run once)
 * const key = EncryptionService.generateKey();
 * console.log('Add to .env.local:');
 * console.log('ENCRYPTION_KEY=' + key);
 *
 * // Encrypt Plex token
 * const plexToken = 'abc123xyz789';
 * const encrypted = EncryptionService.encrypt(plexToken);
 * // Store `encrypted` in database
 *
 * // Decrypt when needed
 * const decrypted = EncryptionService.decrypt(encrypted);
 * // Use `decrypted` for Plex API calls
 */
