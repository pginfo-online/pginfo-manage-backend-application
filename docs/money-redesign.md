# Money module redesign

Implemented across the NestJS API and Flutter mobile app on 9 November 2026. Existing resident, passbook, upload, receipt, and payout integrations are retained.

## Screens and behavior

| Area | Implementation |
| --- | --- |
| Due Packages | Dedicated tab; search; active/disabled filter; create/edit screen; property type; all 18 requested categories; fixed/variable amount; description; enable/disable; version checks |
| Dues | One card per tenant; full tenant outstanding balance; property scope; search by name, phone, or room; all requested sort/date/defaulter/type filters; overdue days; dashboard metrics |
| Bulk reminders | Dedicated screen; search; paginated tenants with balances; explicit selection/deselection; select loaded; maximum 100 recipients; delivery counts and failures |
| Record Payment | Dedicated screen; property and tenant header; room/bed; phone/WhatsApp; total dues; eligible discount; net receivable; editable amount and breakup; date/mode; proof upload; description; protected submit |
| Swipe actions | Swipe left to reveal Give Discount, Add Dues, Remind Parent, Add Remarks; equivalent visible Quick actions control; Add Dues opens the existing tenant Passbook tab |
| Discount | Expiring offer; full-dues/custom minimum; description; applied when an eligible payment is recorded, with an audit entry |
| Reminders | Bottom sheet; tenant/parent details; real message preview; WhatsApp; link sharing; on-demand payment-link creation |
| Collection | Search/date/mode filters; monthly and overall metrics; tenant cards and existing shareable receipts; captured payments requiring review are visible separately |
| Expense | Search/date/mode filters; category icons; metrics; dedicated add/edit form; required categories and custom categories; searchable, paginated payer/payee creation/selection; property selection; attachment and description |
| Report | Searchable report types; date/mode filters; dues/collection/expense CSV; authenticated, streamed export; mobile export through the system share/save sheet |
| Bank | Search; status filters; paginated accounts; existing KYC onboarding; masked account details; link/unlink property; live mandates prevent unsafe reassignment; property-specific accounts take precedence over organization defaults |

## API contracts

All paths below are under `/api/v1`, use JWT authentication and an active organization membership, and validate input with Zod. Mutations have role checks; bank changes require Owner/Admin, package and discount changes require Owner/Admin/Manager. Amounts are integer paise.

| Method | Path | Purpose |
| --- | --- | --- |
| GET/POST | `/money/packages` | List/create packages |
| PATCH | `/money/packages/:id` | Edit/enable/disable with `version` |
| GET | `/money/dues` | Paginated, grouped tenant balances |
| GET | `/money/summary` | Property-scoped dashboard aggregates |
| GET | `/money/properties`, `/money/properties/:id` | Lightweight property picker and label |
| GET | `/money/residents/:id/payment-context` | Tenant, payable bills, total balance, current offer |
| POST | `/money/payments` | Atomic, idempotent manual payment and explicit breakup |
| POST | `/money/residents/:id/discount` | Conditional discount offer |
| POST | `/money/residents/:id/remarks` | Audited tenant remark |
| GET | `/money/residents/:id/reminder` | Message and available payment link |
| POST | `/money/residents/:id/payment-link` | Expiring hosted payment link |
| GET/POST | `/money/parties` | Paginated payer/payee directory and creation |
| PATCH | `/money/banks/:id/property` | Link property; null unlinks |
| GET | `/money/reports/:kind` | Stream `dues`, `collections`, or `expenses` CSV |

`/announcements/reminders/rent` additionally accepts `residentIds` (1–100 UUIDs). Organization and optional property constraints still apply; the new mobile screen always sends the selected IDs. Existing single-tenant and organization-wide callers remain supported.

Financial dates reject invalid calendar dates rather than allowing JavaScript to normalize them. Dues dashboards use the application's Indian billing calendar (`Asia/Kolkata`).

## Accounting and security changes

- Manual breakup amounts must sum to the received amount. Duplicate bill IDs, another resident's bills, overpayments, stale versions, and reused command keys with changed payloads are rejected.
- A transaction-scoped advisory lock serializes an idempotency key, including a retry that changes resident ID. Tenant locks and optimistic bill versions protect concurrent payments/discounts.
- Discounts remain offers until their expiry/minimum conditions are met. Linked rent invoices cannot be discounted; partial manual settlement of a linked invoice is rejected by the new payment screen's API. Fully settled invoices are synchronized.
- New gateway allocations are persisted in `payment_allocations`, so category collection metrics reflect the actual breakup. Historical payments without allocation evidence are shown as Other / Unattributed rather than assigned an invented category.
- Gateway verification binds payment to its stored order, retrieves the gateway payment, and checks captured status, amount and INR currency. A webhook without an order/link identifier cannot select an arbitrary pending payment.
- Signed `payment_link.paid` events reconcile hosted links, including when a creation response was lost. Repeat captures do not allocate dues twice. Captures after a balance change become `DISPUTED`, remain recorded, and appear in Collection's Payment Review screen for an explicit refund/adjustment decision.
- Failed webhook events can be retried. Successful events remain deduplicated.
- CSV cells are quoted and potentially executable spreadsheet formulas are neutralized. Exports honor organization/property filters and use batches with backpressure and disconnect handling.
- Account numbers remain masked. Linking a bank does not bypass gateway KYC or silently reroute live mandates.

## Performance and fetching

| Previous issue | Change |
| --- | --- |
| Monthly billing loaded all residents and performed lookup/insert calls for each | One `INSERT … SELECT`, with database conflict handling and aggregate counts |
| Repeated bill cards for one tenant | Database aggregation before tenant pagination |
| Count, page, and tenant hydration needed separate calls | A single statement returns a consistent dues count and hydrated page |
| Bill payment allocation updated each bill separately | Version-checked batch updates and bulk allocation/payment writes |
| Generic property picker ran dashboard aggregation queries and exposed only an initial page | Dedicated lightweight, searchable and paginated Money property picker |
| Bank pagination passed limit/offset into page/limit fields | Correct pagination metadata; deterministic ordering |
| Search/property changes could keep obsolete work alive | Cancel tokens, canonical query keys, organization-scoped providers, generation checks and auto-disposal |
| Pagination guessed more data from item count | Explicit server `meta.hasMore`; append deduplication; existing rows survive append failure |
| Mutation totals could remain stale | Central invalidation of Money lists/objects/options and existing dashboard/passbook providers |
| Exports loaded the entire result in the API process | Keyset batches of 500 rows, streamed to the client |

The migrations add scoped billing, payment-date, and expense-date indexes, package/party uniqueness, discount lookup indexes, allocation indexes, foreign keys, and monetary checks. Balance reads intentionally do not use a long-lived backend cache. Riverpod shares queries across Money tabs and retains data during refresh; mutations invalidate relevant data.

A fixture smoke run against the local API with its configured remote PostgreSQL database observed dues requests of roughly 277–576 ms after reducing the dues flow to one statement. The earlier multi-query implementation in this session was generally 665–1084 ms, with one 2350 ms response. These are small-fixture observations under variable network latency, **not** a load-test SLA or a production p95. Larger datasets and database query plans should be measured in the deployment environment before choosing additional indexes or caches.

## Loading-state research and implementation

The requested Groww, RentOk, RedBus, PhonePe and Paytm references were researched through public engineering/design/product sources. Public pages did **not** establish the exact current native skeleton implementations of all five products. No claim is made about their proprietary code, animation timings, or caching internals. Relevant public surfaces include [Groww Engineering](https://tech.groww.in/), [PhonePe Design](https://design.phonepe.com/), [Paytm Engineering](https://paytm.com/blog/engineering/), and [RentOk product releases](https://docs.rentok.com/docs/feature-releases/26th-Sep-2026); the supplied RentOk screenshots guide this module's workflow and layout.

Implementation decisions are grounded in documented loading patterns:

- [Flutter's loading-effect recipe](https://docs.flutter.dev/cookbook/effects/shimmer-loading) demonstrates shape-based placeholders and shared animation; this module uses a lightweight synchronized pulse per placeholder group, without another package.
- [eBay's skeleton guidance](https://playbook.ebay.com/design-system/components/loading-skeleton?tab=motion) describes reserving layout and using motion to communicate ongoing retrieval. Placeholders represent cards, rows and form fields; static headings and search controls remain usable.
- [PIE's skeleton component](https://pie.design/components/skeleton/) describes skeletons as representations of pending content. This module supplies meaningful semantics, excludes decorative placeholder children from accessibility, and stops motion when the system requests reduced animation.

Initial loading uses card/form skeletons. Refresh retains existing content and shows the pull-to-refresh indicator. Additional pages show an inline progress state; append failure retains loaded rows and offers retry. Saving, sending reminders, creating links, and exporting have dedicated busy states and disabled submit controls. Empty results are distinct from network failure. Form skeletons scroll on short displays.

## Validation and review

```powershell
# backend
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
pnpm exec tsx scripts/verify-money.ts

# mobile
flutter analyze lib/features/money test/widget/money_redesign_test.dart
flutter test
flutter build apk --debug
```

`verify-money.ts` creates isolated fixture organizations, verifies the local HTTP API, tests concurrent manual payment retries and gateway capture allocation, and removes its own rows in `finally`. It does not contact tenants or invoke live gateway onboarding/link creation. Unit tests mock gateway calls and notification adapters.

Mobile tests cover metadata pagination, append retry, six tabs, swipe actions, payment breakup, expense/package forms, reminder/discount sheets, selected-recipient bulk sending, reduced motion, and phone-size layout. Golden images live in `mobile/test/goldens`; the test clock and test fonts are deterministic.

## Operational requirements and boundaries

1. Both `20261109000100_money_redesign` and `20261109000200_money_payment_links` were applied to the configured database during implementation.
2. Payment links require working Razorpay credentials and webhook secret. Subscribe the public HTTPS `/api/v1/webhooks/razorpay` endpoint to `payment_link.paid` and applicable checkout/subscription events. New Money link creation refuses simulated links and disables automatic customer notifications; the user chooses when to share/send.
3. A pending link expires after 30 minutes. An ambiguous creation failure retains its intent so a signed capture can still be accounted for. A pending preparation is not duplicated automatically.
4. Uploads use the existing authenticated storage service and require its configuration. Real WhatsApp/email delivery, live gateway settlement, and device share/save behavior require the corresponding configured services; automated tests do not send real messages or move money.
5. Old unallocated collections cannot be reliably reconstructed from current bill balances. They remain included in total collection and separately identified as unattributed. Automatic refunds and an advance wallet are outside this change; captured overpayments are retained for review.
6. The debug Android default API URL is `http://10.0.2.2:3000/api/v1` for the emulator. A physical device needs a reachable API URL; release builds require HTTPS through `API_BASE_URL`.
