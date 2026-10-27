import { describe, it, expect } from 'vitest';
import { PasswordHasher } from '../../src/modules/identity/domain/password-hasher.js';

describe('PasswordHasher (Argon2id)', () => {
  it('should hash a password and verify successfully', async () => {
    const raw = 'SecurePass123!';
    const hash = await PasswordHasher.hash(raw);

    expect(hash).toBeDefined();
    expect(hash).toContain('$argon2id$');

    const isValid = await PasswordHasher.verify(hash, raw);
    expect(isValid).toBe(true);
  });

  it('should return false for incorrect password', async () => {
    const raw = 'SecurePass123!';
    const hash = await PasswordHasher.hash(raw);

    const isValid = await PasswordHasher.verify(hash, 'WrongPassword456!');
    expect(isValid).toBe(false);
  });
});
