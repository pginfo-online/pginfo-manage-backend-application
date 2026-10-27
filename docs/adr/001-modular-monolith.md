# ADR-001: Modular Monolith Architecture

**Status:** Accepted  
**Date:** 2026-10-26  
**Deciders:** PgInfo Engineering Team

---

## Context

We need to choose an application architecture for PgInfo — a multi-tenant property management SaaS platform. The primary candidates are:

1. **Microservices** — independently deployable services per domain.
2. **Modular monolith** — single deployable unit with strict internal module boundaries.
3. **Traditional monolith** — single deployable unit with no enforced internal structure.

Key constraints driving this decision:

- The team is small and needs to move fast.
- The product is in its early stages; domain boundaries are still being discovered.
- We need clean separation of concerns to avoid a "big ball of mud" as the codebase grows.
- We want the *option* to extract services later without rewriting the system.

## Decision

**Start with a modular monolith.**

### Deployment Model

Deploy as separate workloads from a single codebase:

- **HTTP API** — handles synchronous REST requests.
- **Background Workers** — processes asynchronous jobs via BullMQ.

Both workloads share the same codebase and database but run as independent processes, enabling independent scaling.

### Module Structure

Each business domain lives in its own module under `src/modules/`:

```
src/
├── modules/
│   ├── identity/          # Users, authentication, sessions
│   ├── organizations/     # Orgs, memberships, roles
│   ├── property-operations/ # Properties, rooms, beds, amenities
│   ├── occupancy/         # Tenants, bookings, move-in/move-out
│   ├── finance/           # Invoices, payments, expenses, ledger
│   └── ...
├── platform/              # Cross-cutting infrastructure (database, queue, logging)
└── common/                # Shared DTOs, decorators, guards, utilities
```

### Boundary Rules

- Modules communicate through **exported service interfaces**, not direct repository access.
- A module's internal entities, repositories, and helpers are **private** to that module.
- Cross-cutting concerns (database connections, queue configuration, logging, auth guards) live in `src/platform/` and `src/common/`.
- The NestJS module system enforces import/export boundaries at the framework level.
- Future extraction into independent services is possible when justified by **operational or organizational needs** (e.g., the finance module needs independent scaling or a separate team owns it).

## Consequences

### Positive

- **Fast development** — no network boundaries, no service discovery, no distributed debugging.
- **Simple deployment** — one build artifact, one CI pipeline, one database migration path.
- **Easy refactoring** — rename, move, and restructure with compiler support across the entire codebase.
- **Single database transactions** — cross-module operations can use database transactions when needed (e.g., creating a booking and generating an invoice atomically).
- **No distributed system complexity** — no eventual consistency, no saga orchestration, no inter-service auth.

### Negative

- **Discipline required** — module boundaries are conventions enforced by the framework and team culture, not by network isolation. A careless import can break encapsulation.
- **Risk of entanglement** — without enforcement, modules may become tightly coupled over time, making future extraction harder.
- **Vertical scaling limits** — a single process has memory and CPU limits. Mitigated by running multiple instances behind a load balancer and offloading heavy work to background workers.

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Module boundary violations | Architecture tests or lint rules (e.g., `eslint-plugin-boundaries`) to prevent illegal cross-module imports |
| Shared database coupling | Each module owns its own Prisma models; cross-module joins go through service interfaces |
| "Monolith trap" — never extracting | Periodic architecture reviews to evaluate extraction candidates |

---

## References

- [Modular Monolith with DDD (Kamil Grzybek)](https://github.com/kgrzybek/modular-monolith-with-ddd)
- [NestJS Module System Documentation](https://docs.nestjs.com/modules)
