# ADR-003: Monetary Value Representation — Integer Paise

**Status:** Accepted  
**Date:** 2026-10-26  
**Deciders:** PgInfo Engineering Team

---

## Context

PgInfo handles financial transactions exclusively in Indian Rupees (INR): rent collection, security deposits, maintenance expenses, payment tracking, late fee calculations, and financial reporting. We need a monetary representation that:

- **Avoids floating-point arithmetic errors** (e.g., `0.1 + 0.2 !== 0.3` in JavaScript).
- **Works cleanly with PostgreSQL and Prisma** without type conversion friction.
- **Is simple to reason about** for developers working on financial logic.

### Options Considered

| Approach | Pros | Cons |
|----------|------|------|
| **Prisma `Decimal` type** (PostgreSQL `DECIMAL`/`NUMERIC`) | Arbitrary precision, no rounding errors | Returns `string` or `Decimal.js` object in TypeScript — awkward arithmetic, requires library for every operation |
| **Integer minor units (paise)** | Simple integer arithmetic, no precision issues, native `number` type | API consumers must know values are in paise, requires convention documentation |
| **JavaScript `number` (float)** | Familiar | **NEVER acceptable for money** — accumulates rounding errors, produces incorrect financial totals |

## Decision

**Store all monetary values as integer paise** (`Int` type in Prisma, `INTEGER` in PostgreSQL).

### Convention

```
1 INR = 100 paise

₹1,250.50  →  125050 paise
₹500.00    →  50000 paise
₹0.01      →  1 paisa
```

### Rules

1. **Storage** — All monetary columns use Prisma `Int` (PostgreSQL `INTEGER`). Values represent paise.

   ```prisma
   model Invoice {
     id          String @id @default(cuid())
     amountPaise Int    // Total invoice amount in paise
     paidPaise   Int    @default(0) // Amount paid so far in paise
     // ...
   }
   ```

2. **API contract** — All API inputs and outputs represent money in paise. The API documentation clearly states this convention. Example response:

   ```json
   {
     "invoiceId": "clx...",
     "amountPaise": 125050,
     "paidPaise": 50000,
     "balancePaise": 75050
   }
   ```

3. **Display formatting** — Converting paise to human-readable format (e.g., `125050` → `"₹1,250.50"`) is the **frontend's responsibility**. The backend never formats monetary values for display.

4. **Rounding** — When calculating percentages, splits, or pro-rated amounts, round to the nearest paisa using `Math.round()`. Apply rounding **once at the end** of a calculation chain, not at intermediate steps.

   ```typescript
   // Late fee: 2% per month on overdue amount
   const lateFeePerMonthPaise = Math.round(overdueAmountPaise * 0.02);
   ```

5. **All financial calculations use integer arithmetic only** — addition, subtraction, and multiplication by whole numbers produce exact results. Division and percentage calculations use `Math.round()` as described above.

### Column Sizing

- **`Int` (32-bit signed integer)** — for individual transaction amounts. Maximum: `2,147,483,647` paise ≈ **₹2.15 crore (~₹21.5 million)**. Sufficient for individual rent payments, deposits, and expenses.
- **`BigInt` (64-bit signed integer)** — for aggregate sums, running totals, or ledger balances that could exceed ₹21.5 million. Maximum: `~9.2 × 10^18` paise ≈ **₹92 quadrillion**. Use in Prisma as `BigInt` type.

```prisma
model LedgerEntry {
  id            String @id @default(cuid())
  amountPaise   Int    // Individual entry — Int is sufficient
  // ...
}

model OrganizationBalance {
  id              String @id @default(cuid())
  totalBalancePaise BigInt // Aggregate — may exceed Int range for large portfolios
  // ...
}
```

## Consequences

### Positive

- **No floating-point errors** — integer arithmetic is exact for addition, subtraction, and whole-number multiplication.
- **Simple integer arithmetic** — no special `Decimal` library needed; uses native TypeScript `number` operations.
- **Efficient storage and indexing** — PostgreSQL `INTEGER` is 4 bytes, compact and fast to index and compare.
- **Works naturally with TypeScript `number`** — JavaScript's `number` type safely represents integers up to `2^53` (~90 trillion INR in paise), far exceeding our `Int` column limits.
- **PostgreSQL `INTEGER` is efficient** — well-optimized for range queries, sorting, and aggregation in financial reports.

### Negative

- **API consumer awareness** — all API consumers (frontend, mobile, integrations) must understand that monetary values are in paise, not rupees. Misinterpretation leads to 100x errors.
- **32-bit `Int` limit** — individual amounts capped at ~₹21.5 million. Use `BigInt` for aggregate fields that may exceed this.
- **No multi-currency support** — this design assumes INR only. Multi-currency support would require additional fields (currency code, exchange rate) and is out of scope.

### Mitigations

| Risk | Mitigation |
|------|------------|
| API consumers misinterpret paise as rupees | Clear documentation, field naming convention (`*Paise` suffix), API schema descriptions |
| `Int` overflow on aggregates | Use `BigInt` for sum/balance columns; add validation that individual amounts are within `Int` range |
| Rounding inconsistencies | Centralized rounding utility function; rule to round once at the end of calculations |
| Future multi-currency need | Paise convention is INR-specific; a future ADR would address multi-currency if needed |

---

## References

- [Martin Fowler: Money Pattern](https://martinfowler.com/eaaCatalog/money.html)
- [Stripe API: Amounts in Cents](https://stripe.com/docs/currencies#zero-decimal)
- [MDN: Number.MAX_SAFE_INTEGER](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER)
