import { describe, it, expect } from 'vitest';
import {
  solToLamports,
  lamportsToSol,
  isValidAddress,
  maskSensitiveData,
  isValidEncryptionKey,
} from './index';

describe('Blockchain', () => {
  describe('solToLamports', () => {
    it('should convert SOL to lamports correctly', () => {
      expect(solToLamports(1)).toBe(1_000_000_000);
      expect(solToLamports(0.5)).toBe(500_000_000);
      expect(solToLamports(0.001)).toBe(1_000_000);
    });

    it('should handle zero', () => {
      expect(solToLamports(0)).toBe(0);
    });
  });

  describe('lamportsToSol', () => {
    it('should convert lamports to SOL correctly', () => {
      expect(lamportsToSol(1_000_000_000)).toBe(1);
      expect(lamportsToSol(500_000_000)).toBe(0.5);
      expect(lamportsToSol(1_000_000)).toBe(0.001);
    });

    it('should handle zero', () => {
      expect(lamportsToSol(0)).toBe(0);
    });
  });

  describe('isValidAddress', () => {
    it('should return true for valid Solana addresses', () => {
      expect(isValidAddress('So11111111111111111111111111111111111111112')).toBe(true);
      expect(isValidAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true);
    });

    it('should return false for invalid addresses', () => {
      expect(isValidAddress('invalid-address')).toBe(false);
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('too-short')).toBe(false);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask sensitive data correctly', () => {
      expect(maskSensitiveData('secret-key-12345')).toMatch(/^\w+\*+\w+$/);
      expect(maskSensitiveData('short')).toMatch(/^\*+$/);
    });

    it('should handle empty strings', () => {
      expect(maskSensitiveData('')).toBe('');
    });
  });

  describe('isValidEncryptionKey', () => {
    it('should return true for valid encryption keys', () => {
      expect(isValidEncryptionKey('a'.repeat(32))).toBe(true);
      expect(isValidEncryptionKey('a'.repeat(64))).toBe(true);
    });

    it('should return false for short keys', () => {
      expect(isValidEncryptionKey('short')).toBe(false);
      expect(isValidEncryptionKey('a'.repeat(31))).toBe(false);
    });
  });
});
