var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ResendEmailAdapter_1;
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
let ResendEmailAdapter = ResendEmailAdapter_1 = class ResendEmailAdapter {
    config;
    logger = new Logger(ResendEmailAdapter_1.name);
    constructor(config) {
        this.config = config;
    }
    async send(options) {
        const apiKey = this.config.get('RESEND_API_KEY');
        const fromEmail = this.config.get('RESEND_FROM_EMAIL') || 'noreply@pginfo.online';
        if (apiKey && apiKey.startsWith('re_') && !apiKey.includes('xxxx')) {
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    signal: AbortSignal.timeout(10_000),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        from: fromEmail,
                        to: [options.to],
                        subject: options.subject,
                        html: options.html,
                        text: options.text,
                    }),
                });
                if (!response.ok) {
                    const err = await response.text();
                    this.logger.error(`Resend email delivery failed: ${err}`);
                    return { success: false, error: err };
                }
                const data = (await response.json());
                return { success: true, messageId: data.id };
            }
            catch (err) {
                this.logger.error(`Network error sending email via Resend: ${err.message}`);
                return { success: false, error: err.message };
            }
        }
        if (this.config.get('NODE_ENV') === 'production') {
            return { success: false, error: 'Email provider is not configured' };
        }
        this.logger.log(`[SIMULATED EMAIL] To: ${options.to} | Subject: "${options.subject}"`);
        return { success: true, messageId: `sim_email_${Date.now()}` };
    }
};
ResendEmailAdapter = ResendEmailAdapter_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], ResendEmailAdapter);
export { ResendEmailAdapter };
//# sourceMappingURL=email.adapter.js.map