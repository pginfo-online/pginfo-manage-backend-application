# Analytics dashboard performance

The dashboard previously issued 21 Prisma aggregates inside one transaction.
That held a connection while independent reads ran serially. The mobile
dashboard also used the general properties endpoint, which loads rooms,
beds, and residents even when only labels are needed.

The reporting service now runs independent reads in batches of eight, keeps
in-flight requests for the same organization/property/period together, and
retains successful responses for five seconds. The cache is bounded to 500
keys per API process. A slim property-label endpoint returns 20 rows per page
with a 21st-row continuation check, and the mobile screen requests more pages
only when asked.

The migration adds organization, property, status, and date indexes for
dashboard reads. It was applied to the configured Supabase database on
2026-11-04. The first attempt used `CREATE INDEX CONCURRENTLY`, which this
Prisma migration runner placed in a transaction and PostgreSQL rejected.
Inspection showed no indexes from that failed attempt. After marking the
attempt rolled back, the migration was changed to transactional index builds
and applied successfully. The affected tables were small (under 164 KiB each)
at deployment. Prisma reports the schema up to date, and all six indexes
are present.

Read-only smoke testing against the configured database on 2026-11-04
returned the new breakdown and ageing fields. A cold organization snapshot
took about 7.4 seconds before the index migration and 6.8 seconds after it;
an immediate repeat after the cache fix resolved from memory. This is still too slow for a cold
production dashboard. Before claiming capacity for millions of users, run
authenticated load tests with realistic organization/property sizes, measure
the slow aggregates with `EXPLAIN (ANALYZE, BUFFERS)`, and consolidate billing,
payment, and expense scans or add asynchronously maintained rollups. The
per-process cache does not provide cross-instance invalidation.

All dashboard queries include organization scope. Property-scoped raw SQL
also filters by property ID, and raw values are parameterized through Prisma.
