import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { EnvConfig } from '../../../config/index.js';

@Injectable()
export class BankAccountCipher {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  private key(): Buffer {
    const hex = this.config.get('PAYOUT_BANK_ENCRYPTION_KEY');
    if (!hex || !/^[a-fA-F0-9]{64}$/.test(hex)) {
      throw new ServiceUnavailableException(
        'Bank account storage is unavailable',
      );
    }
    return Buffer.from(hex, 'hex');
  }

  encrypt(accountNumber: string, accountId: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAAD(Buffer.from(accountId));
    const data = Buffer.concat([
      cipher.update(accountNumber, 'utf8'),
      cipher.final(),
    ]);
    return ['v1', iv, cipher.getAuthTag(), data]
      .map((part) =>
        typeof part === 'string' ? part : part.toString('base64url'),
      )
      .join('.');
  }

  decrypt(value: string, accountId: string): string {
    const key = this.key();
    try {
      const parts = value.split('.');
      const [version, iv, tag, data] = parts;
      if (parts.length !== 4 || version !== 'v1' || !iv || !tag || !data)
        throw new Error();
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(iv, 'base64url'),
      );
      decipher.setAAD(Buffer.from(accountId));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException(
        'Bank account details could not be decrypted',
      );
    }
  }
}
