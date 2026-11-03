# Platform admin module

## Purpose and boundary

The platform admin module is the cross-organization control plane for PgInfo.
It is deliberately separate from `OrgRole.ADMIN`: an organization admin can
manage only their organization, while a platform admin can inspect or operate
across tenants only when their explicit platform permission allows it.

The module extends the existing modular monolith, Prisma data model, JWT
authentication, integer-paise financial convention, pagination shape, Zod
validation, structured errors, and append-only `AuditLog` history.

## Competitor findings

The implementation was informed by current public product documentation:

- [RentOK](https://rentok.com/) emphasizes property-wide floor plans, vacancy,
  automated dues, lead assignment, KYC, ledgers, staff operations, and
  downloadable financial reports. Its documentation also exposes portfolio
  dashboards and complaint ageing/SLA analytics.
- [My PG Manager](https://mypgmanager.com/) combines multi-property occupancy,
  partial collections, deposits, staff, complaints, tenant self-service,
  transaction ledgers, bulk import, and monthly exports.
- [NoBrokerHood](https://www.nobrokerhood.com/solutions/nobrokerhood-features)
  demonstrates granular admin roles, configurable module access, resident
  approvals, financial controls, staff/vendor management, downloadable logs,
  and complaint assignment/escalation.
- [NoBroker property management](https://www.nobroker.in/prophub/property-management/property-management-in-india/)
  adds tenant verification, rent transfer tracking, inspection evidence,
  maintenance coordination, and move-in/move-out controls.
- 99acres is primarily a listing and lead marketplace. The relevant pattern is
  listing lifecycle and response visibility rather than operational rent
  accounting, which PgInfo already models through leads, bookings, properties,
  and occupancy.

PgInfo adopts the most operationally useful patterns while improving the risk
model: administrative financial work is exposed as an investigation queue and
review case instead of allowing silent edits to settled transactions.

## Security model

Platform roles are `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`,
`SUPPORT_ADMIN`, `ANALYST`, and `AUDITOR`. Permissions are defined in
`src/modules/admin/domain/admin-permissions.ts` and may receive only validated,
additive per-admin overrides.

Every `/api/v1/admin/**` request requires:

1. A signed, unexpired access token.
2. A currently active user loaded from the database.
3. A currently active `PlatformAdmin` loaded in the same authentication query.
4. The permission declared by the route.

Organization requests also use current membership, role, and organization
status loaded during JWT validation. Suspensions and role changes therefore
take effect immediately rather than at access-token expiry.

The API never returns password hashes, refresh-token hashes, Razorpay
signatures, unmasked account numbers, or provider secrets. Platform settings
are intentionally non-secret; secrets remain environment-managed.

## API surface

All collections use `{ data, meta }` pagination and bounded `page` and `limit`.

| Area                 | Endpoints                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Access               | `GET /admin/me`, `GET/POST/PATCH /admin/admins`                                                                             |
| Users                | `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`                                                 |
| Dashboard            | `GET /admin/dashboard`                                                                                                      |
| Organizations        | `GET /admin/organizations`, `GET /admin/organizations/:id`, `PATCH /admin/organizations/:id/status`                         |
| Properties           | `GET /admin/properties`, `GET /admin/properties/:id`, `PATCH /admin/properties/:id/status`                                  |
| Inventory            | `GET/PATCH /admin/rooms`, `GET/PATCH /admin/beds`                                                                           |
| People and occupancy | `GET /admin/residents`, `GET /admin/bookings`                                                                               |
| Support              | `GET /admin/complaints`, `GET /admin/complaints/:id`, `GET /admin/announcements`                                            |
| Finance              | `GET /admin/finance/payments`, `GET /admin/finance/payments/:id`, `GET /admin/finance/ledger`, `GET /admin/finance/pending` |
| Banks                | `GET /admin/finance/payout-accounts`, `PATCH /admin/finance/payout-accounts/:id/review`                                     |
| Reports              | `GET /admin/reports/portfolio`, `GET /admin/reports/portfolio.csv`                                                          |
| Governance           | `GET /admin/audit-logs`, `GET/POST/PATCH /admin/cases`, `GET/PUT /admin/settings`                                           |

Swagger documents these routes at `/api/docs` outside production.

## Financial and operational invariants

- Money remains integer paise.
- Confirmed payments and settled invoices are not rewritten by the admin API.
  Suspicious transactions enter an idempotent review case.
- Occupied room and bed states are derived from tenancy and booking workflows
  and cannot be forced by an admin status call.
- Properties with active residents cannot be archived.
- Payout KYC changes follow explicit transitions, require a reason, and write an
  audit record in the same transaction.
- User deactivation revokes active refresh tokens. Active platform-admin access
  must be revoked before that user can be deactivated.
- The last active super-admin cannot be demoted or suspended.
- Existing settings require `expectedVersion`, preventing lost updates.

## Bootstrap and deployment

```sh
pnpm prisma:migrate:deploy
pnpm admin:bootstrap -- --email operator@example.com
```

The bootstrap command accepts only an existing active user and refuses to run
after any platform admin exists. Later grants use the authenticated API.

## Performance and scale

The dashboard uses one parameterized aggregate SQL snapshot instead of more
than twenty connection-pool round trips. List endpoints have bounded limits and
indexed status, organization, property, and date fields. At high volume,
dashboard/report reads should use a read replica and a short-lived cache;
mutations must remain on the primary.

## Verification

Automated coverage includes platform permission separation, suspended-admin
denial, live JWT authorization state, validation, inventory invariants,
property archival safety, and optimistic settings. Live validation covers all
read areas, bootstrap, dashboard aggregation, idempotent case resolution, and
setting version advancement.
