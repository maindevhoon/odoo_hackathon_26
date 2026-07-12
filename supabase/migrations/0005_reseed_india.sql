-- ============================================================
-- TransitOps — 0005_reseed_india.sql
-- Updates the demo seed rows from 0001_init.sql (Philippine
-- context) to an Indian context: names, license formats, phone
-- codes, vehicle models, regions, and INR-scale costs.
-- Idempotent — matches on the fixed seed UUIDs.
-- ============================================================

update public.vehicles set
  name_model = 'Tata Ace Gold Van',
  acquisition_cost = 650000.00,
  region = 'Mumbai'
where id = 'aaaaaaaa-0001-0000-0000-000000000001';

update public.vehicles set
  name_model = 'Ashok Leyland Dost Truck',
  acquisition_cost = 2200000.00,
  region = 'Mumbai'
where id = 'aaaaaaaa-0001-0000-0000-000000000002';

update public.vehicles set
  name_model = 'Mahindra Bolero Pickup',
  acquisition_cost = 850000.00,
  region = 'Delhi'
where id = 'aaaaaaaa-0001-0000-0000-000000000003';

update public.drivers set
  name = 'Rohan Sharma',
  license_no = 'MH12 20230012345',
  license_category = 'LMV',
  contact = '+91-9171234567'
where id = 'bbbbbbbb-0001-0000-0000-000000000001';

update public.drivers set
  name = 'Priya Nair',
  license_no = 'DL04 20220098765',
  license_category = 'HMV',
  contact = '+91-9189876543'
where id = 'bbbbbbbb-0001-0000-0000-000000000002';

update public.drivers set
  name = 'Vikram Singh',
  license_no = 'KA05 20190054321',
  license_category = 'LMV',
  contact = '+91-9201112222'
where id = 'bbbbbbbb-0001-0000-0000-000000000003';
