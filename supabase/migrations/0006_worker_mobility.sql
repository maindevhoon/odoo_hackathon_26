-- TransitOps — worker mobility, trusted organizations, and fair review foundation

create type public.organization_tier as enum ('tier_1', 'tier_2', 'tier_3');
create type public.organization_verification_status as enum ('pending', 'verified', 'suspended');
create type public.qualification_status as enum ('pending', 'verified', 'expired', 'revoked');
create type public.worker_report_status as enum ('submitted', 'under_review', 'upheld', 'dismissed', 'appealed');

create table public.organizations (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  tier                public.organization_tier not null default 'tier_3',
  verification_status public.organization_verification_status not null default 'pending',
  region              text not null default '',
  industry            text not null default 'logistics',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  member_role     text not null check (member_role in ('owner', 'recruiter', 'operations_manager')),
  created_at      timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create table public.worker_qualifications (
  id          uuid primary key default uuid_generate_v4(),
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  category    text not null check (category in ('local_delivery', 'light_cargo', 'high_value_goods', 'refrigerated_cargo', 'long_haul', 'truck_logistics')),
  status      public.qualification_status not null default 'pending',
  issuer      text not null default 'TransitOps',
  issued_at   timestamptz,
  expires_at  date,
  evidence_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (driver_id, category)
);

create table public.worker_reports (
  id                      uuid primary key default uuid_generate_v4(),
  driver_id               uuid not null references public.drivers(id) on delete cascade,
  reporter_organization_id uuid not null references public.organizations(id),
  category                text not null check (category in ('safety', 'conduct', 'cargo_handling', 'attendance', 'other')),
  description             text not null,
  evidence_url            text,
  reporter_tier_snapshot  public.organization_tier not null,
  status                  public.worker_report_status not null default 'submitted',
  resolution_note         text,
  reviewed_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.contracts add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index idx_organization_members_profile on public.organization_members(profile_id);
create index idx_qualifications_driver on public.worker_qualifications(driver_id);
create index idx_worker_reports_driver on public.worker_reports(driver_id);
create index idx_worker_reports_status on public.worker_reports(status);
create index idx_contracts_organization on public.contracts(organization_id);

create trigger trg_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger trg_worker_qualifications_updated_at before update on public.worker_qualifications for each row execute function public.set_updated_at();
create trigger trg_worker_reports_updated_at before update on public.worker_reports for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.worker_qualifications enable row level security;
alter table public.worker_reports enable row level security;

-- Detailed reports are never public leaderboard data. They require an explicit review workflow.
create policy "organizations: authenticated read" on public.organizations for select to authenticated using (true);
create policy "organization_members: members read" on public.organization_members for select to authenticated using (profile_id = auth.uid() or public.get_my_role() = 'fleet_manager');
create policy "qualifications: authenticated read" on public.worker_qualifications for select to authenticated using (true);
create policy "reports: staff read" on public.worker_reports for select to authenticated using (public.get_my_role() in ('fleet_manager', 'safety_officer'));
create policy "reports: fleet manager create" on public.worker_reports for insert to authenticated with check (public.get_my_role() = 'fleet_manager');

grant select on public.organizations, public.organization_members, public.worker_qualifications, public.worker_reports to authenticated;
grant insert on public.worker_reports to authenticated;
