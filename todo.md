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

- [x] Prepare the production Edge Function deployment and scheduler configuration without publishing from this session.
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
- [x] Re-verify the published UI after these functional views/actions are live and save a new checkpoint.

- [x] Replace Quick find navigation with an actual command-center vehicle/work-order search interaction.
- [x] Replace the work-order completion affordance with a real persisted completion mutation and success/error state.
- [x] Re-verify command-center controls and save the next checkpoint.

- [x] Implement Quick find results that search both persisted vehicles and work orders with visible result and empty states.
- [x] Save a new checkpoint after verifying the combined Quick find interaction.

- [x] Remove all static demo fallback arrays and hardcoded dashboard metrics from the authenticated FleetOps UI.
- [x] Ensure every visible command-center action is persisted through a backend procedure or is removed.
- [ ] Add explicit backend-backed create/update flows for the visible resource views and show real empty/loading/error states.
- [ ] Verify the published UI uses the latest checkpoint and contains no placeholder/demo copy before delivery.

- [x] Remove remaining authenticated command-center placeholder copy, fallback content, and hardcoded metrics.
- [x] Complete dedicated data-backed Notifications actions and Billing capacity/status presentation.
- [x] Re-run typecheck, Vitest, production build, and visual verification for the live-connected frontend.
- [x] Save and deliver the new published frontend connection checkpoint.


- [x] Add a real backend-backed work-order creation flow or remove the command-center CTA.
- [x] Remove the non-persisted export action from the command center.
- [x] Fix Billing utilization to query live vehicles and team members within the Billing view.
- [ ] Verify the authenticated published deployment after saving this round of changes.

- [x] Add a Superadmin signup entry point using Supabase Auth.
- [x] Add first-run organization onboarding with organization name and Superadmin profile details.
- [x] Route newly provisioned Superadmins into the authenticated Command Center and Team invitation workflow.
- [ ] Add onboarding tests and verify the published signup-to-invitation flow.

- [ ] Publish and verify Superadmin signup and organization onboarding in production.
- [x] Add automatic draft purchase-order creation when stock falls below reorder level.
- [x] Complete odometer validation for negative readings and jumps above 1,000 km/day.
- [x] Complete Driver DVIR, manual odometer, fuel logging, and photo-proof workflows.
- [x] Complete document expiry/compliance alerts and operational document workflow.
- [x] Complete dedicated Accountant per-vehicle P&L and real-time CPK calculations.
- [x] Strengthen role-specific workspace routing and permissions without Razorpay checkout.
- [ ] Deploy all application and Edge Function changes, configure maintenance scheduling, and verify production workflows.

- [ ] Deploy the latest non-Razorpay workflow changes and verify them on the published production site.
- [x] Save a new checkpoint after the latest signup/onboarding, driver, compliance, accountant, and automation changes.
- [x] Implement and verify post-onboarding navigation into the Command Center and Team invitation flow.
- [x] Make odometer validation truly time-aware for the 1,000 km/day rule.
- [x] Add a dedicated Driver manual odometer submission UI and expose fuel receipt/photo-proof upload in the frontend.
- [x] Add full document create/upload/update/renew operations in the Compliance workspace.
- [x] Correct CPK to use validated distance-traveled logic.
- [x] Implement role-aware frontend routing and gating instead of relying only on the shared Home shell.

- [ ] Verify the full Superadmin signup to onboarding to Team invitation transition with a real authenticated account after deployment.
- [x] Record fuel-log odometer updates in the validated odometer history.
- [x] Add visible Compliance renew/update actions wired to documents.update.
- [x] Add explicit guarded route segments for role-specific FleetOps workspaces.

- [x] Diagnose the production Superadmin signup database error reported during account creation.
- [x] Fix Supabase signup provisioning and verify the database path with regression coverage.
- [ ] Republish and verify the Superadmin signup-to-onboarding flow after the fix.

- [x] Re-test Superadmin signup after the Auth trigger fix and confirm organization and user rows are provisioned successfully.
- [x] Add or document an integration-level verification of the real signup provisioning path.

- [x] Capture the exact second-attempt production signup error and identify the remaining live Supabase failure.
- [x] Verify live organization and user schema defaults/constraints against the Auth trigger and provisioning path.
- [x] Apply and integration-test the definitive signup fix before republishing.

- [x] Fix Superadmin login redirect into organization onboarding for provisioned accounts.
- [x] Fix organization creation completion and refresh of onboarding metadata after setup.
- [ ] Verify login, organization creation, and Team handoff with the real production Superadmin account.

- [x] Refresh the Supabase Auth session metadata after successful organization onboarding completion.
- [ ] Verify with the real Superadmin account that onboarding exits into Team or Command Center without a stale-session loop.

- [x] Diagnose the production undefined.id crash in authenticated onboarding/dashboard rendering.
- [x] Add null-safe data guards for organization, vehicle, work-order, and role-dependent render paths.
- [ ] Verify the corrected authenticated production flow after republishing.

- [x] Add and verify null-safe guards for vehicle-derived UI mappings and remaining role/workspace render branches.
- [ ] Reproduce the authenticated production flow with the real Superadmin account after republishing to confirm the undefined.id crash is eliminated.

- [x] Add null-safe guards for procurement and generic resource-row mappings that assume row or order ids exist.
- [ ] Reproduce the authenticated production flow after republishing and confirm the undefined.id crash is eliminated before final verification.

- [x] Diagnose slow authenticated production loading and identify blocking queries or render gates.
- [x] Add a fast, explicit authenticated loading/onboarding state with independent query failures.
- [ ] Verify production load time and Superadmin onboarding responsiveness after republishing.

- [x] Diagnose why clicking Team from the authenticated left navigation returns to the login gate.
- [x] Preserve the active Supabase session across Team route transitions and load Team queries without auth loops.
- [ ] Verify the published Team navigation flow with the real Superadmin account.

- [ ] Verify Team navigation with the real Superadmin account after publishing the 401 refresh fix.
- [ ] If Team still fails, inspect the production Team procedure response without signing the user out.
