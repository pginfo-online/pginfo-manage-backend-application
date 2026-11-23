import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RazorpayAdapter } from '../../src/modules/finance/infrastructure/razorpay.adapter.js';

const bank = {
  email: 'fixture@example.test',
  phone: '9876543210',
  legalBusinessName: 'Fixture Property',
  businessType: 'individual',
  accountNumber: '001234567890',
  ifscCode: 'HDFC0001234',
  beneficiaryName: 'Fixture Owner',
};
const gateway = () =>
  new RazorpayAdapter(
    new ConfigService({
      RAZORPAY_KEY_ID: 'rzp_test_fixture',
      RAZORPAY_KEY_SECRET: 'fixture-secret',
    }),
  );

afterEach(() => vi.unstubAllGlobals());

describe('Razorpay Route bank onboarding', () => {
  it('submits bank details to the composite endpoint with a stable retry key', async () => {
    const fetch = vi.fn().mockImplementation(() =>
      Response.json({
        id: 'acc_Fixture',
        product_config: {
          id: 'acc_prd_Fixture',
          activation_status: 'activated',
        },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const adapter = gateway();
    const result = await adapter.createLinkedAccount(bank);
    await adapter.createLinkedAccount(bank);
    expect(result).toMatchObject({ accountId: 'acc_Fixture', verified: false });
    expect(fetch.mock.calls[0][0]).toBe('https://api.razorpay.com/v2/accounts');
    const request = fetch.mock.calls[0][1];
    expect(JSON.parse(request.body)).toMatchObject({
      reference_id: expect.stringMatching(/^pginfo_[0-9a-f]{32}$/),
      phone: '+919876543210',
    });
    expect(fetch.mock.calls[1][1].body).toEqual(request.body);
    expect(JSON.parse(request.body).settlement_accounts).toEqual([
      {
        method: 'bank_account',
        bank_account: {
          account_number: bank.accountNumber,
          beneficiary_name: bank.beneficiaryName,
          code_type: 'ifsc',
          code: bank.ifscCode,
          currency: 'INR',
          is_default: true,
        },
      },
    ]);
    expect(request.headers['Idempotency-Key']).toEqual(
      fetch.mock.calls[1][1].headers['Idempotency-Key'],
    );
  });

  it('requires an active, verified default bank account to report verification', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          activation_status: 'activated',
          active_configuration: {
            settlement_accounts: [
              {
                method: 'bank_account',
                active: true,
                verification_status: 'verified',
                bank_account: { is_default: true },
              },
            ],
          },
        }),
      ),
    );
    await expect(
      gateway().fetchRouteBankVerification('acc_Fixture', 'acc_prd_Fixture'),
    ).resolves.toBe(true);
  });

  it('keeps provider error bodies containing bank data out of client messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: { description: 'Invalid account ' + bank.accountNumber },
          },
          { status: 400 },
        ),
      ),
    );
    await expect(gateway().createLinkedAccount(bank)).rejects.toThrow(
      'Razorpay rejected the account without a recognized field or reason',
    );
  });
  it('maps provider descriptions with no field without returning submitted values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: { description: 'Invalid IFSC code: ' + bank.ifscCode },
          },
          { status: 400 },
        ),
      ),
    );
    await expect(gateway().createLinkedAccount(bank)).rejects.toThrow(
      'Razorpay rejected the IFSC. Check it against the bank records.',
    );
  });
});
