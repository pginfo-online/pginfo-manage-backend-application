# PgInfo — Production-Grade Property Management Platform

> A scalable, multi-tenant property management backend designed for the Indian rental accommodation market (Paying Guests, Hostels, Co-living spaces, Flats, Apartments, and RK properties).

---

## 1. Overview & Architecture

PgInfo is built as a **Modular Monolith** in TypeScript using **NestJS**, **Prisma ORM**, **PostgreSQL** (hosted on Supabase or self-hosted), and **Redis** (caching and BullMQ background workers).

### Architectural Foundations
- **Modular Monolith**: Clean domain boundaries under `src/modules/` separating Identity, Organizations, Property Operations, Occupancy, Finance, Expenses, Maintenance, Staff, Communications, and Reporting.
- **Independent Workloads**: Single codebase deployed as two horizontally scalable runtime workloads:
  1. `HTTP API Application` (`node dist/main.js` on port 3000)
  2. `Background Job Workers` (`node dist/worker.js` with BullMQ)
- **Multi-Tenant SaaS Data Isolation**: Strict application-level tenant filtering (`organizationId` on all tenant resources) verified via cryptographic JWT tenant context. Cross-organization access attempts (IDOR) are blocked and tested by dedicated security test suites.
- **Financial Exactness (Integer Paise)**: All monetary values in the database and API are stored and calculated as exact 32-bit/64-bit integer paise (1 INR = 100 paise), avoiding floating-point rounding errors entirely.
- **Idempotent Billing & Payments**: Rent generation and payment collection enforce cryptographic uniqueness and PostgreSQL unique constraints (`P2002` deduplication) to guarantee zero duplicate dues or double collections under high concurrency.
- **Defense in Depth**: Passwords hashed with **Argon2id**, HTTP security headers with **Helmet**, rate limiting with **@nestjs/throttler**, runtime validation with **Zod**, and RFC 9457 Problem Details error formatting.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 LTS |
| Language | TypeScript 6 (strict mode enabled) |
| Framework | NestJS 12 |
| API Architecture | REST API under `/api/v1` |
| API Documentation | OpenAPI 3.0 / Swagger UI at `/api/docs` |
| Primary Database | PostgreSQL 16 (hosted on Supabase or Docker) |
| ORM | Prisma ORM 6 |
| Validation | Zod via centralized NestJS `ZodValidationPipe` |
| Caching | Redis 7 via `ioredis` |
| Background Queues | BullMQ 5 backed by Redis |
| Payment Gateway | Razorpay (Server orders, HMAC SHA-256 verification, Webhooks) |
| Object Storage | Cloudinary (abstracted via `StorageService` interface) |
| Email Service | Resend API (abstracted via `EmailAdapter` interface) |
| WhatsApp Service | Meta Cloud API / Provider HTTP adapter |
| Structured Logging | Pino with request correlation IDs (`X-Trace-Id`) |
| Testing | Vitest 4, Supertest |
| Load Testing | k6 |
| Package Manager | pnpm (with frozen lockfile) |

---

## 3. Directory Layout

```text
backend/
├── src/
│   ├── main.ts                       # HTTP API application entry point
│   ├── worker.ts                     # Background worker entry point
│   ├── app.module.ts                 # Root NestJS module
│   ├── config/                       # Zod-validated environment config
│   ├── platform/                     # Infrastructure & cross-cutting platform concerns
│   │   ├── database/                 # PrismaService with health checks & lifecycle
│   │   ├── cache/                    # Redis client & CacheModule
│   │   ├── queue/                    # BullMQ QueueModule configuration
│   │   ├── authentication/           # Passport JWT strategy, guards & decorators
│   │   ├── authorization/            # OrgRolesGuard, RequireOrgGuard, decorators
│   │   ├── logging/                  # Pino structured JSON logger with sanitization
│   │   ├── observability/            # Health checks (/health/live, /health/ready)
│   │   └── storage/                  # StorageService interface & Cloudinary adapter
│   ├── common/                       # Shared domain types & error handling
│   │   ├── errors/                   # RFC 9457 GlobalExceptionFilter & AppErrors
│   │   ├── validation/               # ZodValidationPipe
│   │   ├── pagination/               # Cursor & offset pagination helpers
│   │   └── types/                    # Common context & auth types
│   ├── modules/                      # Business Modules
│   │   ├── identity/                 # Users, Argon2id auth, JWT rotation & reuse detection
│   │   ├── organizations/            # Multi-tenant orgs, members & context switching
│   │   ├── property-operations/      # PGs, hostels, flats, rooms, beds & floor occupancy maps
│   │   ├── occupancy/                # Residents, onboarding, room reallocation, bed swaps, move-outs
│   │   ├── finance/                  # Monthly rent dues, charges, offline & Razorpay payments, receipts
│   │   ├── expenses/                 # Operational expenses, categories & category/property summaries
│   │   ├── maintenance/              # Complaints state machine, assignments & comment threads
│   │   ├── staff/                    # Staff lifecycle, designations & compensations
│   │   ├── communications/           # Announcements, WhatsApp/Email adapters & rent reminders
│   │   └── reporting/                # Operational/financial dashboards & CSV exports
│   ├── interfaces/
│   │   └── webhooks/                 # Razorpay HMAC signature-verified webhook handler
│   └── workers/                      # BullMQ processors (billing, communications)
├── prisma/
│   ├── schema.prisma                 # Authoritative normalized PostgreSQL schema
│   └── seed.ts                       # Database seeder
├── test/
│   ├── unit/                         # Unit tests (40+ domain & application tests)
│   ├── security/                     # Multi-tenant data isolation & IDOR tests
│   ├── concurrency/                  # Race condition tests (bed collisions, billing collisions)
│   └── app.e2e-spec.ts               # End-to-end integration tests
├── scripts/
│   └── k6/load-test.js               # Performance & load testing script
├── docs/
│   ├── adr/                          # Architecture Decision Records (001, 002, 003)
│   ├── operations/                   # Production deployment & database runbooks
│   └── runbooks/                     # Payment & queue failure recovery guides
├── Dockerfile                        # Multi-stage production container build
├── docker-compose.yml                # Local PostgreSQL 16 & Redis 7 services
└── package.json
```

---

## 4. Getting Started

### Prerequisites
- Node.js >= 22.0.0
- pnpm >= 9.0.0 (`npm install -g pnpm`)
- Docker & Docker Compose (or access to PostgreSQL and Redis)

### Local Development Setup

1. **Clone and install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start Infrastructure Services**:
   ```bash
   docker compose up -d
   ```
   *Starts PostgreSQL 16 on port 5432 and Redis 7 on port 6379 with healthchecks.*

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your database credentials (e.g., Supabase connection string) and secrets.

4. **Initialize Database Schema & Client**:
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate:dev
   ```

5. **Start HTTP API**:
   ```bash
   pnpm start:dev
   ```
   - API: `http://localhost:3000/api/v1`
   - Swagger Documentation: `http://localhost:3000/api/docs`
   - Health Live Check: `http://localhost:3000/health/live`
   - Health Ready Check: `http://localhost:3000/health/ready`

6. **Start Background Job Worker** (in a separate terminal):
   ```bash
   pnpm start:worker
   ```

---

## 5. Testing & Quality Gates

The project enforces strict quality gates:

```bash
# Type-check TypeScript codebase without emitting
pnpm typecheck

# Fast AST linting
pnpm lint

# Run all unit, security, and concurrency tests
pnpm test

# Run HTTP end-to-end tests
pnpm test:e2e

# Run tests with code coverage report
pnpm test:cov

# Production build verification
pnpm build
```

### Specialized Test Suites
- **Tenant Isolation Security Tests** (`test/security/tenant-isolation.spec.ts`): Verifies that user principals in Organization A receive 404/Forbidden when attempting to query or mutate resources belonging to Organization B (IDOR prevention).
- **Concurrency & Race Condition Defenses** (`test/concurrency/concurrent-operations.spec.ts`): Tests simultaneous bed allocation races (first succeeds, second is rejected with 409 Conflict) and concurrent billing runs (guarantees zero duplicate bills via `P2002` handling).

---

## 6. Load & Performance Testing (k6)

Run realistic load tests against the running API:

```bash
k6 run scripts/k6/load-test.js
```

SLA Thresholds:
- `http_req_duration`: 95th percentile < 200ms, 99th percentile < 500ms
- `http_req_failed`: Error rate < 1.0%

---

## 7. Operational Runbooks

- [ADR-001: Modular Monolith Architecture](docs/adr/001-modular-monolith.md)
- [ADR-002: Multi-Tenant Data Isolation Strategy](docs/adr/002-multi-tenant-isolation.md)
- [ADR-003: Monetary Value Representation in Integer Paise](docs/adr/003-monetary-representation.md)
- [Database Backup, Migration, and Recovery Guide](docs/operations/database-runbook.md)
- [Payment Reconciliation & Webhook Runbook](docs/runbooks/payment-reconciliation.md)

---

## 8. License

UNLICENSED — Private & Proprietary to PgInfo.
