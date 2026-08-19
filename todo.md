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

- [x] Diagnose why Team invitation submission produces no visible result and no delivered email.
- [x] Ensure invitation creation returns a persisted token/status and explicit UI success or error feedback.
- [x] Configure or clearly surface the absence of an email provider for invitation delivery without claiming an email was sent.
- [ ] Verify the Team invitation flow in production with a real Superadmin account.

- [ ] Verify the published Team invitation flow with the real Superadmin account and confirm the token appears after submission.
- [ ] If email delivery is required, obtain and configure an approved transactional email provider separately; do not represent manual-token delivery as email delivery.

- [x] Diagnose why the Team invitation mutation remains in Creating state without returning.
- [x] Add a bounded client mutation timeout and identify/fix the blocking backend or database path.
- [x] Verify the invitation request returns a visible success or error in production.

- [x] Verify the published invitation request completes with the automated temporary Superadmin workflow and shows a persisted token or bounded delivery state.

- [x] Verify the published checkpoint asset contains the invitation timeout/result code.
- [x] Capture the exact Team invitation tRPC request, status, and response in the automated authenticated production session.
- [x] Fix any stale asset, route, or server mismatch found and verify the invitation flow again.

- [x] Enforce the requested Superadmin, Fleet Manager, Inventory Manager, Mechanic, Driver, and Accountant workspace matrix in direct routes and navigation.
- [x] Enforce role-specific procedure permissions and prevent cross-workspace data access at the server boundary.
- [x] Restrict Driver data to assigned vehicles and prevent non-authorized access to financial, inventory, billing, and team data.
- [x] Make Team invitation return or fail definitively with a server timeout/error path instead of an indefinite pending request.
- [x] Add RBAC and invitation regression tests and verify the production build.

- [x] Add secure invitation join links that resolve the invitation’s organization and assigned role without allowing user-controlled overrides.
- [x] Add an organization-bound invited-user signup screen with prefilled email and organization identity, password creation, and invitation redemption after Supabase signup.
- [x] Route redeemed invited users automatically into separate locked workspace UIs for Fleet Manager, Inventory Manager, Mechanic, Driver, and Accountant roles.
- [x] Add regression coverage for invitation join validation, organization binding, role routing, and workspace isolation.

- [ ] Re-verify the actual production Team invitation flow with a real Superadmin account after the stale-asset fix, confirming email/join-link success or a bounded visible error.

- [x] Diagnose the published white-screen runtime failure using browser console, network, and production bundle evidence.
- [x] Fix the white-screen root cause and add a regression guard.
- [x] Republish and verify the FleetOps app shell, Join Organization route, and public invalid-invitation state.

- [x] Compare the user-visible white screen with a clean live-domain response after the 5344cc05 release.
- [x] Resolve any remaining live asset-delivery, cache, or boot timing issue and verify the domain renders for a clean request.

- [x] Trace the production dashboard.summary HTTP 500 from the published request through the server procedure and logs.
- [x] Fix dashboard.summary so authenticated sessions receive a safe summary or a bounded actionable error instead of HTTP 500.
- [x] Add dashboard.summary regression coverage, republish, and verify authenticated app rendering.

- [x] Trace why the published Supabase session is not reaching authenticated tRPC requests after login.
- [x] Fix session persistence, Authorization transport, or refresh handling so dashboard and Team requests do not return 401.
- [x] Add regression coverage and verify an authenticated Team invitation request after republishing.

- [x] Create and deliver a comprehensive implementation summary covering FleetOps from initial frontend through current published release, validation, deferred Razorpay scope, and remaining real-account verification.

- [x] Verify the reported `index-DPlPMMp2.js` asset is not the current release asset and compare it with the latest HTML mapping.
- [x] Force a fresh published asset revision containing the current tRPC Authorization header fix and verify the live mapping.

- [x] Run a controlled background end-to-end test with temporary Superadmin and invited-user identities, covering organization provisioning, invitation redemption, and protected RBAC procedures.
- [x] Clean up all temporary test identities and records and document browser-only verification limits.

- [x] Normalize organization date fields returned from PostgreSQL before role, billing, and invitation procedures call Date methods.
- [x] Rerun the background invitation workflow after date normalization and confirm the temporary data cleanup succeeds.

- [x] Diagnose the invitation INSERT failure revealed by the background test and align the Drizzle invitation mapping with the live PostgreSQL schema.

- [x] Extend the background workflow to create and redeem a Fleet Manager invitation, complete the invited profile, and verify Fleet Manager workspace routing.
- [x] Exercise Fleet Manager permitted operations across vehicles, work orders, compliance, and vehicle assignment governance.
- [x] Verify Fleet Manager denial of Superadmin, Accountant, Driver-only, Inventory-only, billing-sensitive, and team-governance operations.
- [x] Verify cleanup of Fleet Manager temporary Auth, organization, invitation, and operational records and report the lifecycle results.

- [x] Fix vehicles.create to provide the required live-schema vehicle status and add regression coverage for Fleet Manager vehicle creation.

- [x] Supply explicit vehicle createdAt and updatedAt audit timestamps because the live vehicles schema has no updatedAt default.

- [x] Align components.create with the live PostgreSQL component schema, including required identifier and audit fields, and add regression coverage.

- [x] Prevent components.update from appending nonexistent updatedAt fields and add a regression test for component updates.

- [x] Align workOrders.create with the live PostgreSQL schema by supplying required ID, status, and audit timestamps, with regression coverage.

- [x] Align documents.create with the live PostgreSQL schema by supplying required identity and audit fields, with regression coverage.

- [ ] Force the public HTML release marker to the Fleet Manager checkpoint and verify the domain serves the current Fleet Manager revision; latest edge check remains one revision behind.
- [x] Mount a cron-authenticated `/api/scheduled/maintenance` callback that runs tenant-scoped maintenance automation and add callback regression tests.
- [x] Register the project-level 15-minute maintenance Heartbeat for `/api/scheduled/maintenance` and record its task UID.
- [x] Add an Inventory Manager background lifecycle covering invitation creation, organization-bound profile completion, role routing, assigned inventory/procurement operations, denial checks, single-use rejection, and cleanup.
- [x] Add regression coverage for Inventory Manager invitation binding, workspace permissions, inventory mutations, procurement mutations, and cleanup.
- [x] Run and publish the Inventory Manager lifecycle validation with the full test suite and report any production-edge limitations.
- [x] Fix the live-schema failure discovered by Inventory Manager inventory.create and add regression coverage before rerunning the lifecycle.
- [x] Add a Driver background lifecycle covering invitation creation, organization-bound profile completion, role routing, vehicle assignment, inspections, fuel logs, odometer updates, denial checks, single-use rejection, and cleanup.
- [x] Add regression coverage for Driver invitation binding, assignment isolation, operational mutations, workspace permissions, and cleanup.
- [x] Run and publish the Driver lifecycle validation with the full test suite and report any production-edge limitations.
- [x] Fix the Driver fuel-log transaction failure (`fn is not a function`) discovered by the lifecycle harness and add regression coverage before rerunning.
- [x] Fix Driver odometer maintenance evaluation when a vehicle has no loaded components and add regression coverage before rerunning.
- [x] Add a Mechanic background lifecycle covering invitation creation, organization-bound profile completion, role routing, assigned work-order handling, inventory consumption, component operations, denial checks, single-use rejection, and cleanup.
- [x] Add regression coverage for Mechanic invitation binding, work-order assignment isolation, completion/inventory mutations, workspace permissions, and cleanup.
- [x] Run and publish the Mechanic lifecycle validation with the full test suite and report any production-edge limitations.
- [x] Fix Mechanic odometer authorization incorrectly applying Driver assignment isolation and add regression coverage before rerunning.
- [x] Fix Mechanic work-order completion when inserting work-order parts requires an explicit ID and add regression coverage before rerunning.
- [x] Fix Mechanic work-order completion notification handling when nested vehicle includes are unavailable and add regression coverage before rerunning.
- [x] Fix Mechanic activity-feed rendering when nested vehicle relations are unavailable and add regression coverage before rerunning.
- [x] Fix Mechanic activity-feed sorting when database timestamps arrive as strings and add regression coverage before rerunning.
- [x] Add an Accountant background lifecycle covering invitation creation, organization-bound profile completion, role routing, financial record creation/listing/metrics, denial checks, single-use rejection, and cleanup.
- [x] Add regression coverage for Accountant invitation binding, financial mutations/metrics, workspace permissions, and cleanup.
- [x] Run and publish the Accountant lifecycle validation with the full test suite and report any production-edge limitations.
- [x] Fix Accountant financial-record creation when the live table requires an explicit ID and add regression coverage before rerunning.
- [x] Upgrade the Superadmin command workspace with organization-wide oversight, trial/billing status, team governance, compliance, and alert summaries.
- [x] Upgrade the Fleet Manager workspace with vehicle onboarding, telemetry/odometer, predictive maintenance, work-order dispatch, and driver assignment surfaces.
- [x] Upgrade the Inventory Manager workspace with SKU/bin/cost stock control, reorder monitoring, vendors, and purchase-order status workflow.
- [x] Upgrade the Mechanic/Technician workspace with assigned task queue, notifications, work execution, labor/parts logging, and completion flow.
- [x] Upgrade the Driver workspace with assigned-vehicle-only DVIR, odometer, fuel/issue reporting, and active-trip context.
- [x] Upgrade the Accountant workspace with INR ledger entry, per-vehicle P&L, CPK/TCO metrics, and financial-only navigation.
- [x] Enforce shared organization context with role-specific record visibility and server-side procedure isolation across all upgraded workspaces.
- [x] Add workspace regression tests, responsive visual verification, and publish the enhanced workspace checkpoint.
- [x] Run a dedicated Superadmin/Owner lifecycle covering bootstrap, organization governance, team invitations, fleet/compliance/financial oversight, billing visibility, and cleanup.
- [x] Run a dedicated Technician lifecycle covering invitation/profile redemption, assigned work-order visibility, component and odometer work, completion behavior, denials, single-use rejection, and cleanup.
- [x] Run regression tests and publish the combined Superadmin and Technician validation result.
- [x] Resolve or explicitly document the Technician role boundary for component creation and odometer updates; current router guards allow Mechanic but deny Technician.
- [x] Correct the dedicated Superadmin harness to validate onboarding state before completion and rerun both role lifecycles.
- [x] Remove legacy broad workspace navigation for authenticated members and route each role to its own workspace surface.
- [x] Keep Superadmin on the executive organization workspace while preserving organization-wide oversight without specialist member navigation.
- [x] Add role-routing and navigation-visibility regression coverage for Superadmin, Fleet Manager, Inventory Manager, Mechanic, Technician, Driver, and Accountant.
- [x] Verify shared organization context remains visible and cross-role operational handoffs remain connected after workspace isolation.
- [x] Run an end-to-end Fleet Manager-to-Mechanic handoff covering shared organization setup, vehicle/inventory preparation, dispatch, assigned-order visibility, completion, inventory deduction, notification/shared-state verification, RBAC isolation, and cleanup.
- [x] Re-run regression tests and publish the verified handoff result or document any concrete defect found.
- [x] Remove Superadmin work-order creation from the left navigation while retaining owner read-only oversight of work-order status and alerts.
- [x] Replace all static organization labels and placeholder tenant text in authenticated workspace shells with the live organization name, including breadcrumbs and headers.
- [x] Prevent Team members/invitations queries from running without an authenticated session and verify no avoidable 401 requests occur during valid workspace loading.
- [x] Add regression coverage for organization-label rendering inputs, Superadmin action boundaries, and authenticated Team query enablement.
- [x] Run full regression/build and publish the corrected workspace release.
- [x] Create a temporary Fleet Manager test identity, capture its authenticated workspace screenshot, and clean up the temporary account and organization data afterward.
- [x] Add Fleet Manager maintenance-template selection and component schedule creation during vehicle onboarding.
- [x] Add mechanic/technician assignment to work-order dispatch plus a live dispatch queue with status, priority, assignee, and completion state.
- [x] Add odometer history, telemetry/source visibility, anomaly flags, and predictive-maintenance signals to the Fleet Manager workspace.
- [x] Add Fleet Manager driver-to-vehicle assignment and resource coordination controls.
- [x] Add compliance document list/create/update and expiry-management surfaces for fleet and drivers.
- [x] Add detailed operational alerts and action links for maintenance, odometer, compliance, and assignment events.
- [x] Add Fleet Manager regression coverage, run the full suite/build, capture the completed workspace, and publish the release.
- [x] Create a temporary Mechanic test identity, capture its authenticated workspace screenshot, and clean up the temporary account and organization data afterward.
- [x] Add a visible Mechanic Start Work action that transitions only assigned orders into IN_PROGRESS.
- [x] Add organization-scoped Mechanic labor-hour logging and repair-note persistence on assigned work orders.
- [x] Add secure Mechanic photo/evidence attachment upload and work-order attachment display using project storage helpers.
- [x] Extend Mechanic completion to include labor, notes, and attachments while preserving inventory deduction and RBAC isolation.
- [x] Add Mechanic regression tests, rerun the cross-role handoff, run the full suite/build, and publish the completed workflow.

- [x] Add Mechanic/Technician Start Work action scoped to assigned work orders.
- [x] Persist work-order start time, labor hours, and repair notes in the Drizzle/Supabase schema.
- [x] Upload and persist tenant-scoped Mechanic photo/evidence attachments through storagePut.
- [x] Replace the Mechanic completion placeholder with an execution form and visible loading/error/success states.
- [x] Add Vitest regression coverage for Mechanic execution controls, RBAC scope, storage upload, and persistence fields.
- [x] Run the updated background Mechanic and Technician lifecycle harnesses against the deployed release, including evidence and labor assertions.
- [x] Verify the first production Heartbeat maintenance execution log.
- [x] Implement Driver Report Vehicle Issue workflow with assigned-vehicle scope, urgency, notes, optional photo evidence, Fleet Manager visibility, and regression coverage.
- [x] Add Accountant revenue/expense entry form and detailed INR financial ledger with tenant/RBAC validation and regression coverage.
- [x] Create public FleetOps landing page with distinct Sign In and Create Organization CTAs while preserving invitation onboarding and authenticated routing.
- [x] Fix invalid Supabase refresh-token recovery so expired sessions do not trigger unauthorized protected-query batches and recover cleanly.
- [x] Reset FleetOps application data by deleting organization-bound records plus all application `users` and `organizations` rows, while preserving Supabase Auth identities.
- [x] Resolve clean-start Superadmin signup when a preserved Supabase Auth identity has no FleetOps application profile, without weakening duplicate-account security.
- [x] Stop dashboard.summary from retrying/refetching repeatedly after unauthorized session state and keep the unload warning non-blocking.
- [x] Run a disposable full lifecycle test covering Superadmin, organization onboarding, all invited roles, fleet setup, alerts, telemetry, maintenance handoff, mechanic execution, inventory consumption, cross-role visibility, RBAC, and cleanup.
- [x] Produce a presentation-ready video walkthrough of the disposable full lifecycle test using captured workflow scenes.
- [x] Read the connected Shoebbirader4/fleetguard repository and compare it with FleetOps without modifying either repository.
- [x] Audit the entire FleetOps application and every member workspace to identify and prioritize improvement opportunities without changing product code.
- [x] Milestone 1: add organization-wide audit events and Superadmin audit visibility.
- [x] Milestone 1: add Fleet Manager issue triage and work-order control surface.
- [x] Milestone 1: add transactional inventory movement records and integrity controls.
- [x] Milestone 1: add secure authorized document/evidence access actions.
- [x] Milestone 1: add regression coverage, lifecycle validation, and production build for the milestone.
- [x] Add tenant-scoped notification acknowledgement so authorized workspace users can mark operational alerts as read.
- [x] Add a tenant-scoped work-order board query with role-safe status grouping and dispatch metadata.
- [x] Add vehicle health detail data with component readiness, odometer trend, open work orders, and compliance signals.
- [x] Add inventory receiving and issuing workflows with transactional movement records and role-safe controls.
- [x] Add Milestone 2 regression tests, visual validation, typecheck, production build, and publish the verified increment.
- [x] Re-verify Milestone 1 audit, triage, movement, secure-access, and RBAC contracts on the current release.
- [x] Re-verify Milestone 2 Kanban, vehicle-health, inventory receive/issue, movement, and audit contracts on the current release.
- [x] Resolve any verified defects found during Milestone 1 and Milestone 2 verification before starting Milestone 3; no application defects were found, and the public-edge cache mismatch remains documented separately.
- [x] Define and begin Milestone 3 from the verified baseline with role-safe tests and a published kickoff checkpoint.
- [x] Milestone 3: add role-safe CSV export for the Accountant financial ledger and Fleet Manager compliance register.
- [x] Milestone 3: add export affordances with clear loading, empty, and browser-download behavior.
- [x] Milestone 3: add regression tests and publish the reporting/export kickoff checkpoint.
- [x] Audit Milestone 3 CSV export requirements and confirm all tracker items are complete.
- [x] Validate Milestone 3 export RBAC, audit logging, tests, build, and published release before advancing.
- [x] Define and begin Milestone 4 only after Milestone 3 passes its completion gate.
- [x] Milestone 4: add secure PDF report generation for compliance and financial exports without exposing cross-tenant data.
- [x] Milestone 4: add offline-ready draft persistence for Driver issue reports and Mechanic execution notes, with explicit sync status.
- [x] Milestone 4: add regression tests, lifecycle validation, and publish the first Milestone 4 increment.
- [x] P0 priority 1: upgrade Superadmin audit visibility into a tenant-scoped searchable audit log with actor, role, action, entity, date, and outcome filters.
- [x] P0 priority 2: add a unified Fleet Manager triage queue combining driver issues, expiring documents, open work, and low-stock signals with acknowledge, assign, defer, and resolve actions.
- [x] P0 priority 3: implement explicit work-order lifecycle states for waiting for parts, ready for review, rework, completed, and cancelled with role-safe transitions and audit events.
- [x] P0 priority 4: add work-order parts reservation and return workflows with reserved quantities, stock protection, movement/audit records, and role-safe controls.
- [x] P0 priority 5: add mechanic/technician execution checklists and Fleet Manager or Superadmin review approval before final work-order completion.
- [x] P0 priority 6: add a Driver daily home with start-of-shift DVIR, odometer and fuel capture, assigned-vehicle readiness, unsafe-to-drive disposition, and Fleet Manager escalation.
- [x] P0 priority 7: add Superadmin organization settings for company identity, operating timezone, default odometer policy, and safety escalation contacts with tenant-scoped persistence.
- [x] P1 accounting reconciliation: add an Accountant reconciliation query comparing fuel logs and ledger fuel expenses, with visible mismatch status and tenant-scoped audit access.
- [x] Verify the intended Supabase CLI project, PostgreSQL connectivity, and pending Drizzle migration state before applying organization settings schema changes.
- [x] P1 maintenance templates: add reusable tenant-scoped maintenance templates with Fleet Manager assignment into vehicle work orders and visible template controls.
- [x] P1 driver assignment administration: add clear active-assignment visibility and guarded reassignment controls for Fleet Manager with tenant-scoped audit events.
- [x] P1 document import: add tenant-scoped compliance document CSV preview/import with row validation, duplicate protection, and audit-backed Fleet Manager controls.
- [x] P1 observability: add safe public health and release diagnostics for the published FleetOps deployment, with backend dependency status and regression coverage.
- [ ] Reconcile all 20 actionable P0 requirements in FleetOpsWhole-ProductandWorkspaceImprovementAudit.md item by item and implement any P0 gaps that remain.
- [x] Authoritative P0 accounting integrity: add immutable financial reversals/adjustments with actor and reason, plus Superadmin approval for high-value expenses and manual adjustments.
- [x] Authoritative P0 storage lifecycle: add file type/size validation, checksum metadata, retention/orphan policy checks, and access-log coverage for stored documents/evidence.
- [x] Authoritative P0 notification policy: add role/severity/source routing, deduplication, acknowledgement escalation state, and source-resolution closure safeguards.
- [x] Authoritative P0 inventory concurrency: add explicit adjustment workflow and transactional conflict handling beyond insufficient-stock protection.
- [ ] Authoritative P0 workspace architecture: reduce monolithic workspace coupling, replace remaining broad any usage in touched surfaces, and centralize query policy contracts.
- [x] Architecture subtask: centralize seven-role RBAC policy contracts and reusable tenant scope helper with regression tests.
- [x] Architecture subtask: replace Team workspace invitation/member any annotations with shared client domain types and safe token handling.
- [x] Architecture subtask: extract TeamWorkspace into its own module and update workspace-boundary regression coverage.
- [x] Architecture subtask: extract NotificationWorkspace and share WorkspaceState across workspace modules with regression-safe behavior.
- [x] Architecture subtask: replace the Driver workspace vehicle selection any annotation with the shared FleetVehicle domain type.
- [x] Architecture subtask: replace mechanic inventory-part and service-component map any annotations with shared InventoryPart and ServiceComponent types.
- [x] Architecture subtask: replace owner and Fleet Manager workspace collection any annotations with shared notification, document, audit, vehicle, work-order, member, and maintenance-signal types.
- [x] Architecture subtask: replace Fleet Manager dispatch, board, triage, issue, assignment, odometer, and template-map any annotations with shared domain types.
- [x] Architecture subtask: replace Inventory Manager stock, purchase-order, movement, and Mechanic execution collection any annotations with shared domain types.
- [x] Architecture subtask: remove the final broad any annotation from RoleWorkspaces using the shared VehicleIssueStatus union.
- [x] Architecture subtask: replace FunctionalWorkspace Accountant reconciliation, metrics, financial ledger, vehicle, and work-order any annotations with shared domain types.
- [x] Architecture subtask: replace FunctionalWorkspace Driver issue, inspection, fuel-log, Compliance document, Procurement order, and generic resource-row any annotations with shared domain types.
- [x] Architecture subtask: eliminate all broad any annotations from FunctionalWorkspace with shared domain and generic resource-row contracts.
- [x] Architecture subtask: extract DriverWorkspace into client/src/components/workspaces/DriverWorkspace.tsx and retarget its workflow regression coverage.
- [x] Architecture subtask: extract ProcurementWorkspace into client/src/components/workspaces/ProcurementWorkspace.tsx and preserve its live purchase-order query and regression coverage.
- [x] Architecture subtask: extract ComplianceWorkspace into client/src/components/workspaces/ComplianceWorkspace.tsx and preserve document upload, renewal, expiry, and export behavior.
- [x] Architecture subtask: extract AccountantWorkspace into client/src/components/workspaces/AccountantWorkspace.tsx and retarget financial-ledger regression coverage.
- [x] Architecture subtask: extract OrganizationSettingsWorkspace into client/src/components/workspaces/OrganizationSettingsWorkspace.tsx and preserve Superadmin settings persistence and validation.
- [x] Architecture subtask: extract ResourceWorkspace and RoleOverviewWorkspace into dedicated modules while preserving shared live queries, billing, work-order, notification, and role-overview routing.
- [x] Authoritative P0 workspace architecture: reduce monolithic workspace coupling through dedicated workspace modules, eliminate broad any usage in touched surfaces, and retain centralized RBAC/query policy boundaries.
- [x] Authoritative P0 backup and recovery: add a Supabase PostgreSQL, Storage, Auth, migration, tenant-retention, and restore-verification runbook with regression coverage.
- [x] Authoritative P0 data integrity: add expectedUpdatedAt validation to work-order status transitions, return explicit CONFLICT errors for stale edits, and pass row timestamps from Fleet Manager and Mechanic controls.
- [x] Production verification increment: confirm the published landing page resolves with distinct Sign In/Create Organization routes and current organization-bound messaging; keep authenticated session tests explicitly pending.
