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
- [x] Validate the deployed maintenance callback after the user publishes the project; Heartbeat task QSscoBdUfDSKYjuNaT6jJa returned HTTP 200 with successful tenant evaluation.
- [x] Run an end-to-end Supabase owner/invited-user Auth and invitation redemption test with temporary real Supabase Auth accounts against Vercel; onboarding, invitation binding, redemption, RBAC denial, single-use enforcement, and cleanup passed.

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
- [x] Verify the published UI flows and save a functional-product checkpoint; published Fleet Manager and Inventory Manager surfaces were inspected with real authenticated controls and checkpoint 60d97dbd saved.

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
- [x] Add explicit backend-backed create/update flows for the visible resource views and show real empty/loading/error states; current resource actions cover vehicle creation, work-order creation, inventory receipt, financial entry, document lifecycle, and purchase-order transitions.
- [x] Verify the published UI uses the latest checkpoint and contains no placeholder/demo copy before delivery; current source and published shell scans show no tenant demo label or placeholder/demo copy in authenticated shell surfaces.

- [x] Remove remaining authenticated command-center placeholder copy, fallback content, and hardcoded metrics.
- [x] Complete dedicated data-backed Notifications actions and Billing capacity/status presentation.
- [x] Re-run typecheck, Vitest, production build, and visual verification for the live-connected frontend.
- [x] Save and deliver the new published frontend connection checkpoint.


- [x] Add a real backend-backed work-order creation flow or remove the command-center CTA.
- [x] Remove the non-persisted export action from the command center.
- [x] Fix Billing utilization to query live vehicles and team members within the Billing view.
- [x] Verify the authenticated published deployment after saving this round of changes; temporary published Fleet Manager and Inventory Manager sessions loaded successfully.

- [x] Add a Superadmin signup entry point using Supabase Auth.
- [x] Add first-run organization onboarding with organization name and Superadmin profile details.
- [x] Route newly provisioned Superadmins into the authenticated Command Center and Team invitation workflow.
- [x] Add onboarding tests and verify the published signup-to-invitation flow; temporary published organization bootstrap, invitations, sign-in, and redemption passed in the role harnesses.

- [x] Publish and verify Superadmin signup and organization onboarding in production; published temporary Superadmin bootstrap/onboarding passed.
- [x] Add automatic draft purchase-order creation when stock falls below reorder level.
- [x] Complete odometer validation for negative readings and jumps above 1,000 km/day.
- [x] Complete Driver DVIR, manual odometer, fuel logging, and photo-proof workflows.
- [x] Complete document expiry/compliance alerts and operational document workflow.
- [x] Complete dedicated Accountant per-vehicle P&L and real-time CPK calculations.
- [x] Strengthen role-specific workspace routing and permissions without Razorpay checkout.
- [x] Deploy all application and Edge Function changes, configure maintenance scheduling, and verify production workflows; published maintenance Heartbeat and current application workflows passed.

- [x] Deploy the latest non-Razorpay workflow changes and verify them on the published production site; authenticated Fleet Manager and Inventory Manager workflows passed.
- [x] Save a new checkpoint after the latest signup/onboarding, driver, compliance, accountant, and automation changes.
- [x] Implement and verify post-onboarding navigation into the Command Center and Team invitation flow.
- [x] Make odometer validation truly time-aware for the 1,000 km/day rule.
- [x] Add a dedicated Driver manual odometer submission UI and expose fuel receipt/photo-proof upload in the frontend.
- [x] Add full document create/upload/update/renew operations in the Compliance workspace.
- [x] Correct CPK to use validated distance-traveled logic.
- [x] Implement role-aware frontend routing and gating instead of relying only on the shared Home shell.

- [x] Verify the full Superadmin signup to onboarding to Team invitation transition against the published Vercel deployment with a temporary authenticated Superadmin; bootstrap, onboarding, invitation creation, and cleanup passed.
- [x] Record fuel-log odometer updates in the validated odometer history.
- [x] Add visible Compliance renew/update actions wired to documents.update.
- [x] Add explicit guarded route segments for role-specific FleetOps workspaces.

- [x] Diagnose the production Superadmin signup database error reported during account creation.
- [x] Fix Supabase signup provisioning and verify the database path with regression coverage.
- [x] Republish and verify the Superadmin signup-to-onboarding flow after the fix using the published Vercel temporary-account harness.

- [x] Re-test Superadmin signup after the Auth trigger fix and confirm organization and user rows are provisioned successfully.
- [x] Add or document an integration-level verification of the real signup provisioning path.

- [x] Capture the exact second-attempt production signup error and identify the remaining live Supabase failure.
- [x] Verify live organization and user schema defaults/constraints against the Auth trigger and provisioning path.
- [x] Apply and integration-test the definitive signup fix before republishing.

- [x] Fix Superadmin login redirect into organization onboarding for provisioned accounts.
- [x] Fix organization creation completion and refresh of onboarding metadata after setup.
- [x] Verify login, organization creation, and Team handoff on production with a temporary Supabase Superadmin account; personal-account verification remains unnecessary for the code path.

- [x] Refresh the Supabase Auth session metadata after successful organization onboarding completion.
- [x] Verify onboarding exits into the Command Center and Team invitation flow without a stale-session loop using a temporary published Superadmin session; browser verification rendered the authenticated Command Center, retained the session, and loaded Team successfully.

- [x] Diagnose the production undefined.id crash in authenticated onboarding/dashboard rendering.
- [x] Add null-safe data guards for organization, vehicle, work-order, and role-dependent render paths.
- [x] Verify the corrected authenticated production flow after republishing through the published Vercel harness.

- [x] Add and verify null-safe guards for vehicle-derived UI mappings and remaining role/workspace render branches.
- [x] Reproduce the authenticated production flow after republishing with a temporary authenticated Superadmin and confirm no undefined.id crash occurred; the published browser dashboard rendered its KPIs, signals, fleet register, and action queue without the prior crash.

- [x] Add null-safe guards for procurement and generic resource-row mappings that assume row or order ids exist.
- [x] Reproduce the authenticated production flow after republishing and confirm the undefined.id crash is eliminated before final verification; authenticated browser rendering and Team navigation completed without the prior undefined.id failure.

- [x] Diagnose slow authenticated production loading and identify blocking queries or render gates.
- [x] Add a fast, explicit authenticated loading/onboarding state with independent query failures.
- [x] Verify production load and Superadmin onboarding responsiveness after republishing; the browser reached onboarding, organization creation completed, Command Center rendered, and Team data settled without a stale-session loop.

- [x] Diagnose why clicking Team from the authenticated left navigation returns to the login gate.
- [x] Preserve the active Supabase session across Team route transitions and load Team queries without auth loops.
- [x] Verify the published Team navigation and invitation flow with a temporary authenticated Superadmin session; browser click from Command center to Team remained authenticated and rendered the organization directory.

- [x] Verify Team navigation after publishing the 401 refresh fix with the temporary published Superadmin workflow; the Team route loaded without returning to login.
- [x] Confirmed Team did not fail in the published temporary-account workflow; both the procedure and browser navigation returned successfully without an auth-loop condition.

- [x] Diagnose why Team invitation submission produces no visible result and no delivered email.
- [x] Ensure invitation creation returns a persisted token/status and explicit UI success or error feedback.
- [x] Configure or clearly surface the absence of an email provider for invitation delivery without claiming an email was sent.
- [x] Verify the Team invitation flow in production with a temporary authenticated Superadmin; HTTP 200, join URL, token, organization binding, and cleanup passed.

- [x] Verify the published Team invitation flow and token response with a temporary authenticated Superadmin; token and join URL were returned and invitation redemption was single-use.
- [x] Email delivery remains an explicit future integration decision: no provider credentials were supplied, so FleetOps correctly exposes MANUAL_TOKEN delivery and never claims an invitation email was sent.

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

- [x] Re-verify the published Team invitation flow after the stale-asset fix; the production response was bounded and explicit with MANUAL_TOKEN delivery, join URL, token, and no false email-delivery claim.

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

- [x] Force the public HTML release marker to the current FleetOps checkpoint and verify the domain serves the current revision; source marker updated to fleetops-edge-sync-20260820 and validation passed.
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
- [x] Reconcile all 20 actionable P0 requirements in FleetOpsWhole-ProductandWorkspaceImprovementAudit.md item by item and implement any P0 gaps that remain; see p0-reconciliation-2026-08-20.md for evidence and explicitly bounded remaining P1/P2 work.
- [x] Authoritative P0 accounting integrity: add immutable financial reversals/adjustments with actor and reason, plus Superadmin approval for high-value expenses and manual adjustments.
- [x] Authoritative P0 storage lifecycle: add file type/size validation, checksum metadata, retention/orphan policy checks, and access-log coverage for stored documents/evidence.
- [x] Authoritative P0 notification policy: add role/severity/source routing, deduplication, acknowledgement escalation state, and source-resolution closure safeguards.
- [x] Authoritative P0 inventory concurrency: add explicit adjustment workflow and transactional conflict handling beyond insufficient-stock protection.
- [x] Authoritative P0 workspace architecture: reduce monolithic workspace coupling, replace remaining broad any usage in touched surfaces, and centralize query policy contracts.
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
- [x] Authoritative P0 production diagnostics: add caller-supplied or generated correlation IDs to system health responses with regression coverage, preserving safe release and database status reporting.
- [x] Production verification increment: confirm the published Create Organization route renders the Superadmin signup form without submitting or creating production data.
- [x] Background verification: create an isolated test organization and Superadmin test user without modifying the user’s production organization.
- [x] Background verification: exercise invitation creation/redemption and designated workspace access for Fleet Manager, Inventory Manager, Mechanic, Technician, Driver, and Accountant test users; local role suites passed and the published comprehensive invite flow passed.
- [x] Background verification: validate the Issue → Triage → Work Order → Mechanic Execution → Inventory Consumption/Return → Review → Accounting/Reconciliation loop; corrected handoff harness passed locally and results are recorded in background-verification-report-2026-08-20.md.
- [x] Background verification: clean up isolated test records/users where the available test harness permits safe cleanup, and document the published-role proxy timeout limitation in background-verification-report-2026-08-20.md.
- [x] Background-test fix: correct notifications.list multi-column ordering so isolated Superadmin and role-suite tests can read recipient-scoped notifications.
- [x] Background-test harness fix: model Mechanic completion as READY_FOR_REVIEW followed by Fleet Manager checklist approval before asserting COMPLETED.
- [x] P1 increment: add a tenant-scoped Fleet Manager maintenance planning view with due-date signals for component mileage, expiring documents, and open work orders, including date-range filtering and actionable source references.
- [x] P1 increment: add regression coverage for the maintenance planning query, tenant isolation, role restrictions, and Fleet Manager rendering contract.
- [x] P1 increment: add a tenant-scoped Fleet Manager driver-handoff view showing driver, vehicle, latest reported issue, acknowledgement time, and safety disposition.
- [x] P1 increment: add regression coverage for driver-handoff tenant scoping, role restrictions, and status aggregation.
- [x] P1 increment: add an Inventory Manager receipt form to the live Inventory workspace using the existing inventory.receive procedure, with quantity, unit cost, reason, validation, and persisted refresh.
- [x] P1 increment: add regression coverage for the inventory receipt UI contract and role-scoped receiving procedure.
- [x] P1 increment: add tenant-scoped Procurement purchase-order status transitions for DRAFT, SENT, RECEIVED, and CANCELLED with audit logging and role enforcement.
- [x] P1 increment: add regression coverage for purchase-order transition guards and Procurement workspace controls.
- [x] P1 increment: add Accountant ledger filters by vehicle, type, category, and date range with a clear-filter action and persisted client view state.
- [x] P1 increment: add regression coverage for the Accountant filter controls and tenant-scoped filtered rendering.
- [x] P1 increment: enrich Driver issue history with Fleet Manager acknowledgement, escalation, and resolution state from recipient-scoped notifications.
- [x] P1 increment: add regression coverage for the Driver issue timeline contract and notification scoping.
- [x] Product flow increment: add a persisted Fleet register vehicle-create form using vehicles.create, with VIN, registration, make/model/year, odometer, and maintenance-template controls.
- [x] Product flow increment: add regression coverage for Fleet register creation, role restrictions, and tenant-scoped refresh.
- [x] Verify the live deployed domain serves the latest checkpoint/build asset mapping after the recent resource-view changes; published landing and /login routes rendered successfully.
- [x] Run a published authenticated smoke test and confirm no placeholder/demo copy appears in live authenticated shell surfaces; temporary Fleet Manager and Inventory Manager sessions rendered real controls and targeted cleanup completed.
- [x] P1 increment: add tenant-scoped Fleet Manager bulk work-order operations for assignment, priority, scheduling, and archival with audit events and UI controls.
- [x] P1 increment: add tenant-scoped Fleet Manager bulk work-order actions for priority changes and cancellation, with selection UI, role/tenant guards, audit events, and regression coverage; scheduling, assignment UI, and archival depth remain open.
- [x] P1 increment: extend the bulk work-order controls with live tenant-scoped mechanic/technician assignment using the existing team roster, plus targeted RBAC/UI regression coverage and a passing production build.
- [x] Enforce Supabase PostgreSQL-only schema/deployment workflow: use Supabase CLI migrations and PostgreSQL-compatible verification; do not use TiDB/MySQL management SQL paths.
- [x] Partial-P1 completion: finish Fleet Manager bulk work-order operations with scheduling/rescheduling, archive/unarchive, export, and complete audit coverage.
- [x] Partial-P1 completion: finish Inventory receiving and Procurement lifecycle with PO-linked partial receiving, supplier invoice/location metadata, and complete state history.
- [x] Partial-P1 completion: finish Accountant ledger filters/saved views, reconciliation links, GST/TDS-ready fields, cost centers, and complete reporting exports.
- [x] Partial-P1 completion: finish global search across all tenant resources with role-filtered results and stable navigation paths.
- [x] Partial-P1 completion: finish shared table primitives and responsive data-entry behavior across the operational workspaces; completed in the shared workspace-table/resource-list/invite-form increment and covered by regression tests.
- [x] Partial-P1 sub-increment: add Fleet Manager work-order CSV export covering id, vehicle, priority, status, schedule, and archive state; targeted tests, typecheck, and production build pass.
- [x] Partial-P1 sub-increment: add Supabase-backed PO-linked partial receiving with optimistic inventory concurrency, supplier invoice/location metadata, final-receipt status, receipt history, expanded lifecycle states, UI controls, and 91-test/build validation.
- [x] Partial-P1 sub-increment: add Supabase-backed GST/TDS-ready financial fields, vendor/invoice/payment metadata, cost-center fields, reconciliation references, Accountant entry controls, and per-record reconciliation UI; 91 tests, typecheck, build, and remote migration verification pass.
- [x] Partial-P1 sub-increment: expand Superadmin Quick Find to live inventory and financial records with workspace routing; 93 tests, typecheck, and production build pass.
- [x] Partial-P1 sub-increment: make Accountant CSV/PDF exports honor vehicle, type, category, and date filters through tenant-scoped Supabase queries; focused tests, typecheck, and production build pass.
- [x] Partial-P1 completion: finish shared table primitives and responsive data-entry behavior across the operational workspaces; shared workspace-table/resource-list/invite-form styles and responsive breakpoints are covered by contract tests, with 95 tests, typecheck, and production build passing.
- [x] Create and deliver a complete responsibility specification covering the original FleetOps role matrix, all seven roles, workspace isolation, operational handoffs, audit improvements, and deferred scope.
- [x] Run isolated background Superadmin E2E: fresh signup, organization creation, team invitations, governance, approvals, oversight, exports, tenant isolation, and cleanup; produce pass/fail evidence report. Result: 26/26 checks passed with cleanup verification.
- [x] Harden the Superadmin background harness to redact access tokens from test output and retain only session-established evidence.
- [x] Run isolated background Fleet Manager E2E: invited profile creation, login, vehicle onboarding, odometer, maintenance, work orders, assignment, scheduling, handoff visibility, compliance, exports, RBAC, tenant isolation, and cleanup; produce pass/fail evidence report. Result: 44/44 checks passed with cleanup verification.
- [x] Fix the Supabase PostgreSQL work_orders schema gap discovered by Fleet Manager planning verification: add the missing updatedAt column through a Supabase CLI migration and validate the planning route.
- [x] Run isolated background Mechanic E2E: invited profile creation, login, assigned work-order visibility, start-work, checklist/evidence, labor hours, parts, completion handoff, notifications, RBAC, and cleanup; produce pass/fail evidence report. Result: 31/31 checks passed with cleanup verification.
- [x] Capture and deliver an authenticated Fleet Manager workspace screenshot using a fresh test account without exposing credentials; clean up temporary test data afterward.
- [x] Create a fresh Fleet Manager test account, authenticate the published browser session, capture the workspace screenshot, and clean up temporary organization/account data; screenshot captured and cleanup verified.
- [x] Diagnose and fix the Supabase password-login HTTP 400 path, add user-facing error handling and regression coverage, and verify the published login entry point without exposing credentials; published temporary-account password sign-in and onboarding passed through the Superadmin harness with cleanup.
- [x] Add a typed Supabase Auth error-message mapper for invalid credentials, unconfirmed email, rate limits, and generic login failures, with client regression coverage; validated in the 100-test suite.
- [x] Run isolated background Inventory Manager E2E: invitation acceptance, profile signup, login, catalog, receiving, PO-linked receipts, supplier/invoice metadata, reorder, notifications, RBAC, tenant isolation, and cleanup; produce pass/fail evidence report.
- [x] Add purchase_orders.updatedAt through a Supabase CLI PostgreSQL migration, synchronize Drizzle schema, and rerun the complete Inventory Manager receipt/lifecycle workflow.
- [x] Repair the remote Supabase PostgreSQL purchase_orders metadata drift by applying supplierInvoiceNumber, receivedAt, and closedAt columns plus receipt-table verification through the CLI, then rerun Inventory Manager receipts.
- [x] Run a fresh isolated published Superadmin test account workflow, verify password sign-in, onboarding, invitation/governance reads, and complete temporary-data cleanup without exposing credentials; all checks passed and cleanup verified.
- [x] Diagnose the stale Supabase Auth email conflict where signup reports an existing user after application-table cleanup; confirmed 13 orphaned Auth identities and removed them after explicit user confirmation.
- [x] Permanently delete all 13 confirmed orphaned Supabase Auth users; verification found 0 Auth users, 0 application users, and 0 invitations, while 5 organization rows remain because organization deletion was not authorized in this request.
- [x] Implement accessible Fleet Manager left navigation and connected vehicle → component → threshold alert → work-order → mechanic assignment flow with FleetGuard-style component fields and lifecycle.
- [x] Implement accessible Inventory Manager left navigation and connected inventory part → vendor → purchase order → receiving flow with tenant-scoped INR records.
- [x] Update workspace-boundary regression tests to assert the requested role-specific operational navigation while still denying cross-role specialist workspaces.
- [x] Create a fresh temporary published test organization and role users; verify Fleet Manager vehicle, driver assignment, component threshold, notification, work-order, and mechanic-assignment flow; published harness passed and cleanup verified.
- [x] Verify Inventory Manager part creation, INR stock receipt, vendor creation, purchase-order creation/lifecycle, and PO-linked receiving against the published backend; published harness passed and cleanup verified.
- [x] Capture authenticated Fleet Manager and Inventory Manager workspace screenshots and inspect them for functional controls rather than placeholders, then clean up all temporary data; screenshots captured and targeted tenant/Auth cleanup verified at zero.
- [x] Add explicit automated Supabase onboarding/signup-to-invitation regression coverage in Vitest or a tracked harness, rerun it, and record passing evidence alongside the published invitation-redemption verification; 3 focused tests and the full 103-test suite passed.
- [x] Install Vercel CLI and inspect FleetOps Vercel deployment compatibility, including build/runtime, Supabase Auth callbacks, environment variables, storage, and maintenance scheduling prerequisites; Vercel CLI 59.1.4 installed, project linked, required envs synced, and production smoke tested.
- [x] Add a Vercel Node API adapter and SPA rewrite configuration so tRPC, maintenance callbacks, and client-side routes remain functional instead of deploying only static Vite assets; bundled API function deployed and `system.health` returned HTTP 200.
- [x] Push the current FleetOps codebase to https://github.com/Shoebbirader4/FleetOps.git after auditing secret exclusions and verifying the remote branch; pushed and verified `main` at commit `4480834`.
- [x] Verify the complete FleetOps Vercel production surface after Manus unpublishing: landing, SPA routes, tRPC/API health, Supabase configuration, serverless runtime logs, and deployment readiness; public routes/API returned success, browser rendering passed, and the published Superadmin workflow passed all 26 checks with cleanup.
- [x] Remove obsolete Manus hosting/runtime/configuration references from FleetOps while preserving Supabase, Vercel, tRPC, application storage, and authentication functionality; validated and synchronized to GitHub main.

- [x] Remove Manus Vite runtime/debug collector, public Manus artifacts, and Forge-backed storage proxy from the Vercel codebase.
- [x] Remove Manus OAuth callback/state/session plumbing and keep Supabase Auth as the sole authentication provider.
- [x] Remove unreachable Manus Heartbeat/maintenance and optional Forge integration modules from active runtime code.
- [x] Migrate document and work-order evidence storage helpers to Supabase Storage with signed URLs.
- [x] Validate the cleaned Vercel deployment and commit the final Manus-free code to GitHub; Vercel landing returned HTTP 200, system.health returned database ok, and GitHub main contains commit 0d2d886.

- [x] Fix component maintenance alerts so a vehicle already beyond a component's configured alert threshold creates a Fleet Manager notification immediately; component create/update now evaluates maintenance, creates a critical work order, persists MAINTENANCE_THRESHOLD notifications for Superadmin/Fleet Manager, and refreshes the relevant workspace queries. Regression validation passed with 101 tests, TypeScript, and production build.

- [x] Verify Inventory Manager low-stock alert creation, recipient notification, automatic draft purchase-order generation, and workspace refresh behavior; low-stock part creation now refreshes notifications and purchase orders, and regression coverage confirms Inventory Manager notification plus draft PO creation. Validation passed with 102 tests, TypeScript, and production build.

- [x] Refine the Superadmin workspace navigation and UI: removed operational-only Components, Vehicles, Inventory, Vendors, and Purchase orders entries from the Superadmin left panel while preserving executive oversight, billing, team, notifications, compliance, analytics, and work-order governance; added an executive-governance scope marker. Validation passed with 102 tests, TypeScript, and production build.

- [x] Correct Superadmin Team organization-directory role labels and add a guarded remove-member action that deletes the FleetOps user membership and corresponding Supabase Auth identity within the organization; self-removal, owner removal, non-Superadmin authorization, and tenant isolation are guarded. Validation passed with 105 tests, TypeScript, and production build.

- [x] Remove the remaining Work orders entry from the Superadmin left navigation while retaining executive maintenance visibility through Command center signals; the role-boundary regression now asserts Work orders is denied for Superadmin and retained for Fleet Manager. Validation passed with 105 tests, TypeScript, and production build.

- [x] Enhance Fleet Manager Command center and Work orders UI so the main workspace complements left-panel workflows; the overview now presents readiness, predictive maintenance, planning, driver handoffs, and queue signals instead of duplicate create forms. Work orders now support context, assignment, and dispatch feedback. Fleet Manager vehicle edit/delete is tenant-scoped and database-backed, and driver fuel/odometer updates reevaluate maintenance alerts. Validation passed with 107 tests, TypeScript, and production build.

- [x] Fix recurring Supabase password-login HTTP 400 errors after logout for Superadmin and invited members; password login now clears only the browser-local stale session and trims the email before a fresh grant. Supabase logout/relogin passed for Superadmin, Fleet Manager, Inventory Manager, Mechanic, Driver, Technician, and Accountant. Validation passed with 108 tests, TypeScript, and production build.

- [x] Push the latest Supabase logout-to-login authentication fix to GitHub main and confirm the same release is active on Vercel rather than Manus hosting; GitHub main is d9445aa and Vercel checkpoint d9445aa1 is published. Manus hosting is not used for the application.

- [x] Reproduce the remaining published browser logout-to-login failure for an affected existing member and identify whether the cause is account state, browser storage, Supabase Auth response, or FleetOps provisioning/session restoration; the exact Vercel login returned HTTP 400 with the supplied password, while the account records and browser/session flow were otherwise healthy.

- [x] Inspect Fleet Manager account shoebahmedbirader@gmail.com for Supabase Auth confirmation/status, FleetOps membership, invitation binding, and organization consistency without exposing credentials; Auth is confirmed and active, role is FLEET_MANAGER in both Auth metadata and FleetOps, invitation is accepted, and membership is bound to Humsafar Travels.

- [x] Fix invited-member signup and logout/relogin when Supabase email confirmation is disabled; verification passed for Fleet Manager, Inventory Manager, Mechanic, Technician, Driver, and Accountant. Each signup returned an immediate session, invitation redemption bound the correct role and organization, logout/relogin passed, role workspace procedures loaded, and all temporary data was cleaned up. No code change was required.

- [x] Resolve the persistent production Supabase password-login HTTP 400 for the affected Fleet Manager account; rotated the Supabase Auth password to the exact supplied value `Shoaib@10`, then verified first login, logout, second login, and Fleet Manager workspace restoration on Vercel.

- [x] Enhance Fleet Manager workspace UI/UX across every assigned page, preserving existing backend procedures, RBAC, tenant isolation, INR formatting, and operational workflows.
- [x] Audit Fleet Manager overview, vehicles, components, work orders, notifications, compliance, and related assigned pages for hierarchy, discoverability, form usability, table clarity, and responsive behavior.
- [x] Add or update UI regression tests for the Fleet Manager workspace enhancement; dedicated coverage now verifies contextual page headers, workflow chain context, shared form/table primitives, and responsive refinement selectors.

- [x] Investigate report that the Fleet Manager UI/UX enhancement is not visible in production; compare local, GitHub, Vercel deployment, and authenticated Fleet Manager route assets.
- [x] Correct any GitHub/Vercel synchronization or route/build mismatch found and verify the enhancement in the authenticated production workspace; Vercel auto-deployed commit b575d2a7 from GitHub main and the live CSS/JS contain workspace-page-header, workspace-chain, and Fleet Manager enhancement markers.

- [x] Enable automatic production deployments from the connected FleetOps GitHub repository to Vercel and verify the `main` branch trigger; Vercel is connected to Shoebbirader4/FleetOps on main, production deployment b575d2a7 is Ready, and the live bundle contains the Fleet Manager UI markers.

- [x] Diagnose why the authenticated Fleet Manager workspace appears old on production while GitHub and Vercel show the upgraded release; compare production domains, deployment assets, cache, branch, and route behavior. Live production assets and authenticated browser routes now resolve to the upgraded release.
- [x] Correct any production domain, deployment, cache, branch, or authenticated route mismatch and verify the actual Fleet Manager workspace upgrade on Vercel; authenticated Vercel verification showed the upgraded Fleet Manager overview and Vehicles page with contextual headers, Fleet register → Maintenance → Dispatch workflow cues, redesigned vehicle onboarding form, and refined fleet register.


# FleetOps Whole-Product Implementation Backlog

## Phase 1 — Closed-loop maintenance execution

- [ ] Define the canonical work-order lifecycle and allowed transitions: Draft, Open, Assigned, In Progress, Waiting for Parts, Ready for Review, Completed, Rework, and Cancelled.
- [ ] Add server-side transition guards so each role can perform only its assigned work-order actions.
- [ ] Add Fleet Manager work-order creation from a component alert, driver issue, vehicle record, and manual maintenance request.
- [ ] Add work-order detail view with vehicle, component, alert calculation, priority, due date, assignment, notes, and activity history.
- [ ] Add mechanic and technician explicit Start Work action with timestamp and actor attribution.
- [ ] Add mechanic/technician maintenance checklist items with required completion state.
- [ ] Add diagnosis, repair notes, measurements, and exception notes to work-order execution.
- [ ] Add labor-hour and labor-rate capture with validation and organization currency formatting in INR.
- [ ] Add before-work and after-work photo/document evidence using Supabase Storage signed URLs.
- [ ] Add parts-used selection from organization inventory with quantity validation.
- [ ] Decrement inventory only on an authorized parts-consumption event, with an auditable stock movement.
- [ ] Prevent work-order completion when required checklist, evidence, or approval requirements are incomplete.
- [ ] Add Fleet Manager or designated reviewer approval and Rework flow for completed work.
- [ ] Automatically update component service history and vehicle readiness after approved completion.
- [ ] Add cross-role handoff timeline visible to Fleet Manager, Mechanic, Technician, and Accountant according to RBAC.
- [ ] Add concurrency protection for simultaneous work-order updates and duplicate completion submissions.

## Phase 2 — Predictive maintenance and alerts

- [ ] Display the full component threshold calculation: installation odometer, expected life, current odometer, alert threshold, and remaining life.
- [ ] Add alert severity levels and deterministic prioritization based on overdue status, vehicle criticality, and safety impact.
- [ ] Add persistent alert acknowledgement, assignment, snooze, and resolution states.
- [ ] Prevent duplicate alerts and duplicate automatic work orders for the same component threshold event.
- [ ] Preserve alert history when a component is replaced, reset, edited, or a work order is completed.
- [ ] Add alert-to-work-order conversion with source linkage and source evidence.
- [ ] Add escalation rules for unacknowledged critical alerts and overdue work orders.
- [ ] Add notification center filters by severity, type, role, vehicle, and status.
- [ ] Add direct notification actions for acknowledge, open record, create work order, and assign owner.
- [ ] Add automated tests for odometer updates, component creation, component updates, replacement resets, duplicate prevention, and escalation.

## Phase 3 — Inventory, vendors, and purchasing

- [ ] Add inventory part detail pages with on-hand, reserved, available, reorder level, unit cost, and movement history.
- [ ] Add explicit stock-in, stock-out, adjustment, transfer, and reservation movements with actor and reason.
- [ ] Reserve required parts when a work order enters an approved execution state.
- [ ] Release or consume reservations safely when work orders are cancelled, reworked, or completed.
- [ ] Add low-stock alert acknowledgement and purchase-order traceability.
- [ ] Add vendor detail pages with contact information, supplied parts, pricing history, and purchase history.
- [ ] Add purchase-order lifecycle: Draft, Submitted, Approved, Ordered, Partially Received, Received, Cancelled.
- [ ] Add purchase-order approval controls and separation of requester versus approver where required.
- [ ] Add goods-received workflow that updates inventory through auditable stock-in movements.
- [ ] Add partial receipt, damaged receipt, back-order, and variance handling.
- [ ] Link vendor costs and received parts to the originating purchase order and work order where applicable.
- [ ] Add inventory CSV import/export with validation, duplicate handling, and error reporting.
- [ ] Add inventory regression coverage from low-stock detection through purchase receipt and work-order consumption.

## Phase 4 — Financial accountability and INR reporting

- [ ] Automatically aggregate parts cost, labor cost, vendor cost, and other expenses into each work order.
- [ ] Add immutable financial adjustment records with reason, actor, timestamp, and approval state.
- [ ] Add Accountant ledger filters by date, vehicle, work order, vendor, category, and status.
- [ ] Add cost attribution from work orders to vehicles, components, and organization-level P&L.
- [ ] Add ledger reconciliation state and exception handling for missing source records.
- [ ] Add INR formatting and decimal/rounding rules consistently across all financial screens and exports.
- [ ] Add financial CSV export and print/PDF-ready ledger report generation.
- [ ] Add organization P&L summaries for maintenance, parts, labor, vendors, and fleet operating cost.
- [ ] Add role and approval tests preventing operational users from editing sensitive financial records.

## Phase 5 — Compliance and document operations

- [ ] Add document metadata validation for title, type, owner, issue date, expiry date, and secure storage reference.
- [ ] Add document version history and replacement workflow without losing prior records.
- [ ] Add vehicle and driver compliance status summaries with valid, expiring, expired, and missing states.
- [ ] Add configurable expiry windows and notifications for upcoming renewals.
- [ ] Add Fleet Manager compliance action queue with direct document upload and renewal actions.
- [ ] Add secure signed-URL access checks for organization and role scope.
- [ ] Add document deletion/archive controls with audit history and retention rules.
- [ ] Add compliance CSV import with dry-run validation and row-level error reporting.
- [ ] Add compliance CSV export and PDF-ready compliance register.
- [ ] Add document and compliance regression coverage for tenant isolation, expiry, upload, replacement, and download.

## Phase 6 — Role-specific workspace completion

- [ ] Superadmin: complete organization governance dashboard, trial/subscription status, team governance, billing summary, P&L, compliance overview, and audit access without operational navigation leakage.
- [ ] Superadmin: add organization-level activity search and governance filters while preserving sensitive-data boundaries.
- [ ] Fleet Manager: complete readiness dashboard, vehicle register, component schedules, alert queue, work orders, drivers, compliance, and operational exports.
- [ ] Fleet Manager: add bulk vehicle, component, work-order, and compliance actions with confirmation and audit events.
- [ ] Mechanic: complete assigned queue, Start Work, checklist, diagnosis, parts request/use, labor, photos, notes, submit-for-review, and rework handling.
- [ ] Technician: complete technical queue, diagnostic measurements, specialist notes, evidence, parts/labor contribution, and review handoff.
- [ ] Driver: complete assigned-vehicle view, daily odometer, fuel, safety acknowledgement, issue report, issue history, and submission confirmation.
- [ ] Inventory Manager: complete parts, stock movements, low-stock queue, vendors, purchase orders, receiving, and inventory exports.
- [ ] Accountant: complete financial record entry, ledger, work-order cost review, reconciliation, P&L views, and exports.
- [ ] Verify every role can see only its assigned navigation, records, actions, and organization-scoped data.

## Phase 7 — Shared UI/UX quality

- [ ] Establish consistent page headers, breadcrumbs, context summaries, and primary next actions for every workspace page.
- [ ] Add robust loading, empty, error, retry, success, and unsaved-change states to every data surface.
- [ ] Add accessible labels, keyboard navigation, visible focus states, validation messages, and screen-reader-friendly status updates.
- [ ] Add consistent table sorting, filtering, pagination, responsive cards, and mobile overflow handling.
- [ ] Add action confirmations for destructive, irreversible, approval, and financial operations.
- [ ] Add global quick-find for vehicles, components, work orders, parts, drivers, documents, and vendors within tenant scope.
- [ ] Add notification drawer with unread state, role-specific actions, and direct record links.
- [ ] Add organization and user context indicators to prevent cross-tenant or wrong-workspace actions.
- [ ] Remove remaining misleading placeholder data, fake records, and non-functional controls from production paths.
- [ ] Add visual regression checks for desktop, tablet, and mobile layouts for all role workspaces.

## Phase 8 — Security, audit, and reliability

- [ ] Centralize role policy definitions and server-side authorization guards for every procedure.
- [ ] Verify every read, create, update, delete, upload, download, export, and transition procedure is organization-scoped.
- [ ] Add database constraints and indexes for organization membership, foreign keys, lifecycle states, and query performance.
- [ ] Add immutable audit events for invitations, membership changes, deletions, vehicle updates, threshold events, work-order transitions, inventory movements, financial edits, and document actions.
- [ ] Add audit timeline filters by actor, role, entity, action, date, and organization.
- [ ] Add rate limiting and abuse protection for authentication, invitations, exports, uploads, and repeated mutations.
- [ ] Add safe retry and idempotency handling for critical mutations and webhook-like automation.
- [ ] Add production error logging with sensitive-data redaction and actionable correlation identifiers.
- [ ] Add backup and restoration procedures for PostgreSQL data and Supabase Storage metadata.
- [ ] Run security regression tests for tenant isolation, role escalation, deleted-member access, signed URLs, and stale sessions.

## Phase 9 — Authentication, invitations, and communications

- [ ] Add password-reset and account-recovery UX using Supabase Auth.
- [ ] Add invited-member acceptance page showing organization name, invited email, assigned role, and invitation expiry.
- [ ] Add invitation resend, revoke, expiry, and duplicate-email handling.
- [ ] Add transactional invitation email delivery after selecting and configuring an email provider.
- [ ] Add branded invitation templates with secure join links and no sensitive operational data.
- [ ] Add email delivery status, bounce/failure handling, and resend guidance.
- [ ] Add browser-level regression automation for organization signup, invitation acceptance, role signup, logout, relogin, and workspace restoration.

## Phase 10 — Reporting, exports, and operational intelligence

- [ ] Add fleet readiness report covering vehicle status, maintenance due, compliance, open work, and driver handoffs.
- [ ] Add maintenance performance report covering downtime, turnaround time, repeat repairs, and component failure patterns.
- [ ] Add inventory report covering consumption, stockouts, reorder risk, vendor lead time, and purchase variance.
- [ ] Add financial report covering cost per vehicle, cost per work order, parts/labor mix, and period-over-period trends.
- [ ] Add role-scoped CSV exports with filter context and export audit records.
- [ ] Add PDF-ready report layouts for compliance, maintenance, inventory, and finance.
- [ ] Add scheduled report delivery only after the periodic-update design and authorization model are finalized.

## Phase 11 — Commercial readiness, after core operations

- [ ] Finalize subscription model and pricing rules independently from operational data access.
- [ ] Define billable vehicle count, trial limits, grace periods, plan entitlements, and organization suspension behavior.
- [ ] Add Razorpay integration only after merchant credentials, webhook endpoints, tax requirements, refund policy, and subscription rules are approved.
- [ ] Add billing plan, subscription state, invoices, payment history, failed-payment handling, and account-owner controls.
- [ ] Add billing enforcement that preserves data access and export rights during grace periods.
- [ ] Add billing and entitlement tests for trial, upgrade, downgrade, cancellation, payment failure, and renewal.

## Phase 12 — Release and operational verification

- [ ] Keep PostgreSQL/Supabase as the only production database stack and prohibit Prisma, MySQL, or TiDB additions.
- [ ] Maintain GitHub main as the source of truth and verify Vercel automatic deployment from main after every release.
- [ ] Require TypeScript validation, Vitest, production build, and authenticated smoke tests before release.
- [ ] Run complete seeded-test-organization workflow without fabricating customer reviews, ratings, or testimonials.
- [ ] Verify the complete cross-role scenario: driver issue or component alert → Fleet Manager work order → mechanic execution → inventory part use → review → completion → accountant cost visibility.
- [ ] Verify cleanup of temporary test users, invitations, organizations, files, and records after every background regression.
- [ ] Add a release checklist documenting database migration status, Supabase deployment status, Vercel deployment status, GitHub commit, and rollback checkpoint.
- [ ] Add production monitoring for API errors, authentication failures, background automation failures, storage errors, and slow queries.


# Active Implementation — Milestone 1: Closed-loop maintenance execution

- [x] Audit existing work-order, component, vehicle, inventory, activity, notification, and document models plus role policies before implementation; reviewed schema, router contracts, role scopes, mechanic UI, and existing tests.
- [x] Define and enforce the work-order transition matrix across Fleet Manager, Mechanic, Technician, Inventory Manager, and Accountant; guarded transitions, role scope, stale-write conflicts, and review gates are enforced server-side.
- [x] Implement missing mechanic/technician execution details: explicit start work, checklist, diagnosis, labor, parts, evidence, submit for review, and rework; explicit start-work auditing/manager notifications and checklist-gated submission are now enforced.
- [x] Implement reviewer approval and completion-side updates for component service history, vehicle readiness, inventory, and financial cost records; approval now closes the work order, resets title-matched component service readings, restores maintenance vehicles to ACTIVE, and posts linked INR parts cost to the ledger. Labor-rate accounting remains intentionally pending until an organization labor-rate policy is defined.
- [x] Add idempotency, validation, tenant isolation, and audit coverage for critical maintenance mutations; closed-order start protection, organization/assignment scope, stale status conflict handling, and lifecycle audit events are covered.
- [x] Add cross-role regression tests and validate TypeScript, Vitest, production build, and authenticated workflow behavior; 112 tests pass, TypeScript passes, and the production bundle builds successfully.
- [x] Add Fleet Manager driver-issue dispatch: convert an open driver report into a tenant-scoped work order, validate mechanic/technician assignment, update issue acknowledgement state, link the source issue in audit metadata, prevent duplicate dispatch, and expose a Dispatch work action in the Fleet Manager queue. Validation passed with 114 Vitest tests, TypeScript, and production build.
- [x] Link inventory part issuance to active maintenance work: validate tenant scope and mechanic/technician assignment, reject completed or cancelled orders, and preserve workOrderId in the inventory audit record. Validation passed with 115 Vitest tests, TypeScript, and production build.
- [x] Persist the originating work-order ID directly on inventory issue movements so stock history, maintenance execution, and accounting can query the same relationship. Validation passed with 115 Vitest tests, TypeScript, and production build.
- [x] Make partial purchase-order receipts create auditable inventory receipt movements with quantity, unit cost, receiving actor, and purchase-order reference in the movement reason. Validation passed with 116 Vitest tests, TypeScript, and production build.
- [x] Make inventory issuance concurrency-safe by atomically requiring sufficient current stock before decrementing, preventing negative balances and double-issue races. Validation passed with 116 Vitest tests, TypeScript, and production build.
- [x] Scope inventory movement visibility by role: Superadmins and Inventory Managers retain organization-level history, while Mechanics and Technicians see only movements linked to their assigned work orders. Validation passed with 117 Vitest tests, TypeScript, and production build.
- [x] Harden unified Fleet Manager triage by validating every issue, work order, compliance document, and low-stock part reference inside the active organization before recording triage state. Validation passed with 118 Vitest tests, TypeScript, and production build.
- [x] Require Mechanics and Technicians to link every inventory issue to an active assigned work order, preventing untraceable operational stock consumption. Validation passed with 119 Vitest tests, TypeScript, and production build.
- [x] Consume active reserved parts during reviewer approval: decrement stock atomically, create work-order part records, create linked issue movements, exclude returned quantities, and include reserved-part cost in the INR financial record. Validation passed with 120 Vitest tests, TypeScript, and production build.
- [x] Add optional tenant-safe inventory movement filters by part and work order while preserving role-scoped visibility for Mechanics and Technicians. Validation passed with 120 Vitest tests, TypeScript, and production build.
- [x] Add a visible Inventory Manager recent stock-movement ledger backed by the tenant-safe movement query, showing receipt/issue type, quantity, reason, timestamp, and linked work-order reference. Validation passed with 120 Vitest tests, TypeScript, and production build.
- [x] Notify both Fleet Manager and Superadmin approvers when a mechanic or technician submits a work order for review, with recipient-specific deduplication and linked work-order context. Validation passed with 121 Vitest tests, TypeScript, and production build.
- [x] Fix the Drizzle/PostgreSQL adapter to render `{ increment }` arithmetic correctly for inventory receipts while preserving decrement handling. Validation passed with 122 Vitest tests, TypeScript, and production build.
- [ ] Add an organization-configured INR labor rate per hour and use it for approved work-order labor-cost attribution without fabricating costs when the rate is zero or unset.
- [x] Add role-aware notification actions: all recipients can mark alerts read, while Fleet Managers and Superadmins can escalate or resolve with a required note and source-state validation. Validation passed with 122 Vitest tests, TypeScript, and production build.
- [x] Add client regression coverage for notification lifecycle controls, management-role gating, and required resolution notes. Validation passed with 124 Vitest tests, TypeScript, and production build.
- [x] Enforce same-organization vendor validation when creating purchase orders, preventing cross-tenant vendor references. Validation passed with 125 Vitest tests, TypeScript, and production build.
- [x] Enforce same-organization vendor validation during purchase-order receiving, preventing legacy or malformed orders from increasing inventory through a cross-tenant vendor relationship. Validation passed with 126 Vitest tests, TypeScript, and production build.
