var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
let BankAccountCipher = class BankAccountCipher {
    config;
    constructor(config) {
        this.config = config;
    }
    key() {
        const hex = this.config.get('PAYOUT_BANK_ENCRYPTION_KEY');
        if (!hex || !/^[a-fA-F0-9]{64}$/.test(hex)) {
            throw new ServiceUnavailableException('Bank account storage is unavailable');
        }
        return Buffer.from(hex, 'hex');
    }
    encrypt(accountNumber, accountId) {
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
        cipher.setAAD(Buffer.from(accountId));
        const data = Buffer.concat([
            cipher.update(accountNumber, 'utf8'),
            cipher.final(),
        ]);
        return ['v1', iv, cipher.getAuthTag(), data]
            .map((part) => typeof part === 'string' ? part : part.toString('base64url'))
            .join('.');
    }
    decrypt(value, accountId) {
        const key = this.key();
        try {
            const parts = value.split('.');
            const [version, iv, tag, data] = parts;
            if (parts.length !== 4 || version !== 'v1' || !iv || !tag || !data)
                throw new Error();
            const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
            decipher.setAAD(Buffer.from(accountId));
            decipher.setAuthTag(Buffer.from(tag, 'base64url'));
            return Buffer.concat([
                decipher.update(Buffer.from(data, 'base64url')),
                decipher.final(),
            ]).toString('utf8');
        }
        catch {
            throw new ServiceUnavailableException('Bank account details could not be decrypted');
        }
    }
};
BankAccountCipher = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], BankAccountCipher);
export { BankAccountCipher };
//# sourceMappingURL=bank-account-cipher.js.map