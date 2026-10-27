import * as argon2 from 'argon2';

/**
 * Password hashing utility using Argon2id — recommended for production password hashing.
 * Configured with memory-hard parameters resistant to GPU/ASIC cracking.
 */
export class PasswordHasher {
  private static readonly OPTIONS: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3, // 3 iterations
    parallelism: 4, // 4 threads
  };

  /**
   * Hashes a plaintext password using Argon2id.
   */
  static async hash(password: string): Promise<string> {
    return argon2.hash(password, this.OPTIONS);
  }

  /**
   * Verifies a plaintext password against an Argon2id hash.
   */
  static async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
