-- A gig professional may work as a driver only, or bring a personally owned vehicle.
alter table public.drivers
  add column if not exists work_mode text not null default 'driver_only'
  check (work_mode in ('driver_only', 'owner_driver'));

alter table public.vehicles
  add column if not exists owner_driver_id uuid references public.drivers(id) on delete set null;

create index if not exists idx_vehicles_owner_driver on public.vehicles(owner_driver_id);
