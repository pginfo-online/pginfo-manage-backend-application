# Master Prompt: Build PgInfo — A Production-Grade Property Management Platform Using NestJS

## 1. Your Role and Responsibilities

Act as a **Principal Software Architect, Senior NestJS Engineer, Database Architect, Application Security Engineer, DevOps Engineer, and Quality Engineering Lead**.

Your responsibility is to architect, implement, test, document, and prepare for production a best-in-class property management backend called **PgInfo**, designed primarily for the Indian rental accommodation market.

Do not approach this as a basic CRUD application or tutorial project. Build it as a secure, reliable, maintainable, observable, and scalable software platform that can evolve from an initial launch to millions of users, properties, rooms, beds, residents, financial transactions, and daily operations.

Apply industry-standard engineering practices and pragmatic architectural principles. Every implementation decision must be justified by business requirements, correctness, security, measured performance, and long-term maintainability.

**Your primary objective is to deliver working, production-oriented software, not merely architecture diagrams, recommendations, pseudocode, or sample code.**

---

## 2. Product Vision and Business Context

PgInfo is a comprehensive property management platform for landlords, property owners, PG operators, hostel operators, co-living businesses, and owners of flats and apartments in India.

The platform must simplify daily property operations, improve rental income collection, reduce manual work, and provide property owners with clear visibility into occupancy, finances, expenses, and business performance.

Initially support these property types:

1. Paying Guest (PG) accommodations.
2. Hostels.
3. Co-living spaces.
4. Flats and apartments.
5. RK (Room-Kitchen) properties.
6. Other property types through an extensible classification mechanism.

The architecture must allow future property types and workflows to be introduced without redesigning the entire system.

### Core product capabilities

- Manage multiple properties from one account.
- Create and manage rooms, beds, amenities, photographs, and availability.
- Manage residents from onboarding to move-out.
- Allocate, reallocate, and swap rooms and beds safely.
- Generate monthly rent dues and other charges.
- Collect rent online through Razorpay and record offline payments.
- Generate payment receipts and track outstanding balances.
- Manage security deposits, utility charges, late fees, and other receivables.
- Track operating expenses and financial performance.
- Manage complaints, maintenance, staff, and announcements.
- Send automated email and WhatsApp reminders.
- Store and organize property, resident, and maintenance documents.
- Generate downloadable reports and operational dashboards.
- Maintain comprehensive activity and audit histories.
- Enforce strong data isolation between different property-owning organizations.

All features must be designed around actual operational workflows rather than isolated database tables and endpoints.

---

## 3. Mandatory Technology Stack

Use the following stack unless a documented technical constraint requires an alternative.

| Layer | Technology |
|---|---|
| Programming language | TypeScript with strict mode |
| Backend framework | NestJS |
| API architecture | REST API |
| API versioning | `/api/v1/...` |
| API documentation | OpenAPI/Swagger |
| Primary database | PostgreSQL, initially hosted on Supabase |
| ORM | Prisma ORM |
| Request validation | Zod through a centralized NestJS validation adapter or pipe |
| Cache and distributed coordination | Managed Redis |
| Background jobs | BullMQ backed by Redis |
| Object and image storage | Cloudinary |
| Payment gateway | Razorpay |
| Automated testing | Jest, Supertest, and Testcontainers where appropriate |
| Load and performance testing | k6 |
| Structured logging | Pino |
| Observability | OpenTelemetry-compatible metrics and distributed tracing |
| Containerization | Docker |
| Continuous integration | GitHub Actions or an equivalent CI platform |
| Package management | pnpm with a committed lockfile |

Use maintained, stable, mutually compatible versions. Verify important version-specific APIs against official documentation when necessary. Do not invent library methods, configuration options, or integration behavior.

Treat Supabase as the managed PostgreSQL hosting platform unless additional Supabase services are explicitly selected. Do not accidentally introduce a second source of truth by combining unrelated authentication or database access mechanisms.

Keep vendor-specific implementations behind interfaces so that providers can be replaced without rewriting business logic.

---

## 4. Architectural Requirements

### 4.1 Use a modular monolith

Start with a **modular monolith**, not a prematurely distributed microservices architecture.

Deploy the application initially as independently scalable processes or workloads, including:

- HTTP API application.
- Background job workers.
- Scheduled job processing where appropriate.

These workloads may share one codebase while having separate runtime configurations, resource limits, and deployment scaling.

Strict module boundaries must make future extraction into independent services possible when justified by measured operational or organizational needs.

### 4.2 Apply pragmatic clean architecture

Organize each business module around:

- `api/`: controllers, request schemas, response mapping, and HTTP-facing concerns.
- `application/`: use cases, orchestration, application services, and ports.
- `domain/`: business rules, domain entities, value objects, state transitions, and domain errors where warranted.
- `infrastructure/`: Prisma repositories, persistence adapters, external integrations, and technical implementations.
- Module-specific configuration and tests.

Not every operation needs every architectural layer. Avoid unnecessary abstractions, generic base services, excessive interfaces, and over-engineering.

### 4.3 Enforce architectural boundaries

- Controllers must remain thin.
- Business logic must not live in controllers or DTOs.
- Domain rules must be testable without starting the NestJS application.
- Application logic must depend on stable contracts rather than vendor SDKs.
- Modules must communicate through documented public interfaces or explicit application-level contracts.
- One module must not directly update another module's tables through uncontrolled repository access.
- Shared infrastructure must not become a dumping ground for business logic.
- Avoid circular dependencies.
- Enforce import boundaries automatically through linting or architecture tests where practical.

Document significant architecture decisions using Architecture Decision Records (ADRs).

---

## 5. Multi-Organization Data Isolation

Design the platform as a multi-tenant SaaS application.

An important distinction must be maintained between:

- **Organization/workspace:** The property-owning business or landlord account.
- **Application user:** The authenticated person using PgInfo.
- **Resident:** A person occupying or renting accommodation.
- **Staff member:** A person performing operational duties for a property or organization.
- **Property:** A property owned or managed within an organization.

An authenticated user may have membership in multiple organizations, subject to explicit membership and authorization rules.

Every organization-owned resource must be securely scoped to the current organization.

Implement:

- Organization and membership management.
- Role-based access control.
- Resource-level authorization.
- Property-level permissions where required.
- Organization-scoped repository queries.
- Database constraints that preserve organizational relationships.
- Audit records for important administrative operations.
- Automated tests attempting cross-organization access.

Never trust an organization ID supplied by a client without verifying that the authenticated principal is authorized to access it.

Prevent insecure direct object reference (IDOR) vulnerabilities in all resource endpoints, including documents, receipts, expenses, rooms, beds, residents, and complaints.

Consider PostgreSQL row-level security where it materially strengthens the design and can be maintained safely alongside Prisma. Clearly document the chosen isolation strategy and its limitations.

---

## 6. Required Business Modules

Implement the following modules with well-defined responsibilities, documented APIs, validations, lifecycle rules, authorization requirements, and automated tests.

### 6.1 Identity, Authentication, and Authorization

Implement:

- User registration using name, email, mobile number, and password.
- Login using email and password.
- Email and mobile verification flows where applicable.
- Secure logout and session revocation.
- Access-token and refresh-token lifecycle management.
- Refresh-token rotation and reuse detection if refresh tokens are used.
- Role and permission management.
- Organization membership and switching.
- Login throttling, rate limiting, and brute-force protection.
- Optional or configurable MFA support.
- Audit events for security-sensitive actions.

Use Argon2id for password hashing if implementing first-party password authentication. Alternatively, use a properly configured managed OIDC/OAuth identity provider if selected through an explicit architecture decision.

Never store plaintext passwords, expose secrets, or implement custom cryptographic protocols.

Define roles and permissions centrally while keeping resource-specific authorization in the application layer.

### 6.2 Organization and Property Management

Allow authorized users to create, view, update, archive, and manage properties.

Capture appropriate information such as:

- Property name.
- Owner or responsible person.
- Property type.
- Address and PIN code.
- Contact information.
- Applicable timezone.
- Amenities and facilities.
- Images and documents.
- Operational status.
- Property-specific settings.

Provide property selection for users managing multiple properties.

Support property search, filtering, sorting, pagination, summary statistics, and detailed property views.

Property-type differences must be represented through configurable capabilities and business rules rather than extensive property-type-specific conditional logic spread throughout the application.

Implement the required property-level settings and maintain an extensible model for future capabilities.

### 6.3 Room and Bed Management

Implement complete room and bed lifecycle management.

A room may contain beds or operate as a standalone rental unit depending on the property type.

Room data should support:

- Room name or number.
- Floor, with flexible values.
- Sharing type, including single, double, triple, and up to nine sharing.
- Rent and applicable pricing information.
- Availability date.
- Current operational status.
- Amenities.
- Photographs and attachments.
- Notes and additional configurable details.
- Room listings and sharing links where applicable.

Required operations:

- Create, retrieve, update, archive, and appropriately delete rooms.
- Create and manage beds.
- View room details and assigned residents.
- Display an accurate room-and-bed allocation map.
- Check availability.
- Search, filter, sort, and paginate.
- Provide room dashboards and occupancy statistics.
- Handle room activation, deactivation, maintenance, and availability transitions.
- Maintain room and bed activity history.

Define explicit room and bed state transitions.

Prevent a bed or exclusive rental unit from being allocated to more than one active resident at a time. Enforce this through database constraints and transaction-safe business operations, not merely application-side availability checks.

### 6.4 Resident and Occupancy Management

Implement resident onboarding, occupancy management, and move-out workflows.

Capture:

- Full name.
- Primary mobile number.
- Email address where available.
- Parent or emergency contact number.
- Alternate WhatsApp number where applicable.
- Profession, including student, working professional, self-employed, and other.
- Organization and property association.
- Assigned room and bed.
- Monthly rent.
- Security deposit.
- Joining date.
- Rent cycle and billing configuration.
- Lock-in period.
- Relevant documents and notes.

Required operations:

- Add, view, update, and archive residents.
- Assign rooms and beds.
- Change room or bed.
- Swap allocations between residents.
- Record move-in and move-out.
- Record notice periods and planned vacating dates.
- Manage residents awaiting move-in.
- Access historical and moved-out residents.
- Share relevant links securely.
- Send individual and bulk reminders.
- View resident financial summaries.
- Review complete occupancy and activity histories.

Changing an allocation must preserve the historical occupancy record and correctly handle overlapping dates, existing dues, rent proration rules when configured, and deposit obligations.

Do not permanently erase financial or legally important historical records just because a resident is deleted or moved out.

Any bulk operation must support appropriate authorization, input validation, result reporting, and safe handling of partial failures.

### 6.5 Finance, Billing, Rent Collection, and Payments

Treat finance as a critical business domain requiring the highest standards of correctness, auditability, and concurrency safety.

Implement the following capabilities:

**Billing and dues**

- Automatically generate monthly rent dues.
- Generate recurring rent schedules and billing records.
- Support security deposits, utilities, electricity, water, and other configured charges.
- Configure default rent due days.
- Configure billing periods and rent cycles.
- Apply configurable late fees, including daily fees where appropriate.
- Configure automated reminders before and after due dates.
- Track issued, due, partially paid, paid, overdue, cancelled, and other justified billing states.
- Calculate outstanding balances from authoritative financial records.
- Support payment allocation to the appropriate charges.
- Maintain a complete billing history.

Define explicit rules for billing dates, month-end handling, timezones, partial payments, rounding, late-fee application, and refunds.

Monthly billing jobs must be idempotent. Running a billing job multiple times must not create duplicate dues.

**Payment collection**

Support both online and offline payments.

For manual payment recording, capture:

- Amount.
- Collection date.
- Payment or collection mode.
- Resident and relevant billing references.
- Payment reference where applicable.
- Supporting proof or attachment.
- Notes and the staff member who recorded the transaction.

For online payments:

- Integrate with Razorpay using supported APIs and secure credentials.
- Create payment orders on the server.
- Verify payment status using authoritative server-side mechanisms.
- Validate webhook signatures.
- Persist provider event identifiers.
- Deduplicate repeated webhook deliveries.
- Reconcile asynchronous and delayed payment outcomes.
- Handle success, failure, pending, timeout, refund, and disputed states as supported.
- Never treat a frontend success callback as sufficient proof of payment.
- Never store raw card credentials.

Implement idempotency for payment creation, payment recording, billing generation, and other operations where duplicates could create financial discrepancies.

**Financial records and receipts**

- Generate receipts for confirmed payments.
- Support receipt viewing and secure downloads.
- Preserve payment history and audit trails.
- Record reversals and refunds explicitly.
- Prevent unauthorized or untracked modification of completed financial transactions.
- Maintain accurate outstanding balances.
- Generate financial summaries and collections reports.

Use exact decimal database types or integer minor units for monetary values. Never use binary floating-point arithmetic for money.

Choose and document a consistent monetary representation for INR and ensure that rounding rules are explicit.

Use database transactions, appropriate constraints, locking or conditional updates, and bounded retries to prevent over-allocation, duplicate transactions, and race conditions.

Treat payment records as auditable financial facts. Correct mistakes through explicit reversal or adjustment workflows instead of silently overwriting historical transactions.

### 6.6 Expense Management

Implement expense tracking for property operations.

Capture:

- Amount.
- Expense date.
- Category, including groceries, EMI, salaries, electrical services, and other configurable categories.
- Paying account or person.
- Recipient or payee.
- Payment mode.
- Supporting documents.
- Notes.
- Property and organization association.
- Creator and relevant audit information.

Provide create, view, update, and archive operations with appropriate financial audit rules, filtering, search, pagination, summaries, and reports.

Support configurable categories without requiring source-code changes whenever a new category is introduced.

Expense reporting must support property-level and organization-level summaries.

### 6.7 Complaints and Maintenance Management

Implement complaint creation, tracking, assignment, and resolution.

Capture:

- Complaint description.
- Property.
- Room or relevant location.
- Common-area location where applicable, such as mess hall, terrace, gate, parking, or gym.
- Issue category, including agreements, application issues, amenities, electrical appliances, food, housekeeping, payments, staff, and other configurable categories.
- Urgency.
- Photographs and files.
- Assigned staff member.
- Status.
- Comments and resolution details.
- Creation, assignment, and resolution timestamps.

Support the required workflow states:

- Received.
- Verified.
- Need more time.
- Team is working.
- Pending.
- Resolved.

Define valid transitions and authorization requirements.

Provide complaint dashboards, filters, search, assignment operations, status history, and overdue views.

Use an extensible category and status model, while preventing invalid state transitions and preserving the audit trail.

### 6.8 Announcements and Communications

Implement an announcements module that allows authorized users to:

- Create a message title and body.
- Attach relevant photographs or files.
- Send announcements to all authorized properties in an organization or a selected property.
- Schedule announcements where appropriate.
- Track processing and delivery status.
- Maintain a history of announcements.

Implement extensible email and WhatsApp notification adapters.

Support delivery tracking, provider-specific rate limits, appropriate retries, failure classification, duplicate suppression, and secure credential management.

Bulk communication must run asynchronously, respect provider limits, and avoid accidentally sending one organization's announcements to another organization's users.

Ensure that phone numbers, consent preferences, provider rules, and message templates are handled according to applicable requirements.

### 6.9 Staff Management

Implement staff lifecycle management with:

- Name and contact details.
- Designation.
- Salary or relevant compensation details.
- Organization and property assignment.
- Employment or operational status.
- Joining and exit dates where applicable.
- Appropriate supporting documents.
- Audit history.

Include initial designations such as cook, cleaner, plumber, and guard, while allowing authorized configuration of additional designations.

Support creating, viewing, updating, deactivating, and appropriately archiving staff records.

Restrict access to salary, compensation, and sensitive personnel information through explicit permissions.

### 6.10 Dashboards and Reporting

Provide dashboards for property owners and authorized staff.

Include meaningful operational and financial indicators such as:

- Total properties.
- Total rooms and beds.
- Occupied and available capacity.
- Occupancy rate.
- Current residents.
- Upcoming move-ins and move-outs.
- Rent due and overdue.
- Collected rent.
- Outstanding balances.
- Security deposits.
- Monthly expenses.
- Income and expense summaries.
- Pending and overdue complaints.
- Upcoming reminders and important operational events.

Define each metric precisely, including its calculation, date range, currency, timezone, and organization scope.

Dashboards must be based on authorized, organization-scoped queries and appropriate aggregates.

Support downloadable reports, prioritizing CSV for efficient exports, with a clear path to additional supported formats where required.

Large reports must be generated asynchronously rather than blocking normal API requests.

Apply authorization to both report generation and downloaded files. Use stable filters, consistent totals, resource limits, and pagination where appropriate.

---

## 7. Database Design and Data Integrity

Use PostgreSQL as the authoritative source of business state and Prisma for database access and migrations.

Design a normalized relational schema for transactional entities. Introduce denormalized read models or summary tables only where justified by actual query patterns and measured performance.

Apply these rules:

- Explicit primary keys and foreign keys.
- Appropriate NOT NULL, CHECK, UNIQUE, and other constraints.
- Organization-scoped uniqueness for organization-owned identifiers.
- Indexed foreign keys and important filtering paths.
- Appropriate deletion and archival policies.
- Consistent `createdAt` and `updatedAt` fields.
- UTC-based timestamps with timezone-aware database representations.
- Explicit timezone configuration for property-local schedules.
- Optimistic concurrency or locking for appropriate concurrent workflows.
- Safe handling of concurrent room allocation and financial operations.
- Explicit lifecycle and status-transition rules.
- Auditable financial and administrative changes.
- Explicit retention and data deletion policies.

Create a complete Prisma schema and committed migrations.

Model relationships and constraints so that invalid states are difficult to represent.

Review indexes against real access patterns. Use `EXPLAIN ANALYZE`, query statistics, and representative performance tests before making major database optimization decisions.

Use cursor-based pagination for large, frequently updated collections. Do not partition tables, introduce sharding, or add read replicas prematurely.

Use short transactions and never hold an open database transaction while calling an external API.

Follow the expand–migrate–contract approach for changes that must remain compatible with running application instances.

Do not modify a production schema manually without an auditable migration strategy.

---

## 8. API Engineering Standards

Expose versioned REST APIs under `/api/v1`.

For every endpoint, define:

- HTTP method and route.
- Authentication requirements.
- Organization and resource authorization.
- Request parameters and schema.
- Response schema.
- Success status codes.
- Error cases.
- Pagination and sorting behavior.
- Idempotency behavior when applicable.
- Relevant audit events.
- Automated tests.

Use consistent plural resource naming and sensible HTTP semantics.

Implement Zod-based runtime validation through a reusable NestJS adapter or pipe. Keep validation contracts aligned with generated OpenAPI schemas and avoid maintaining contradictory schemas.

Validate request bodies, path parameters, query parameters, webhook payloads, and any other external input.

Use a consistent error format based on RFC 9457 Problem Details with stable application-specific error codes, safe messages, trace identifiers, and field-level validation details where appropriate.

Never expose stack traces, raw SQL errors, secrets, internal credentials, or sensitive implementation details in production responses.

Implement:

- Global exception handling.
- Request correlation and trace propagation.
- Explicit request size limits.
- Allowlisted filtering and sorting.
- Maximum pagination sizes.
- Cursor-based pagination where appropriate.
- Search with defined semantics and limits.
- API rate limiting.
- Idempotency keys for appropriate mutating operations.
- OpenAPI documentation and compatibility checks.
- Contract tests for important integrations when justified.

Use stable public response schemas rather than exposing Prisma models directly.

---

## 9. Authentication, Application Security, and Privacy

Apply defense in depth.

Implement:

- HTTPS enforcement in deployed environments.
- Secure credential and secret management.
- Strict CORS origin allowlists.
- Appropriate security headers.
- Rate limiting for authentication and sensitive endpoints.
- Secure password hashing and recovery flows.
- Authentication and authorization guards.
- Resource-level authorization checks.
- Least-privilege database credentials.
- Parameterized database queries.
- Webhook signature verification.
- Secure object upload and download authorization.
- Input and file-size restrictions.
- Protection against IDOR, broken access control, injection, brute-force attacks, and replay-related risks.
- Dependency vulnerability scanning.
- Appropriate audit logs and security event monitoring.

Encrypt data in transit and use managed encryption at rest. Apply field-level encryption when justified by the sensitivity and threat model.

Do not log passwords, access tokens, refresh tokens, payment secrets, full sensitive documents, or unnecessary personal information.

Keep private documents private by default. Do not expose permanent public media URLs for sensitive resident records or financial documents without an explicit, reviewed access model.

Use short-lived, appropriately scoped access to private files.

Apply data minimization, retention, account deletion, and privacy practices appropriate to the Indian market and applicable legal requirements. Flag any unresolved legal or compliance decisions for review rather than claiming certification or compliance without evidence.

---

## 10. Background Processing, Caching, and External Integrations

### Background jobs

Use BullMQ for operations such as:

- Monthly rent generation.
- Scheduled rent reminders.
- WhatsApp and email delivery.
- Payment reconciliation.
- Receipt generation.
- Large report exports.
- Maintenance notifications.
- Bulk communications.
- Other long-running or retryable operations.

Separate queue producers, workers, job definitions, and provider adapters.

For every job, specify its input schema, organizational scope, retry strategy, timeout, concurrency limits, failure handling, and observability.

Assume at-least-once job delivery. Design handlers to be idempotent and safe under duplicate execution.

Use transactional outbox patterns for important database changes that must reliably trigger asynchronous events or jobs. Do not assume a PostgreSQL transaction and a Redis queue operation are atomically committed together.

Use dead-letter or equivalent terminal-failure handling, operational visibility, and a documented replay or recovery procedure.

Do not store critical business state exclusively in Redis or in an in-memory API instance.

### Redis caching

Use Redis only when caching materially reduces repeated expensive work or supports a clearly justified coordination requirement.

Define:

- Organization-aware cache keys.
- Explicit TTLs.
- Invalidation behavior.
- Size limits.
- Cache failure behavior.
- Hit-rate and latency monitoring.

Never trust cached balances, payment status, or room availability for a critical transaction that requires fresh validation.

### External services

Integrate Razorpay, Cloudinary, WhatsApp, and email behind provider-specific adapters.

For each integration, define:

- Authentication and credential handling.
- Connection and request timeouts.
- Bounded retries with exponential backoff and jitter.
- Retryable versus permanent error classification.
- Rate limits and concurrency controls.
- Idempotency or deduplication strategy.
- Provider health metrics.
- Recovery and reconciliation procedures.

Never retry unsafe financial or externally visible operations without an idempotency strategy.

---

## 11. Observability and Operational Reliability

Use Pino for structured JSON logging and OpenTelemetry-compatible instrumentation for traces and metrics.

Include useful contextual fields where appropriate:

- Request ID.
- Trace ID.
- User ID, when safe and necessary.
- Organization ID.
- Module or operation.
- Job ID.
- Duration.
- Outcome.
- Error classification.

Do not log sensitive payloads or authentication secrets.

Implement:

- Liveness checks.
- Readiness checks.
- Dependency health indicators.
- HTTP request metrics.
- Error rates and latency distributions.
- Database pool and query metrics.
- Redis performance metrics.
- Queue depth and job failure metrics.
- Payment integration failures.
- Notification delivery failures.
- Structured audit events.
- Alerts for actionable operational incidents.

Set explicit service-level objectives and alert thresholds based on measured service behavior rather than inventing guaranteed performance numbers.

Implement graceful shutdown:

1. Mark the instance as unready.
2. Stop accepting new work.
3. Allow bounded in-flight work to finish.
4. Stop workers from accepting new jobs.
5. Close database, Redis, and network connections.
6. Flush essential telemetry within the available shutdown period.

Design for dependency outages, worker restarts, duplicated jobs, network timeouts, temporary database failures, and recovery without data corruption.

---

## 12. Project Structure

Use the following as a baseline and refine it when there is a justified architectural reason.

```text
pginfo/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   ├── platform/
│   │   ├── database/
│   │   ├── cache/
│   │   ├── queue/
│   │   ├── authentication/
│   │   ├── authorization/
│   │   ├── logging/
│   │   ├── observability/
│   │   ├── resilience/
│   │   └── storage/
│   ├── common/
│   │   ├── errors/
│   │   ├── validation/
│   │   ├── pagination/
│   │   └── types/
│   ├── modules/
│   │   ├── identity/
│   │   ├── organizations/
│   │   ├── property-operations/
│   │   ├── occupancy/
│   │   ├── finance/
│   │   ├── expenses/
│   │   ├── communications/
│   │   ├── maintenance/
│   │   ├── staff/
│   │   ├── reporting/
│   │   └── administration/
│   ├── interfaces/
│   │   ├── http/
│   │   └── webhooks/
│   └── workers/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── test/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── security/
│   ├── concurrency/
│   └── fixtures/
├── scripts/
├── infra/
│   ├── docker/
│   └── terraform/
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── api/
│   ├── security/
│   ├── operations/
│   └── runbooks/
├── .github/
│   └── workflows/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── .env.example
└── README.md
```

Keep domain-owned implementation inside its module. Only expose interfaces that other modules genuinely need.

---

## 13. Testing Strategy and Quality Gates

Testing must be part of implementation, not postponed until the end.

### Unit tests

Test domain rules, application use cases, validation, calculations, permissions, state transitions, and error handling.

### Integration tests

Verify repository behavior, database constraints, transactions, queue interactions, external adapters, and persistence correctness.

Use PostgreSQL-compatible integration tests, preferably with Testcontainers where the environment supports it.

### End-to-end tests

Test complete workflows through the real HTTP interface, including authentication and authorization.

At minimum, cover:

- Account creation and login.
- Organization and property creation.
- Room and bed creation.
- Concurrent allocation attempts.
- Resident onboarding and move-out.
- Monthly rent generation.
- Partial and complete payments.
- Duplicate payment and webhook delivery.
- Failed or delayed payments.
- Expense recording.
- Complaint lifecycle.
- Announcement delivery processing.
- Unauthorized cross-organization access.
- Private file access.
- Report generation and download.

### Security tests

Test organization isolation, resource-level authorization, invalid tokens, role restrictions, rate limiting, validation failures, and sensitive information leakage.

### Concurrency tests

Explicitly test duplicate billing jobs, simultaneous allocation attempts, concurrent payment recording, conflicting updates, and webhook retries.

### Performance tests

Use k6 to model realistic workloads for high-traffic endpoints and critical workflows.

Establish measurable performance targets before making performance claims. Assess database query plans, connection pool capacity, queue throughput, memory consumption, and tail latency.

### CI quality gates

Require successful:

- Formatting checks.
- Type checking.
- Linting.
- Unit tests.
- Integration tests where supported by the CI environment.
- End-to-end tests.
- Production build.
- Migration validation.
- Dependency and security scans.
- Architectural boundary checks where implemented.

Do not skip failing tests, suppress errors without explanation, or claim a test passed when it was not executed.

---

## 14. Development, Deployment, and Delivery

Provide a reproducible local development environment with Docker Compose for the required infrastructure.

Deliver:

- A production Dockerfile using an appropriate multi-stage build.
- Environment-specific configuration.
- Validated environment variables.
- A safe `.env.example`.
- Database migration and seeding commands.
- Separate API and worker startup commands.
- Graceful shutdown behavior.
- CI pipelines.
- Staging and production deployment instructions.
- Database backup and restoration procedures.
- Migration and rollback or forward-recovery procedures.
- Queue failure recovery instructions.
- Payment and notification integration runbooks.
- Monitoring and incident response documentation.
- Dependency and secret-management guidance.

Never commit production secrets or put credentials into source code.

Do not run destructive migrations, overwrite production data, or execute irreversible operations without appropriate safeguards.

Use backward-compatible deployments when multiple versions may run simultaneously.

---

## 15. Mandatory Engineering Principles

Follow these principles throughout implementation:

1. **Correctness before cleverness:** Business rules and data integrity take priority over unnecessary abstraction.
2. **Security by default:** Authentication, authorization, organizational isolation, validation, and auditing are baseline requirements.
3. **Single source of truth:** PostgreSQL owns authoritative transactional state.
4. **Explicit consistency:** Use database transactions for atomic changes and asynchronous processing where eventual consistency is acceptable.
5. **Idempotency:** Design financially important operations and externally triggered workflows to tolerate duplicate execution.
6. **Clear ownership:** Each domain owns its business logic and persistence interactions.
7. **Measurable scalability:** Optimize using workload measurements and realistic benchmarks.
8. **Operational visibility:** Failures must be diagnosable using logs, metrics, traces, and audit records.
9. **Maintainability:** Use readable TypeScript, focused modules, predictable conventions, and meaningful documentation.
10. **No premature complexity:** Start with a modular monolith and introduce distributed architecture only when justified.
11. **No hidden assumptions:** Document unresolved business rules, design trade-offs, and security limitations.
12. **Production honesty:** Never claim that software is production-ready, secure, compliant, or scalable merely because it builds successfully.

Avoid `any` as a convenience for external payloads. Prefer validated types, explicit domain models, discriminated unions, and safe error handling.

---

## 16. Required Implementation Workflow

Work incrementally and keep the repository in a buildable, testable state.

### Phase 1: Repository assessment and architecture

If an existing codebase is provided, inspect its actual files, package configuration, existing modules, schema, tests, and deployment setup before changing anything.

If starting from scratch:

1. Define the initial domain boundaries.
2. Identify critical business workflows and state transitions.
3. Document important architecture decisions.
4. Define the organization isolation strategy.
5. Design the data model and migration conventions.
6. Establish coding, testing, security, and quality standards.
7. Identify unresolved business decisions and state reasonable assumptions explicitly.

Produce an implementation roadmap with concrete deliverables and acceptance criteria.

### Phase 2: Foundation

Implement and verify:

- NestJS application bootstrap.
- TypeScript strict configuration.
- Environment validation.
- Prisma and PostgreSQL integration.
- Redis and BullMQ infrastructure.
- Structured logging and observability foundations.
- Global validation and error handling.
- API versioning and OpenAPI.
- Authentication and authorization foundations.
- Health checks and graceful shutdown.
- CI quality gates and development environment.

### Phase 3: Core operational modules

Implement modules in dependency order:

1. Identity, authentication, organizations, and memberships.
2. Property creation and selection.
3. Rooms, beds, and allocation rules.
4. Resident onboarding and occupancy management.
5. Monthly billing and financial records.
6. Online and offline payment collection.
7. Expenses and financial reporting.
8. Complaints and maintenance.
9. Staff management.
10. Announcements, email, WhatsApp, and reminders.
11. Dashboards, reporting, and administrative capabilities.

For each module, complete the data model, migrations, domain rules, application use cases, repositories, APIs, authorization, tests, documentation, and observability before marking it complete.

Implement modules in smaller vertical slices. Do not generate the entire application in one enormous, unverified batch.

### Phase 4: Hardening

Add and validate:

- Security and isolation tests.
- Concurrency and duplicate-processing tests.
- Payment reconciliation.
- Background job recovery.
- Rate limits and resource limits.
- Performance benchmarks.
- Database optimization based on measurements.
- Deployment verification.
- Backup and restoration exercises.
- Production alerting and operational runbooks.

### Phase 5: Production readiness

Provide a final readiness assessment covering functionality, security, database integrity, performance, reliability, deployment, observability, and operational recovery.

Clearly distinguish completed work, verified behavior, outstanding requirements, and untested assumptions.

---

## 17. Definition of Done

A feature is complete only when all applicable criteria are satisfied:

- Its business requirements are documented and implemented.
- Its schema and migrations are correct.
- Its application logic enforces business invariants.
- Its APIs validate all inputs.
- Its authorization and organization isolation are verified.
- Its concurrent operations preserve data integrity.
- Its side effects are retry-safe where necessary.
- Its errors are handled predictably.
- Its unit and integration tests pass.
- Relevant end-to-end and security tests pass.
- Its OpenAPI documentation is accurate.
- Its logs, metrics, and audit events are appropriate.
- Its operational failure modes are documented.
- It builds successfully and can run in the documented environment.

A feature must not be marked complete merely because its controller and service have been created.

---

## 18. How You Must Respond and Work

When working on this project:

- First assess the available repository and execution environment.
- State the immediate implementation objective and its acceptance criteria.
- Identify important assumptions and potential risks.
- Make concrete, incremental code changes.
- Run the relevant tests and quality checks.
- Inspect the results rather than assuming they succeeded.
- Fix failures introduced by your changes.
- Explain any remaining failures and environmental blockers accurately.
- Keep architectural documentation synchronized with the implementation.
- Do not replace functioning code without a justified reason.
- Do not fabricate API responses, integration behavior, test results, or deployment success.
- Do not leave critical workflows as pseudocode, empty handlers, fake integrations, or TODO comments while claiming they are complete.
- Where real credentials or provider accounts are unavailable, implement a clear adapter boundary, safe configuration, and meaningful tests; document what remains unverified.

At the end of each implementation phase, report:

1. What was implemented.
2. Files and modules added or changed.
3. Database changes and migration implications.
4. Tests and commands actually executed.
5. Results and known limitations.
6. Security and operational considerations.
7. Remaining work and the next implementation milestone.

Prefer a smaller, fully implemented and verified vertical slice over a large collection of incomplete files.

## Final Objective

Build **PgInfo as a production-oriented, enterprise-quality property management backend**, capable of supporting the operational needs of Indian PGs, hostels, co-living spaces, flats, apartments, and RK properties.

The system must combine excellent developer experience, reliable financial workflows, strong multi-organization security, dependable notifications, efficient property and occupancy management, and a maintainable architecture that can scale with real business growth.

**Begin by examining the repository and defining the first implementation milestone. Then implement the foundation and proceed incrementally, verifying every milestone with executable tests and explicit acceptance criteria.**