# ADR 004: Separate the Platform Admin Control Plane

- Status: Accepted
- Date: 2026-11-03

## Context

PGInfo already has organization-scoped roles for owners and staff. Those roles
authorize work inside one organization and must not grant access to platform-wide
user, finance, configuration, or audit data.

Putting platform privileges into organization memberships would create ambiguous
tenant boundaries, make revocation difficult, and risk privilege escalation when
an organization role changes.

## Decision

Platform administration uses a separate `PlatformAdmin` identity extension with:

- an explicit platform role and bounded permission set;
- active, suspended, and revoked lifecycle states;
- live database validation on every authenticated request;
- additive permission overrides validated against a closed permission catalog;
- immutable audit events for privileged reads, exports, and mutations;
- safeguards that prevent removing or suspending the last active super admin.

Organization membership remains the only source of organization-scoped access.
Platform admin status does not implicitly create an organization membership, and
organization roles never imply platform permissions.

## Consequences

The control plane has a clear authorization boundary and can be independently
reviewed, revoked, and audited. Admin requests perform a live identity lookup,
which adds database latency; this is an intentional security tradeoff. At scale,
short-lived signed authorization snapshots may be introduced only with reliable
revocation propagation and bounded staleness.

Financial records remain authoritative in their existing modules. Admin APIs may
review them and open investigation cases but do not silently rewrite settled
payments or ledger entries.
