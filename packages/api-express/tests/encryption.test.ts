import { encrypt, decrypt } from '../src/services/encryption.service.js';

describe('Encryption Service', () => {
  it('should encrypt and decrypt a string correctly', () => {
    const original = 'test-api-key-12345';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should return null for empty input on encrypt', () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt(undefined)).toBeNull();
    expect(encrypt('')).toBeNull();
  });

  it('should return null for invalid input on decrypt', () => {
    expect(decrypt(null)).toBeNull();
    expect(decrypt('invalid')).toBe('invalid');
  });

  it('should produce different ciphertexts for same plaintext', () => {
    const original = 'same-key';
    const encrypted1 = encrypt(original);
    const encrypted2 = encrypt(original);
    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(original);
    expect(decrypt(encrypted2)).toBe(original);
  });

  it('should handle special characters', () => {
    const original = 'abc123!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    const encrypted = encrypt(original);
    expect(decrypt(encrypted)).toBe(original);
  });
});
