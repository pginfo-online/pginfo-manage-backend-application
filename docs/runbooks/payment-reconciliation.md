# PGInfo payment reconciliation

Autopay, Razorpay Checkout, payment links, and fixed-amount UPI QR codes use the PGInfo Razorpay merchant credentials. The tenant ledger records captures in paise. A valid capture that cannot be allocated to the current dues appears in Online Collections & Payouts for review.

## Production configuration

1. Use `https://app.pginfo.business/api/v1/webhooks/razorpay` in Razorpay Live Mode. Configure the same signing secret in the backend and Razorpay Dashboard. An unsigned POST should return HTTP 400, and a request with an invalid signature should return HTTP 401.
2. Enable `payment.captured`, `payment.failed`, `order.paid`, `payment_link.paid`, `payment_link.expired`, `payment_link.cancelled`, `qr_code.credited`, `qr_code.closed`, `refund.processed`, and the Autopay authentication, activation, charge, pending, halt, pause, resume, completion, and cancellation events.
3. Set `PAYOUT_BANK_ENCRYPTION_KEY` to a separately generated 32-byte secret encoded as 64 hexadecimal characters. Store it in the deployment secret store and retain it with the database backups. The encryption key is required to read submitted bank account numbers.
4. Apply the central collections migration before starting the new API and admin. Ask owners with existing Route-only bank records to submit the full account number through Money → Banks. Existing masked digits cannot be used to reconstruct it.
5. Check Razorpay webhook delivery history for failed deliveries to the old URL. Replay authentic captured, QR, link, subscription, and refund events in Razorpay where available. Investigate older missing captures against the provider transaction and settlement reports.

## Settlement and payout workflow

1. Open **Online Collections & Payouts**, find the Razorpay payment ID, and check the tenant, property, and captured amount. If dues changed, use **Apply capture to dues** after reviewing the tenant ledger, or reconcile the refund through Razorpay.
2. Enter the settlement date shown in Razorpay and select **Verify settlement**. The API checks that the Razorpay reconciliation report contains the captured payment and that the processed settlement has a bank UTR.
3. Have a finance administrator verify the destination in **Payout KYC Accounts**. Account number access is recorded in the audit log.
4. Prepare the payout against the verified destination. The app reserves a single payout for the collection. Send the displayed amount from the bank portal and record the completed transfer using its unique bank UTR and transfer date. Release the reservation only after confirming the bank transfer was never initiated.
5. Review refunds reported after a payout against the recorded bank transfer. Historical Razorpay Route transfers remain visible in the register. Existing Route transfers and historical payments with unverifiable Route activity stay in review.

The owner payout amount is the net Razorpay settlement credit less the recorded PGInfo Autopay fee. Payments with a refund or unresolved allocation are held. Checkout, payment links, and generated QR codes use a zero PGInfo fee.

## Verification

Use an isolated PostgreSQL and Redis instance for `pnpm test:e2e`. The integration tests send signed webhook requests to NestJS, exercise payment allocation and refunds, and test reservation concurrency and bank-detail access. For a live acceptance run, use an agreed payment amount, authorized payer, and verified bank destination. Match the capture, receipt, settlement, and payout references against Razorpay and the bank.
