import CryptoJS from 'crypto-js';
import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';

/**
 * Wallet encryption utilities for secure private key storage
 */

const ALGORITHM = 'aes';
const MODE = 'CBC';
const PADDING = 'Pkcs7';

/**
 * Encrypt a private key (base58 encoded) with AES
 */
export function encryptPrivateKey(
  privateKeyBase58: string,
  encryptionKey: string
): string {
  const encrypted = CryptoJS.AES.encrypt(privateKeyBase58, encryptionKey);
  return encrypted.toString();
}

/**
 * Decrypt a private key (base58 encoded) with AES
 */
export function decryptPrivateKey(
  encryptedPrivateKey: string,
  encryptionKey: string
): string {
  const decrypted = CryptoJS.AES.decrypt(encryptedPrivateKey, encryptionKey);
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Encrypt a keypair for storage
 */
export function encryptKeypair(keypair: Keypair, encryptionKey: string): string {
  const privateKeyBase58 = bs58.encode(keypair.secretKey);
  return encryptPrivateKey(privateKeyBase58, encryptionKey);
}

/**
 * Decrypt a keypair from storage
 */
export function decryptKeypair(encryptedPrivateKey: string, encryptionKey: string): Keypair {
  const privateKeyBase58 = decryptPrivateKey(encryptedPrivateKey, encryptionKey);
  const secretKey = bs58.decode(privateKeyBase58);
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Generate a secure random encryption key (32 bytes)
 */
export function generateEncryptionKey(): string {
  const key = CryptoJS.lib.WordArray.random(32);
  return key.toString(CryptoJS.enc.Hex);
}

/**
 * Hash a string using SHA256
 */
export function sha256(data: string): string {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

/**
 * Hash sensitive data for logging (shows first and last 4 chars)
 */
export function maskSensitiveData(data: string, visibleChars = 4): string {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  return `${data.slice(0, visibleChars)}${'*'.repeat(data.length - visibleChars * 2)}${data.slice(-visibleChars)}`;
}

/**
 * Validate encryption key format
 */
export function isValidEncryptionKey(key: string): boolean {
  // Should be at least 32 characters for AES-256
  return key.length >= 32;
}
