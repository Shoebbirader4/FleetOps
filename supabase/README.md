# Supabase backend operations

The FleetOps database is managed by Prisma and applied through the Supabase CLI migrations in `supabase/migrations`. Tenant isolation is enforced by PostgreSQL RLS using `public.current_fleetops_org_id()`, which maps `auth.uid()` to the FleetOps user record.

The `evaluate-maintenance` Edge Function performs the recurring predictive-maintenance and low-inventory scan. It is intentionally free of in-process timers. Deploy it with `supabase functions deploy evaluate-maintenance`, then schedule it from Supabase Cron or an external scheduler with a POST request to the deployed function URL. Configure the function with the project’s `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets. Never place the service-role key in browser code.

The Node server exposes the same deterministic evaluation through the protected `automation.evaluate` tRPC procedure for a Superadmin-operated manual run. Odometer writes also evaluate the updated vehicle immediately, so critical maintenance signals do not wait for the scheduled scan.
