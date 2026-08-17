# FleetOps Backend Upgrade

- [x] Read the full-stack web project guidance and inspect the current scaffold capabilities.
- [x] Add backend/database/authentication capability to the project.
- [x] Define the tenant-aware Prisma/Supabase schema and RLS strategy.
- [x] Implement authenticated organization provisioning, invitations, and role enforcement.
- [x] Implement vehicle, odometer, component, work-order, inventory, purchase-order, document, notification, and financial APIs.
- [x] Implement realtime subscriptions and deterministic maintenance/inventory automation.
- [x] Implement trial limits, expiration write-freeze, and Razorpay-ready subscription state.
- [x] Connect the dashboard to persisted backend state and verify critical flows.
- [x] Save a final checkpoint and deliver the backend-enabled project.

- [x] Implement exact-stack backend path using Supabase PostgreSQL, Prisma ORM, Supabase Auth, and Supabase Realtime instead of the managed MySQL/Drizzle upgrade.
- [x] Validate and configure required Supabase connection secrets before schema migration.

- [x] Validate the Supabase project through the CLI using the supplied database password without printing or committing the secret.

- [x] Wire all dashboard sections—vehicles, work orders, notifications, inventory, and activity—to persisted tRPC queries with loading, empty, and error states.
- [x] Trigger low-inventory automation after inventory-affecting mutations, especially work-order completion, and verify the scheduled Edge Function path.
- [x] Remove or isolate the managed Drizzle/Manus auth fallback so the FleetOps runtime uses Supabase Auth and Prisma end to end.
- [x] Add subscription-state procedures and document the concrete Razorpay credential/deployment blocker if payment credentials are unavailable.

- [x] Implement invitation redemption and acceptance tied to the authenticated Supabase user and organization role.
- [x] Add component list/create/update/delete tRPC procedures and tests.
- [x] Replace static inventory, notification, and activity sections with persisted data and section-level empty/error states.
- [x] Remove Manus OAuth/session fallback from the active client runtime and make logout and unauthorized handling Supabase-native.

- [x] Add component procedure tests covering tenant isolation and role enforcement.
- [x] Render live inventory, notifications, and activity data with explicit section-level states.
- [x] Add visible Supabase-native logout and unauthorized-state handling in the active UI.

- [x] Add component procedure tests that exercise CRUD callers and cross-organization isolation.
- [x] Replace the notification bell/count and inventory summary with real persisted data and explicit loading, empty, and error states.
- [x] Implement verified Supabase session-expired handling for protected queries and sign-out.

- [ ] Prepare the production Edge Function deployment and scheduler configuration without publishing from this session.
- [ ] Validate the deployed maintenance callback after the user publishes the project.
- [ ] Run an end-to-end Supabase owner/invited-user Auth and invitation redemption test with real accounts.

- [ ] Replace Prisma ORM with Drizzle ORM while keeping Supabase PostgreSQL/Auth/Realtime/RLS unchanged.
- [ ] Remove Prisma runtime imports and generated-client dependencies from FleetOps deployment.
- [ ] Re-run typecheck, tests, and production build after the Drizzle migration.
