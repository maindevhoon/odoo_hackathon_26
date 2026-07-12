-- TransitOps — allow PostgREST's authenticated role to reach RLS-protected tables.
-- PostgreSQL privileges open the API surface; RLS policies remain the authority for each row/action.

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.drivers to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
grant select, insert, update, delete on public.maintenance_logs to authenticated;
grant select, insert, update, delete on public.fuel_logs to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.contracts to authenticated;
grant select on public.driver_progress to authenticated;

grant select on public.organizations, public.organization_members, public.worker_qualifications to authenticated;
grant select, insert on public.worker_reports to authenticated;
