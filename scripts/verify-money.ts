/** Integration smoke test against the running local API. No notifications or gateway calls.
 * All writes use isolated fixture IDs and are removed in finally. Run: pnpm exec tsx scripts/verify-money.ts
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PaymentsService } from '../src/modules/finance/application/payments.service.js';
process.loadEnvFile('.env');
const db = new PrismaClient({
  transactionOptions: { maxWait: 10000, timeout: 30000 },
});
const base =
  process.env['MONEY_VERIFY_BASE_URL'] ?? 'http://localhost:3000/api/v1';
assert(
  new URL(base).hostname === 'localhost' ||
    new URL(base).hostname === '127.0.0.1',
  'Use a local API',
);
const org = randomUUID(),
  otherOrg = randomUUID(),
  user = randomUUID(),
  resident = randomUUID(),
  property = randomUUID();
const orgs = [org, otherOrg];
const timings: Record<string, number[]> = {};
let token = '';
async function call(
  path: string,
  body?: unknown,
  method = body ? 'POST' : 'GET',
  expected = body ? 201 : 200,
) {
  const started = performance.now();
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  (timings[path.split('?')[0]] ??= []).push(
    Math.round(performance.now() - started),
  );
  const text = await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${text}`);
  return response.headers.get('content-type')?.includes('json')
    ? JSON.parse(text)
    : text;
}
try {
  await db.user.create({
    data: {
      id: user,
      email: `money-fixture-${user}@example.invalid`,
      firstName: 'Money Fixture',
      passwordHash: 'fixture-login-disabled',
    },
  });
  await db.organization.createMany({
    data: orgs.map((id) => ({
      id,
      name: 'Money Verification Fixture',
      slug: 'money-fixture-' + id,
    })),
  });
  await db.organizationMember.create({
    data: { userId: user, organizationId: org, role: 'OWNER' },
  });
  const jwt = new JwtService();
  const sign = (id: string) =>
    jwt.sign(
      { sub: user, orgId: id, type: 'access' },
      {
        secret: process.env['JWT_SECRET']!,
        issuer: 'pginfo',
        expiresIn: '10m',
      },
    );
  token = sign(org);
  await db.property.create({
    data: {
      id: property,
      organizationId: org,
      name: 'Money Fixture Property',
      type: 'PG',
      addressLine1: 'Fixture only',
      city: 'Fixture',
      state: 'Fixture',
      pincode: '560001',
    },
  });
  await db.resident.create({
    data: {
      id: resident,
      organizationId: org,
      propertyId: property,
      firstName: 'Fixture',
      lastName: 'Tenant',
      mobile: '9999999999',
      monthlyRent: 1000000,
      joiningDate: new Date('2026-01-01'),
      status: 'ACTIVE',
    },
  });
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
  const pkg = await call('/money/packages', {
    propertyType: 'PG',
    name: 'Fixture Rent',
    category: 'Rent',
    billing: 'FIXED',
    amount: 1000000,
  });
  const disabled = await call(
    '/money/packages/' + pkg.id,
    { ...pkg, isActive: false },
    'PATCH',
    200,
  );
  assert.equal(disabled.version, 2);
  await call(
    '/money/packages/' + pkg.id,
    { ...pkg, isActive: false },
    'PATCH',
    409,
  );
  assert.equal((await call('/money/packages?active=DISABLED')).data.length, 1);
  const charge = await call('/billing/charges', {
    residentId: resident,
    type: 'RENT',
    amount: 1000000,
    dueDate: date,
    description: 'Rent fixture',
  });
  const electricity = await call('/billing/charges', {
    residentId: resident,
    type: 'ELECTRICITY',
    amount: 200000,
    dueDate: date,
    description: 'Electricity fixture',
  });
  const list = await call('/money/dues?propertyId=' + property);
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].outstanding, 1200000);
  for (const sort of [
    'DATE_ASC',
    'DATE_DESC',
    'ROOM',
    'AMOUNT_DESC',
    'AMOUNT_ASC',
  ])
    assert.equal((await call('/money/dues?sort=' + sort)).data.length, 1);
  assert.equal(
    (await call('/money/dues?type=ELECTRICITY')).data[0].outstanding,
    200000,
  );
  assert.equal((await call('/money/dues?search=Fixture')).meta.total, 1);
  assert.equal((await call('/money/dues?search=NotPresent')).meta.total, 0);
  await call('/money/residents/' + resident + '/discount', {
    amount: 100000,
    validTill: date,
    minimumPayment: 'FULL',
    description: 'Fixture discount',
  });
  const context = await call(
    '/money/residents/' + resident + '/payment-context',
  );
  assert.equal(context.totalDues, 1200000);
  const payment = {
    residentId: resident,
    amount: 1100000,
    mode: 'CASH',
    collectionDate: date,
    idempotencyKey: randomUUID(),
    allocations: [
      { billingRecordId: charge.id, amount: 1000000 },
      { billingRecordId: electricity.id, amount: 100000 },
    ],
  };
  const [a, b] = await Promise.all([
    call('/money/payments', payment),
    call('/money/payments', payment),
  ]);
  assert.equal(Number(a.replayed) + Number(b.replayed), 1);
  assert.equal(await db.payment.count({ where: { organizationId: org } }), 2);
  assert.equal((await call('/money/dues')).meta.total, 0);
  const summary = await call('/money/summary?propertyId=' + property);
  assert.equal(summary.allDues, 0);
  assert.equal(summary.totalCollection, 1100000);
  assert.equal(summary.monthElectricityCollection, 100000);
  await call(
    '/money/payments',
    {
      ...payment,
      amount: 100,
      idempotencyKey: randomUUID(),
      allocations: [{ billingRecordId: charge.id, amount: 100 }],
    },
    'POST',
    409,
  );
  const party = await call('/money/parties', { name: 'Fixture Payer' });
  assert.equal(
    (await call('/money/parties', { name: 'Fixture Payer' })).id,
    party.id,
  );
  const cat = await call('/expenses/categories', { name: 'Salary' });
  await call('/expenses', {
    propertyId: property,
    categoryId: cat.id,
    amount: 10000,
    expenseDate: date,
    paymentMode: 'CASH',
    description: '=Formula fixture',
    paidBy: 'Fixture Payer',
    paidTo: 'Fixture Payee',
  });
  assert.equal(
    (await call('/money/summary?propertyId=' + property)).salaryExpenses,
    10000,
  );
  const csv = await call('/money/reports/expenses?propertyId=' + property);
  assert(csv.includes("'=Formula fixture"));
  await call('/money/residents/' + resident + '/remarks', {
    description: 'Fixture remark',
  });
  const reminder = await call('/money/residents/' + resident + '/reminder');
  assert.equal(reminder.totalDues, 0);
  const bank = await db.landlordPayoutAccount.create({
    data: {
      organizationId: org,
      userId: user,
      razorpayAccountId: 'acc_fixture_' + randomUUID(),
      businessName: 'Fixture',
      accountNumberMasked: 'XXXX1234',
      ifscCode: 'HDFC0001234',
      beneficiaryName: 'Fixture',
      email: 'fixture@example.invalid',
      phone: '9999999999',
      status: 'PENDING',
      kycStatus: 'PENDING',
    },
  });
  await call(
    '/money/banks/' + bank.id + '/property',
    { propertyId: property },
    'PATCH',
    200,
  );
  assert.equal((await call('/payouts/accounts?search=Fixture')).meta.page, 1);
  await db.organizationMember.create({
    data: { userId: user, organizationId: otherOrg, role: 'OWNER' },
  });
  token = sign(otherOrg);
  assert.equal((await call('/money/dues')).meta.total, 0);
  await call(
    '/money/residents/' + resident + '/payment-context',
    undefined,
    'GET',
    404,
  );
  await call(
    '/money/banks/' + bank.id + '/property',
    { propertyId: property },
    'PATCH',
    404,
  );
  token = sign(org);
  const month = new Date(date).getUTCMonth() + 1,
    year = new Date(date).getUTCFullYear();
  const generated = await call(
    '/billing/generate-monthly-dues',
    { propertyId: property, billingMonth: month, billingYear: year },
    'POST',
    200,
  );
  assert.equal(generated.generatedCount, 1);
  assert.equal(
    (
      await call(
        '/billing/generate-monthly-dues',
        { propertyId: property, billingMonth: month, billingYear: year },
        'POST',
        200,
      )
    ).skippedCount,
    1,
  );
  const gateway = new PaymentsService(db as any, {} as any);
  const pending = await db.payment.create({
    data: {
      organizationId: org,
      residentId: resident,
      amount: 1000000,
      mode: 'RAZORPAY',
      status: 'PENDING',
      collectionDate: new Date(date),
      notes: 'Money payment link',
      paymentLinkId: 'plink_fixture_' + randomUUID(),
    },
  });
  const capture = {
    linkId: pending.paymentLinkId!,
    gatewayPaymentId: 'pay_fixture_' + randomUUID(),
    amount: 1000000,
    currency: 'INR',
  };
  await Promise.all([
    gateway.captureOnlinePayment(capture),
    gateway.captureOnlinePayment(capture),
  ]);
  assert.equal(
    await db.paymentAllocation.count({ where: { paymentId: pending.id } }),
    1,
  );
  assert.equal(
    (await call('/money/summary?propertyId=' + property)).monthRentCollection,
    2000000,
  );
  const stale = await db.payment.create({
    data: {
      organizationId: org,
      residentId: resident,
      amount: 1000000,
      mode: 'RAZORPAY',
      status: 'PENDING',
      collectionDate: new Date(date),
      paymentLinkId: 'plink_stale_' + randomUUID(),
    },
  });
  assert.equal(
    (
      await gateway.captureOnlinePayment({
        ...capture,
        linkId: stale.paymentLinkId!,
        gatewayPaymentId: 'pay_stale_' + randomUUID(),
      })
    )?.status,
    'DISPUTED',
  );
  console.log(
    JSON.stringify({ status: 'passed', timingsMs: timings }, null, 2),
  );
} finally {
  // Delete only rows owned by the two randomly generated fixture organizations.
  await db.payment.deleteMany({ where: { organizationId: { in: orgs } } });
  await db.billingRecord.deleteMany({
    where: { organizationId: { in: orgs } },
  });
  await db.discountOffer.deleteMany({
    where: { organizationId: { in: orgs } },
  });
  await db.resident.deleteMany({ where: { organizationId: { in: orgs } } });
  await db.expense.deleteMany({ where: { organizationId: { in: orgs } } });
  await db.auditLog.deleteMany({ where: { organizationId: { in: orgs } } });
  await db.organization.deleteMany({ where: { id: { in: orgs } } });
  await db.expenseCategory.deleteMany({
    where: { organizationId: { in: orgs } },
  });
  await db.user.deleteMany({ where: { id: user } });
  await db.$disconnect();
}
