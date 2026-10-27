# Database Operations & Maintenance Runbook

## 1. Overview
PgInfo uses **PostgreSQL 16** hosted on Supabase (or self-hosted) as the authoritative transactional source of truth, accessed through **Prisma ORM**.

---

## 2. Migration Strategy (Expand–Migrate–Contract)

To ensure zero-downtime deployments, schema changes must follow the **Expand–Migrate–Contract** pattern:

1. **Expand**: Add new nullable columns, tables, or indexes. Backward compatibility with running application instances is preserved.
2. **Migrate**: Run data migration scripts to populate new columns.
3. **Contract**: Once all application instances have transitioned to reading and writing the new columns, drop old columns or enforce `NOT NULL` constraints.

### Running Migrations
- **Development**:
  ```bash
  pnpm prisma:migrate:dev --name add_feature_x
  ```
- **Staging & Production**:
  ```bash
  pnpm prisma:migrate:deploy
  ```
  *Never run `prisma migrate dev` or `prisma db push` against production.*

---

## 3. Backup and Disaster Recovery

### Automated Backups
- Supabase automatically provides automated daily snapshots and point-in-time recovery (PITR) up to 7-30 days based on plan.

### Manual / Offsite Backups
To take a full logical backup:
```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="pginfo_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Restoration Procedure
To restore into a disaster-recovery or staging database:
```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$TARGET_DATABASE_URL" \
  "pginfo_backup_YYYYMMDD_HHMMSS.dump"
```

---

## 4. Performance Tuning & Index Verification

- Verify slow queries with `pg_stat_statements`:
  ```sql
  SELECT query, calls, total_exec_time, mean_exec_time, rows
  FROM pg_stat_statements
  ORDER BY total_exec_time DESC
  LIMIT 20;
  ```
- All foreign keys and tenant filtering columns (`organization_id`, `property_id`, `resident_id`, `status`) must have active b-tree indexes as defined in `prisma/schema.prisma`.
