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

- [x] Replace Prisma ORM with Drizzle ORM while keeping Supabase PostgreSQL/Auth/Realtime/RLS unchanged.
- [x] Remove Prisma runtime imports and generated-client dependencies from FleetOps deployment.
- [x] Re-run typecheck, tests, and production build after the Drizzle migration.

- [x] Fully replace Prisma data access with Drizzle PostgreSQL queries across Supabase provisioning, routers, automation, and tests.
- [x] Remove Prisma schema, generated client, package dependencies, and runtime imports.
- [x] Verify Drizzle-only server startup, tests, and production deployment bundle.

- [x] Replace placeholder dashboard controls with real functional routes and backend-backed actions.
- [x] Add a visible Team workspace with invite form, member list, role selection, and invitation status.
- [x] Add authenticated sign-in/sign-out gating and remove misleading demo fallback content from live views.
- [x] Add functional Vehicles, Work Orders, Inventory, Notifications, Compliance, P&L, and Billing views.
- [ ] Verify the published UI flows and save a functional-product checkpoint.

- [x] Replace command-center placeholder actions with real backend-backed behavior or remove unavailable actions.
- [x] Add pending, accepted, and expired invitation status records to Team.
- [x] Expose dedicated Notifications and Billing workspace routes with persisted or explicit subscription state.
- [ ] Re-verify the published UI after these functional views/actions are live and save a new checkpoint.

- [x] Replace Quick find navigation with an actual command-center vehicle/work-order search interaction.
- [x] Replace the work-order completion affordance with a real persisted completion mutation and success/error state.
- [x] Re-verify command-center controls and save the next checkpoint.

- [x] Implement Quick find results that search both persisted vehicles and work orders with visible result and empty states.
- [x] Save a new checkpoint after verifying the combined Quick find interaction.
