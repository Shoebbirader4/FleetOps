-- Provision the first FleetOps organization and owner when a Supabase Auth user signs up.
create or replace function public.handle_fleetops_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data ->> 'fullName', split_part(new.email, '@', 1));
  insert into public.organizations ("name", "trialEndsAt", "maxVehicles", "maxUsers")
  values (coalesce(new.raw_user_meta_data ->> 'orgName', display_name || '''s Fleet'''), now() + interval '7 days', 3, 5)
  returning id into new_org_id;

  insert into public.users ("authUserId", "orgId", "email", "fullName", "role")
  values (new.id, new_org_id, new.email, display_name, 'SUPERADMIN');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_fleetops on auth.users;
create trigger on_auth_user_created_fleetops
after insert on auth.users
for each row execute procedure public.handle_fleetops_auth_user();
