# Property module performance

## Root causes and changes

- `GET /properties` previously loaded nested rooms, beds, residents, and bookings for every property in the page. It now pages scalar properties and obtains room, bed, resident, booking, and due counts through grouped queries. The bed count uses a scoped join so the application does not fetch every room ID or bed row.
- `GET /properties/:id/rooms-page` previously loaded resident and booking relations for every bed. The list now returns only bed identifiers, numbers, and availability. The single-room endpoint still loads current occupants and bookings for its detail sheet.
- Room creation previously read the new room and its beds after inserting them. `createManyAndReturn` returns the new beds in the same transaction, avoiding the extra read.
- Tenant creation validates property, room, and bed concurrently, then claims the bed and writes resident, dues, payments, occupancy history, and audit records in one transaction. The conditional bed claim prevents two requests from assigning the same available bed.
- Property switching now relies on property-scoped Riverpod provider dependencies instead of manually invalidating multiple providers. Room search and floor filtering are sent to the API; the tenant room picker performs its own search.
- Migrations add indexes for dashboard and property lookups and fields for the tenant and opening-balance forms.
- The tenant WhatsApp reminder preference now controls WhatsApp rent-reminder delivery. Existing tenants retain the prior enabled behavior; newly added tenants can opt out in the form.

## Read-only measurements

On 2026-11-04, direct calls to `PropertiesService.findAll` against the configured remote Supabase database with a 20-property page took approximately 6.2 s cold and 1.8 s on an immediate repeat before the grouped bed join. After it, the same two-call check took 6.7 s cold and 1.2 s on an immediate repeat. These are single-client observations, not a load test; cold connection setup and network latency dominate and vary. No claim of million-user capacity follows from these measurements.

## Follow-up capacity work

Run production-like load tests with representative property, room, resident, and bill counts; record p50, p95, p99 latency, database CPU, connection-pool waits, and query plans. The current mobile room list uses offset pagination, which can degrade on deep pages; use cursor pagination if large properties require deep scrolling. Consider a cached or materialized property summary when real traffic shows aggregate queries becoming a bottleneck.
