# Published observability verification

Source: https://fleetops-elktaacw.manus.space/

The published FleetOps deployment initially showed a transient session-check loading card, then resolved to the public landing page titled “FleetOps — Signal ledger.” The public page displayed Sign In and Create Organization CTAs, organization-bound onboarding, role-isolated workspaces, INR-native records, and the Fleet Manager/Mechanic/Accountant operating handoff copy. No authentication wall was encountered on the public route. This confirms the published public shell responds and the unauthenticated landing flow resolves after the initial Supabase connection check.

## Live API propagation check

At 2026-08-19 21:39 UTC, the published `system.health` endpoint responded with the legacy payload `{ok:true}` only, without the new release or database fields. The published `system.release` endpoint returned `NOT_FOUND`. This proves the public domain is serving an older backend revision even though the local build and checkpoint process report success. The observability increment must not be marked as production-verified until the new procedures propagate to the public domain.
