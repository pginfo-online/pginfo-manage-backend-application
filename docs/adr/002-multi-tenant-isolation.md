# ADR-002: Application-Level Multi-Tenant Organization Isolation

**Status:** Accepted  
**Date:** 2026-10-26  
**Deciders:** PgInfo Engineering Team

---

## Context

PgInfo is a multi-tenant platform where each tenant is an **Organization** — a landlord, PG operator, or property management business. Strict data isolation between organizations is a non-negotiable security requirement: a user in Organization A must never see, modify, or infer the existence of Organization B's data.

### Options Considered

| Approach | Description |
|----------|-------------|
| **Separate databases per tenant** | Each org gets its own PostgreSQL database. Complete isolation but extreme operational complexity (migrations, connection pooling, provisioning). |
| **PostgreSQL schemas per tenant** | Each org gets its own schema within a shared database. Good isolation but complex migration management and Prisma doesn't support dynamic schema switching well. |
| **Row-Level Security (RLS)** | PostgreSQL enforces tenant filtering at the database level via policies. Strong guarantees but problematic with Prisma (see below). |
| **Application-level filtering** | Every query includes an `organizationId` filter. Simple, works with Prisma, requires code discipline. |

### Why Not RLS?

- **Prisma compatibility** — Prisma's query generation doesn't integrate cleanly with PostgreSQL RLS policies. Prisma manages its own connection pooling and doesn't set session-level variables (`SET app.current_org`) that RLS policies depend on.
- **Migration friction** — Maintaining RLS policies alongside Prisma's migration system creates operational risk. Policy changes must be manually coordinated with schema migrations.
- **Equivalent security** — Application-level filtering provides equivalent data isolation when consistently applied and verified through automated testing.
- **Future option** — We may revisit RLS if we adopt a direct SQL layer (e.g., raw queries or a different ORM) for read-heavy paths where performance matters.

## Decision

**Use application-level tenant filtering with `organizationId` foreign keys on all tenant-owned resources.**

### Core Rules

1. **Every tenant-owned table** has a non-nullable `organizationId` column with a foreign key to the `Organization` table.

2. **Every repository query** for tenant-scoped data **MUST** include the `organizationId` filter. This value is derived from the authenticated user's current organization context — **never** from client-supplied parameters alone.

3. **Organization context extraction** — The user's active `organizationId` is extracted from the JWT access token, which is set during authentication based on the user's organization membership.

4. **Membership validation** — Authorization middleware validates that the authenticated user has an active membership in the target organization on every request to org-scoped endpoints.

5. **Database-level UNIQUE constraints** include `organizationId` where business uniqueness is scoped to an organization. For example, a room number is unique within an organization's property, not globally:

   ```prisma
   @@unique([organizationId, propertyId, roomNumber])
   ```

6. **No cross-org queries in application code** — Only platform-level administrative operations (e.g., superadmin dashboards, billing aggregation) may query across organizations, and these must be explicitly marked and audited.

### Implementation Pattern

```typescript
// Base pattern — every tenant-scoped query includes organizationId
async findRooms(organizationId: string, propertyId: string) {
  return this.prisma.room.findMany({
    where: {
      organizationId, // ALWAYS present for tenant-scoped queries
      propertyId,
    },
  });
}
```

```typescript
// Controller — organizationId comes from auth context, not request params
@Get('rooms')
async listRooms(@CurrentOrg() orgId: string, @Query() query: ListRoomsDto) {
  return this.roomService.findRooms(orgId, query.propertyId);
}
```

## Consequences

### Positive

- **Simple to implement** — standard `WHERE` clause filtering that every developer understands.
- **Works naturally with Prisma** — no workarounds, no raw SQL, no session variable hacks.
- **Easy to test** — integration tests can create two orgs and verify cross-org access is denied.
- **No Prisma-RLS compatibility issues** — avoids an entire class of subtle bugs around ORM + RLS interaction.
- **Portable** — not coupled to PostgreSQL-specific features; works with any SQL database.

### Negative

- **Code discipline required** — every query must include the org filter. A single forgotten filter is a data leakage vulnerability.
- **No database-level safety net** — unlike RLS, the database itself won't prevent a buggy query from returning cross-org data.
- **Repetitive** — the `organizationId` filter appears in every tenant-scoped query, adding boilerplate.

### Mitigations

| Risk | Mitigation |
|------|------------|
| Forgotten `organizationId` filter | Base repository patterns / helper methods that enforce org scoping by default |
| Cross-org data leakage | Automated security tests that create data in Org A and attempt access from Org B |
| Developer oversight | Code review checklists with explicit tenant isolation verification |
| Regression | Integration tests covering all tenant-scoped endpoints for proper isolation |

---

## References

- [Prisma Multi-Tenancy Guide](https://www.prisma.io/docs/guides/other/multi-tenancy)
- [OWASP: Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
