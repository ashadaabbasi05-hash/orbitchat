// @ts-nocheck
import crypto from 'crypto';
import { config } from '../config/env.ts';
import logger from '../config/logger.ts';

/**
 * RSA Key Manager - Handles server-side RSA key operations
 * In production, keys should be stored in a secure vault (AWS KMS, HashiCorp Vault, etc.)
 */
export class RSAKeyManager {
  private privateKey: string;
  private publicKey: string;
  private keyId: string;
  private version: number = 1;

  constructor() {
    // Load from environment or generate new keys
    if (config.RSA_PRIVATE_KEY && config.RSA_PUBLIC_KEY) {
      this.privateKey = config.RSA_PRIVATE_KEY;
      this.publicKey = config.RSA_PUBLIC_KEY;
      logger.info('Loaded RSA keys from environment');
    } else {
      logger.warn('Generating new RSA keys. Set RSA_PRIVATE_KEY and RSA_PUBLIC_KEY in .env for production.');
      this.generateNewKeyPair();
    }
    this.keyId = config.RSA_KEY_ID;
  }

  /**
   * Generate a new RSA 2048-bit key pair
   */
  private generateNewKeyPair(): void {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;
    logger.info('Generated new RSA key pair', { keyId: this.keyId });
  }

  /**
   * Get the server's public key for clients
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Get key metadata (ID and version)
   */
  getKeyMetadata(): { keyId: string; version: number } {
    return {
      keyId: this.keyId,
      version: this.version,
    };
  }

  /**
   * Decrypt a symmetric key that was encrypted by the client
   * The client encrypts their symmetric key using the server's RSA public key
   * The server decrypts it using the RSA private key
   */
  decryptSymmetricKey(encryptedKeyBase64: string): Buffer {
    try {
      const encryptedKey = Buffer.from(encryptedKeyBase64, 'base64');

      const decrypted = crypto.privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        encryptedKey
      );

      logger.debug('Decrypted symmetric key successfully');
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt symmetric key', { error });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Verify a signature created by a client
   * Used for message authentication if needed
   */
  verifySignature(
    data: Buffer,
    signatureBase64: string
  ): boolean {
    try {
      const signature = Buffer.from(signatureBase64, 'base64');
      const verifier = crypto.createVerify('sha256');
      verifier.update(data);
      return verifier.verify(this.publicKey, signature);
    } catch (error) {
      logger.error('Signature verification failed', { error });
      return false;
    }
  }

  /**
   * Get the current key version
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Rotate keys (in production, this would be more sophisticated)
   */
  rotateKeys(): void {
    logger.info('Rotating RSA keys');
    this.version++;
    this.generateNewKeyPair();
  }
}

// Singleton instance
let keyManager: RSAKeyManager | null = null;

export function initializeKeyManager(): RSAKeyManager {
  if (!keyManager) {
    keyManager = new RSAKeyManager();
  }
  return keyManager;
}

export function getKeyManager(): RSAKeyManager {
  if (!keyManager) {
    throw new Error('Key manager not initialized');
  }
  return keyManager;
}
