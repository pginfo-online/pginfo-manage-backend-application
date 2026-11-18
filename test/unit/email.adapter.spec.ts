import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../src/config/index.js';
import { ResendEmailAdapter } from '../../src/modules/communications/infrastructure/email.adapter.js';

function adapter(settings: Partial<EnvConfig>) {
  return new ResendEmailAdapter({
    get: (key: keyof EnvConfig) => settings[key],
  } as ConfigService<EnvConfig, true>);
}

afterEach(() => vi.unstubAllGlobals());

describe('Email delivery configuration', () => {
  const message = {
    to: 'resident@example.test',
    subject: 'Reminder',
    text: 'Rent reminder',
    html: '<p>Rent reminder</p>',
  };

  it.each(['', 're_xxxxxxxxxxxxxxxxxxxxxxxxx'])(
    'does not report simulated delivery in production with key %s',
    async (key) => {
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      const result = await adapter({
        NODE_ENV: 'production',
        RESEND_API_KEY: key,
      }).send(message);
      expect(result).toEqual({
        success: false,
        error: 'Email provider is not configured',
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('retains simulation for development', async () => {
    const result = await adapter({ NODE_ENV: 'development' }).send(message);
    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^sim_email_/);
  });

  it('reports a real provider rejection as failed delivery', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('sender not verified', { status: 403 }),
        ),
    );
    const result = await adapter({
      NODE_ENV: 'production',
      RESEND_API_KEY: 're_valid_test_key',
      RESEND_FROM_EMAIL: 'noreply@example.test',
    }).send(message);
    expect(result.success).toBe(false);
  });
});
