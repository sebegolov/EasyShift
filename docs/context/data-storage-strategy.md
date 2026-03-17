## Data Storage Strategy

### Current recommendation

For the current EasyShift stage, keep one primary PostgreSQL database and one operational schema.

Why:

- current workload is small and product logic is still evolving fast
- most business flows are transactional and tightly connected: `User`, `OwnerProfile`, `WorkerProfile`, `PVZ`, `Shift`, `ShiftApplication`, `OwnerSubscription`
- a premature split into multiple databases would make onboarding, analytics, and admin tooling harder

### How to structure data now

Keep one database, but think in bounded contexts:

- `identity`
  - `User`
- `owner-operations`
  - `OwnerProfile`
  - `PVZ`
  - `OwnerSubscription`
  - `SubscriptionPlan`
- `worker-operations`
  - `WorkerProfile`
  - `WorkerZone`
- `shift-lifecycle`
  - `Shift`
  - `ShiftApplication`
  - `ShiftAssignment`
  - `Attendance`
  - `Incident`
- `notifications`
  - `NotificationEvent`

### Practical rules

- `User` is the only canonical identity row.
- Role-specific data should stay in role-specific tables and must be reset safely when the active role changes.
- Business history should be preserved where possible; avoid hard deletes for operational records with reporting value.
- For account deletion, prefer anonymization plus cleanup of role-specific tables when there are no blocking dependencies.
- Admin and analytics screens should query aggregates from the primary DB for now.

### Account model and admin context (2026-03)

The current implementation uses a **single logical `User` account** that can work either as an owner or a worker, but only one active role at a time:

- `User.role` is mutually exclusive: `owner` or `worker` (plus service states like `deleted`).
- Role switching is handled centrally in the backend with:
  - dependency checks (PVZ, shifts, zones, incidents, subscriptions, etc.)
  - safe cleanup of role-specific tables when the role is reset
- Account deletion is implemented as **soft-delete + anonymization**:
  - `User` personal data is wiped/anonymized
  - role-specific tables are cleaned up only when there are no blocking dependencies

Developer/admin tooling is built to work **on top of the same primary database**:

- admin statistics, user lists and user details read from the operational DB
- access is restricted by a whitelist of Telegram IDs (`DEVELOPER_TELEGRAM_IDS`)
- this approach keeps one source of truth and postpones any physical DB split

### When a split becomes justified

Do not split now. Revisit only if one of these becomes true:

- the operational database becomes a bottleneck
- heavy reporting begins to affect transactional workloads
- audit/compliance retention needs separate storage
- notification/event volume grows much faster than core business entities

### Future target shape

When scale really demands it, the first safe split is:

1. primary operational PostgreSQL database
2. read replica or analytics store for dashboards and reporting
3. separate audit/log storage if compliance requirements expand

This preserves simple product development today while keeping a clean path for growth.
