import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../../config/index.js';
export declare class BankAccountCipher {
    private readonly config;
    constructor(config: ConfigService<EnvConfig, true>);
    private key;
    encrypt(accountNumber: string, accountId: string): string;
    decrypt(value: string, accountId: string): string;
}
