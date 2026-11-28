import { createHmac, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { GlobalExceptionFilter } from '../src/common/errors/index.js';
import { dateKeyInTimeZone } from '../src/common/time/property-date.js';
import { RazorpayAdapter } from '../src/modules/finance/infrastructure/razorpay.adapter.js';
import { WHATSAPP_ADAPTER } from '../src/modules/communications/domain/notification.interfaces.js';
import { PrismaService } from '../src/platform/database/index.js';

describe('Central Razorpay collections and manual payout (e2e)', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  let webhookSecret: string;
  let gateway: RazorpayAdapter;
  let ownerToken: string;
  let adminToken: string;
  let secondAdminToken: string;
  let analystToken: string;
  let organizationId: string;
  let propertyId: string;
  const runId = randomUUID();
  const today = dateKeyInTimeZone(new Date(), 'Asia/Kolkata');
  const timestamp = Math.floor(Date.now() / 1000);

  beforeAll(async () => {
    const dbHost = new URL(process.env['DATABASE_URL']!).hostname;
    if (!['127.0.0.1', 'localhost', '[::1]', 'postgres'].includes(dbHost))
      throw new Error('Use a disposable database for finance end-to-end tests');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WHATSAPP_ADAPTER)
      .useValue({ send: vi.fn().mockResolvedValue({ success: true }) })
      .compile();
    app = moduleRef.createNestApplication({ rawBody: true, logger: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    db = app.get(PrismaService);
    gateway = app.get(RazorpayAdapter);
    webhookSecret = app
      .get(ConfigService)
      .getOrThrow('RAZORPAY_WEBHOOK_SECRET');
    const jwt = app.get(JwtService);
    const organization = await db.organization.create({
      data: { name: 'Finance fixtures', slug: runId },
    });
    organizationId = organization.id;
    const property = await db.property.create({
      data: {
        organizationId,
        name: 'Fixture PG',
        type: 'PG',
        addressLine1: 'Fixture address',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });
    propertyId = property.id;

    async function token(role?: 'FINANCE_ADMIN' | 'ANALYST') {
      const user = await db.user.create({
        data: {
          firstName: 'Finance',
          email: `${randomUUID()}@example.test`,
          passwordHash: 'fixture',
        },
      });
      if (role)
        await db.platformAdmin.create({ data: { userId: user.id, role } });
      else
        await db.organizationMember.create({
          data: { userId: user.id, organizationId, role: 'OWNER' },
        });
      return jwt.sign(
        {
          sub: user.id,
          email: user.email,
          orgId: role ? null : organizationId,
          type: 'access',
        },
        { issuer: 'pginfo', expiresIn: '15m' },
      );
    }
    [ownerToken, adminToken, secondAdminToken, analystToken] =
      await Promise.all([
        token(),
        token('FINANCE_ADMIN'),
        token('FINANCE_ADMIN'),
        token('ANALYST'),
      ]);
    vi.spyOn(gateway, 'canCreateMoneyLinks').mockReturnValue(true);
    vi.spyOn(gateway, 'createOrder').mockImplementation(
      async (amount, receipt) => ({
        orderId: providerId('order'),
        amount,
        currency: 'INR',
        receipt,
      }),
    );
    vi.spyOn(gateway, 'createPaymentLink').mockImplementation(async () => ({
      paymentLinkId: providerId('plink'),
      shortUrl: 'https://rzp.io/example',
      status: 'created',
    }));
    vi.spyOn(gateway, 'createCollectionQr').mockImplementation(
      async (_amount, expiresAt) => ({
        id: providerId('qr'),
        imageUrl: 'https://rzp.io/example-qr',
        expiresAt: new Date(expiresAt * 1000),
      }),
    );
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  function providerId(prefix: string) {
    return `${prefix}_${randomUUID().replaceAll('-', '')}`;
  }

  async function createDue(amount: number) {
    const resident = await db.resident.create({
      data: {
        organizationId,
        propertyId,
        firstName: 'Fixture Tenant',
        mobile: '9999999999',
        monthlyRent: amount,
        joiningDate: new Date(today),
        status: 'ACTIVE',
      },
    });
    const bill = await db.billingRecord.create({
      data: {
        organizationId,
        propertyId,
        residentId: resident.id,
        type: 'RENT',
        amount,
        dueDate: new Date(today),
        billingMonth: Number(today.slice(5, 7)),
        billingYear: Number(today.slice(0, 4)),
      },
    });
    return { resident, bill };
  }

  function signedWebhook(
    event: string,
    payload: object,
    eventId = randomUUID(),
    createdAt = timestamp,
  ) {
    const body = JSON.stringify({
      entity: 'event',
      event,
      payload,
      created_at: createdAt,
    });
    return request(app.getHttpServer())
      .post('/api/v1/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Event-Id', eventId)
      .set(
        'X-Razorpay-Signature',
        createHmac('sha256', webhookSecret).update(body).digest('hex'),
      )
      .send(body);
  }

  it('rejects unsigned webhooks and concurrently records one captured payment link', async () => {
    const { resident, bill } = await createDue(12000);
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/razorpay')
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/razorpay')
      .set('X-Razorpay-Signature', 'ff'.repeat(32))
      .send({ event: 'payment_link.paid', payload: {} })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/v1/money/residents/${resident.id}/payment-link`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    const intent = await db.payment.findFirstOrThrow({
      where: { residentId: resident.id },
    });
    const paymentId = providerId('pay');
    const payload = {
      payment_link: {
        entity: { id: intent.paymentLinkId, reference_id: intent.id },
      },
      payment: {
        entity: {
          id: paymentId,
          amount: 12000,
          status: 'captured',
          currency: 'INR',
        },
      },
    };
    const eventId = randomUUID();
    await Promise.all([
      signedWebhook('payment_link.paid', payload, eventId).expect(200),
      signedWebhook('payment_link.paid', payload, eventId).expect(200),
    ]);
    expect(
      await db.payment.count({ where: { razorpayPaymentId: paymentId } }),
    ).toBe(1);
    expect(
      await db.billingRecord.findUnique({ where: { id: bill.id } }),
    ).toMatchObject({ paidAmount: 12000, status: 'PAID' });
    const receipt = await request(app.getHttpServer())
      .get(`/api/v1/payments/${intent.id}/receipt`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(receipt.body).toMatchObject({
      amountPaise: 12000,
      reference: paymentId,
      allocations: [{ type: 'RENT', amountPaise: 12000 }],
    });
    const metrics = await request(app.getHttpServer())
      .get('/api/v1/dashboard/metrics')
      .query({ propertyId })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(metrics.body.financial).toMatchObject({
      todayCollectedPaise: 12000,
      monthCollectedPaise: 12000,
      monthBilledPaise: 12000,
      monthOutstandingPaise: 0,
      outstandingBalancePaise: 0,
    });
  });

  it('separates overdue, current, and future bills within one property', async () => {
    const property = await db.property.create({
      data: {
        organizationId,
        name: 'Billing totals fixture',
        type: 'PG',
        addressLine1: '10 Test Street',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });
    const resident = await db.resident.create({
      data: {
        organizationId,
        propertyId: property.id,
        firstName: 'Billing Fixture',
        mobile: '9999999999',
        monthlyRent: 10000,
        joiningDate: new Date(today),
      },
    });
    const date = (offset = 0) => new Date(Date.parse(today) + offset * 86_400_000);
    const scope = { organizationId, propertyId: property.id, residentId: resident.id };
    await db.billingRecord.createMany({
      data: [
        { ...scope, type: 'RENT', status: 'PARTIALLY_PAID', amount: 10000, paidAmount: 2000, dueDate: date(-1) },
        { ...scope, type: 'SECURITY_DEPOSIT', status: 'ISSUED', amount: 20000, dueDate: date() },
        { ...scope, type: 'RENT', status: 'CANCELLED', amount: 90000, dueDate: date(-1) },
        { ...scope, type: 'RENT', status: 'ISSUED', amount: 3000, dueDate: date(7) },
      ],
    });
    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard/metrics')
      .query({ propertyId: property.id })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(response.body.operational.rentDefaulters).toBe(1);
    expect(response.body.financial).toMatchObject({
      totalBilledPaise: 33000,
      outstandingBalancePaise: 31000,
      overdueDuesPaise: 8000,
      currentDuesPaise: 28000,
      todayDuesPaise: 20000,
      pendingDepositsPaise: 20000,
      futureDuesPaise: 3000,
      weekDuesPaise: 0,
    });
  });

  it('records QR captures and reverses a partial provider refund exactly once', async () => {
    const { resident, bill } = await createDue(8000);
    const qr = await request(app.getHttpServer())
      .post(`/api/v1/money/residents/${resident.id}/payment-qr`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    expect(qr.body).toMatchObject({
      qrImageUrl: expect.any(String),
      amount: 8000,
    });
    const intent = await db.payment.findFirstOrThrow({
      where: { residentId: resident.id },
    });
    const paymentId = providerId('pay');
    await signedWebhook('qr_code.credited', {
      qr_code: { entity: { id: intent.gatewayQrId } },
      payment: {
        entity: {
          id: paymentId,
          amount: 8000,
          status: 'captured',
          currency: 'INR',
        },
      },
    }).expect(200);
    vi.spyOn(gateway, 'fetchPayment').mockResolvedValue({
      id: paymentId,
      order_id: '',
      amount: 8000,
      currency: 'INR',
      status: 'captured',
      amount_refunded: 1000,
    });
    const refund = {
      refund: { entity: { id: providerId('rfnd'), payment_id: paymentId } },
    };
    await signedWebhook('refund.processed', refund).expect(200);
    await signedWebhook('refund.processed', refund).expect(200);
    expect(
      await db.billingRecord.findUnique({ where: { id: bill.id } }),
    ).toMatchObject({ paidAmount: 7000, status: 'PARTIALLY_PAID' });
    expect(
      await db.paymentAllocation.findFirst({ where: { paymentId: intent.id } }),
    ).toMatchObject({ amount: 8000, refundedAmount: 1000 });
    expect(
      await db.payment.findUnique({ where: { id: intent.id } }),
    ).toMatchObject({ gatewayRefundedAmount: 1000 });
  });

  it('moves mismatched Checkout captures to review, then applies verified funds to dues once', async () => {
    const { resident, bill } = await createDue(9000);
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/payments/razorpay/order')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ residentId: resident.id, billingRecordId: bill.id, amount: 5000 })
      .expect(201);
    const localId = checkout.body.paymentId;
    const orderId = checkout.body.razorpayOrderId;
    const gatewayPaymentId = providerId('pay');
    await request(app.getHttpServer())
      .post('/api/v1/payments/razorpay/verify')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        paymentId: localId,
        razorpayOrderId: orderId,
        razorpayPaymentId: gatewayPaymentId,
        razorpaySignature: 'aa'.repeat(32),
      })
      .expect(401);
    expect(
      await db.payment.findUnique({ where: { id: localId } }),
    ).toMatchObject({ status: 'PENDING' });
    // Recover from an order creation response that did not reach the database.
    await db.payment.update({
      where: { id: localId },
      data: { razorpayOrderId: null },
    });
    await signedWebhook('order.paid', {
      order: { entity: { id: orderId, status: 'paid', receipt: localId } },
      payment: {
        entity: {
          id: gatewayPaymentId,
          order_id: orderId,
          amount: 6000,
          status: 'captured',
          currency: 'INR',
        },
      },
    }).expect(200);
    expect(
      await db.payment.findUnique({ where: { id: localId } }),
    ).toMatchObject({ status: 'DISPUTED', amount: 6000 });
    expect(
      await db.billingRecord.findUnique({ where: { id: bill.id } }),
    ).toMatchObject({ paidAmount: 0 });
    vi.spyOn(gateway, 'fetchPayment').mockResolvedValue({
      id: gatewayPaymentId,
      order_id: orderId,
      amount: 6000,
      currency: 'INR',
      status: 'captured',
      amount_refunded: 0,
    });
    const apply = (token: string) =>
      request(app.getHttpServer())
        .post(`/api/v1/admin/finance/collections/${localId}/apply-to-dues`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Reconciled the actual gateway capture' });
    await apply(analystToken).expect(403);
    await apply(adminToken).expect(200);
    await apply(adminToken).expect(200);
    expect(
      await db.billingRecord.findUnique({ where: { id: bill.id } }),
    ).toMatchObject({ paidAmount: 6000, status: 'PARTIALLY_PAID' });
    expect(
      await db.auditLog.count({
        where: {
          entityId: localId,
          action: 'platform_collection.applied_to_dues',
        },
      }),
    ).toBe(1);
  });

  it('allocates Autopay without a Route account and reconciles a single reserved payout', async () => {
    const { resident, bill } = await createDue(15000);
    const subscriptionId = providerId('sub');
    const paymentId = providerId('pay');
    const mandate = await db.tenantMandate.create({
      data: {
        organizationId,
        tenantId: resident.id,
        propertyId,
        razorpaySubscriptionId: subscriptionId,
        rentAmount: 15000,
      },
    });
    const transfer = vi.spyOn(gateway, 'transferPayment');
    await signedWebhook('subscription.charged', {
      subscription: { entity: { id: subscriptionId, status: 'active' } },
      payment: {
        entity: {
          id: paymentId,
          amount: 15000,
          status: 'captured',
          currency: 'INR',
        },
      },
    }).expect(200);
    expect(transfer).not.toHaveBeenCalled();
    expect(
      await db.tenantMandate.findUnique({ where: { id: mandate.id } }),
    ).toMatchObject({ status: 'ACTIVE', paidCount: 1 });
    expect(
      await db.billingRecord.findUnique({ where: { id: bill.id } }),
    ).toMatchObject({ paidAmount: 15000, status: 'PAID' });
    const payment = await db.payment.findUniqueOrThrow({
      where: { razorpayPaymentId: paymentId },
    });
    expect(payment).toMatchObject({
      capturePlatformFee: 3000,
      capturePropertyId: propertyId,
    });
    await signedWebhook(
      'subscription.cancelled',
      { subscription: { entity: { id: subscriptionId } } },
      randomUUID(),
      timestamp + 2,
    ).expect(200);
    await signedWebhook(
      'subscription.activated',
      { subscription: { entity: { id: subscriptionId } } },
      randomUUID(),
      timestamp + 1,
    ).expect(200);
    expect(
      await db.tenantMandate.findUnique({ where: { id: mandate.id } }),
    ).toMatchObject({ status: 'REVOKED' });

    const bankNumber = '001234567890';
    const bank = await request(app.getHttpServer())
      .post('/api/v1/payouts/onboard-owner')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        ownerName: 'Fixture Owner',
        email: 'owner@example.test',
        phone: '9876543210',
        businessName: 'Fixture Owner',
        accountNumber: bankNumber,
        ifscCode: 'HDFC0001234',
        propertyId,
      })
      .expect(201);
    expect(JSON.stringify(bank.body)).not.toContain(bankNumber);
    const stored = await db.landlordPayoutAccount.findUniqueOrThrow({
      where: { id: bank.body.id },
    });
    expect(stored.accountNumberEncrypted).toMatch(/^v1\./);
    expect(stored.accountNumberEncrypted).not.toContain(bankNumber);
    const accountList = await request(app.getHttpServer())
      .get('/api/v1/payouts/accounts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(JSON.stringify(accountList.body)).not.toContain(
      'accountNumberEncrypted',
    );

    const bankUrl = `/api/v1/admin/finance/payout-accounts/${bank.body.id}`;
    await request(app.getHttpServer())
      .post(`${bankUrl}/bank-details`)
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(403);
    const details = await request(app.getHttpServer())
      .post(`${bankUrl}/bank-details`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect('Cache-Control', 'no-store')
      .expect(200);
    expect(details.body.accountNumber).toBe(bankNumber);
    await request(app.getHttpServer())
      .patch(`${bankUrl}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'ACTIVE',
        kycStatus: 'VERIFIED',
        reason: 'Fixture verified',
      })
      .expect(200);

    vi.spyOn(gateway, 'findPaymentSettlement').mockResolvedValue({
      providerId: providerId('setl'),
      bankReference: 'FIXTUREBANKUTR',
      netAmount: 14500,
    });
    vi.spyOn(gateway, 'fetchPayment').mockResolvedValue({
      id: paymentId,
      order_id: '',
      amount: 15000,
      currency: 'INR',
      status: 'captured',
      amount_refunded: 0,
    });
    const collection = `/api/v1/admin/finance/collections/${payment.id}`;
    await request(app.getHttpServer())
      .post(`${collection}/settlement`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ settledOn: today })
      .expect(200);
    await request(app.getHttpServer())
      .post(`${collection}/payout`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paidOn: today, bankReference: 'FIXTURE0001' })
      .expect(409);
    const reserve = (token: string) =>
      request(app.getHttpServer())
        .post(`${collection}/payout/prepare`)
        .set('Authorization', `Bearer ${token}`)
        .send({ payoutAccountId: bank.body.id, amount: 11500 });
    const reservations = await Promise.all([
      reserve(adminToken),
      reserve(secondAdminToken),
    ]);
    expect(reservations.map((result) => result.status).sort()).toEqual([
      201, 409,
    ]);
    const winner =
      reservations[0]?.status === 201 ? adminToken : secondAdminToken;
    const record = () =>
      request(app.getHttpServer())
        .post(`${collection}/payout`)
        .set('Authorization', `Bearer ${winner}`)
        .send({
          paidOn: today,
          bankReference: `UTR${runId.replaceAll('-', '')}`,
        })
        .expect(201);
    await record();
    await record();
    const register = await request(app.getHttpServer())
      .get('/api/v1/admin/finance/collections')
      .query({ organizationId, search: paymentId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(register.body.data).toEqual([
      expect.objectContaining({
        id: payment.id,
        platformFee: 3000,
        ownerPayable: 0,
        manualPayout: expect.objectContaining({ amount: 11500 }),
      }),
    ]);
    expect(register.body.totals).toMatchObject({
      paid_out: 11500,
      payout_in_progress: 0,
    });
    expect(
      await db.auditLog.count({
        where: {
          action: 'platform_collection.manual_payout_recorded',
          entityId: payment.id,
        },
      }),
    ).toBe(1);
  });
});
