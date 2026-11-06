import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../src/config/index.js';
import { WhatsAppHttpAdapter } from '../../src/modules/communications/infrastructure/whatsapp.adapter.js';

function adapter(settings: Partial<EnvConfig> = {}) {
  const config = {
    META_WHATSAPP_ACCESS_TOKEN: 'test-token',
    META_WHATSAPP_PHONE_NUMBER_ID: '12345',
    META_WHATSAPP_API_VERSION: 'v23.0',
    META_WHATSAPP_TEMPLATE_LANGUAGE: 'en',
    ...settings,
  };
  return new WhatsAppHttpAdapter({
    get: (key: keyof typeof config) => config[key],
  } as ConfigService<EnvConfig, true>);
}

const invite = {
  to: '+91 98765 43210',
  message: 'Authorize your rent mandate',
  templateName: 'rent_autopay_mandate_invite',
  templateParams: {
    tenant_name: 'Asha',
    property_name: 'Green Residency',
    unit_number: '204',
    rent_amount: 'INR 12,000',
    billing_day: '5th',
    auth_url: 'https://example.test/authorize',
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('WhatsApp Cloud API', () => {
  it.each(['POSITIONAL', 'NAMED'] as const)(
    'sends the English template with %s body parameters and returns the Meta ID',
    async (format) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(Response.json({ messages: [{ id: 'wamid.test' }] }));
      vi.stubGlobal('fetch', fetch);
      const result = await adapter({
        META_WHATSAPP_TEMPLATE_PARAMETER_FORMAT: format,
      }).send(invite);
      expect(result).toEqual({ success: true, messageId: 'wamid.test' });
      const [url, request] = fetch.mock.calls[0];
      expect(url).toBe('https://graph.facebook.com/v23.0/12345/messages');
      expect(JSON.parse(request.body)).toEqual({
        messaging_product: 'whatsapp',
        to: '919876543210',
        type: 'template',
        template: {
          name: invite.templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: Object.entries(invite.templateParams).map(
                ([name, text]) => ({
                  type: 'text',
                  text,
                  ...(format === 'NAMED' ? { parameter_name: name } : {}),
                }),
              ),
            },
          ],
        },
      });
    },
  );

  it('returns a failure for a template rejected by Meta', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: 132001, message: 'template not found' } },
            { status: 400 },
          ),
        ),
    );
    expect(await adapter().send(invite)).toEqual({
      success: false,
      error: 'WhatsApp provider rejected the message (HTTP 400, code 132001)',
    });
  });

  it('reports an unconfigured provider without attempting delivery', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(
      await adapter({
        META_WHATSAPP_ACCESS_TOKEN: '',
        META_WHATSAPP_PHONE_NUMBER_ID: '',
      }).send(invite),
    ).toEqual({ success: false, error: 'WhatsApp provider is not configured' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
