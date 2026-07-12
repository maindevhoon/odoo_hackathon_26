# Local Supabase Migration Guide

TransitOps keeps Supabase as its backend. This guide moves development from the hosted project to
a Docker-backed local Supabase stack without changing the admin or driver app architecture.

## Local development workflow

Start Docker Desktop, then run:

```bash
pnpm supabase:start
pnpm supabase:status
```

The CLI prints the local API URL, Studio URL, database URL, anon key, and service-role key. Use the
**anon key only** in client application environment files. Never commit service-role keys.

To rebuild the local database from repository migrations and seeds:

```bash
pnpm supabase:reset
```

`supabase:reset` destroys local Docker database data. It never modifies the hosted Supabase project.

Stop the local stack with:

```bash
pnpm supabase:stop
```

## Client configuration

After the local stack is healthy, update only untracked local environment files:

```dotenv
# apps/admin/.env
VITE_SUPABASE_URL=<local API URL from supabase status>
VITE_SUPABASE_ANON_KEY=<local anon key from supabase status>

# apps/driver/.env
EXPO_PUBLIC_SUPABASE_URL=<local API URL reachable by the device>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local anon key from supabase status>
```

An Android emulator cannot use `localhost` for the host machine; use its emulator host alias. A
physical phone must reach the development machine over the LAN or a secure tunnel.

## Hosted-project export (do this only after local migration validation)

Get the hosted database connection string from Supabase Dashboard **Connect**. Do not put that URL
or its password in this repository or chat logs. Run the following from a private terminal with the
connection string supplied interactively or through a local shell variable:

```bash
pnpm exec supabase db dump --db-url "$OLD_DB_URL" -f roles.sql --role-only
pnpm exec supabase db dump --db-url "$OLD_DB_URL" -f schema.sql
pnpm exec supabase db dump --db-url "$OLD_DB_URL" -f data.sql --use-copy --data-only
```

Before any restore, retain those three dump files as the rollback snapshot. Restore into a clean
self-hosted destination only after reviewing the output and matching the PostgreSQL version and
extensions. Existing hosted sessions will not work after a self-hosted cutover, so users must sign
in again.

## Repository-specific checks

- Use `supabase/migrations/0003_trips.sql` for lifecycle RPCs. `supabase/functions.sql` is legacy
  stub code and must not be run separately.
- `0001_init.sql` and `0004_contracts.sql` both include contracts/progress definitions. Validate a
  clean `pnpm supabase:reset` before using the migrations for a production restore.
- `0004_contracts.sql` currently adds broad authenticated read/insert policies for contracts and a
  broad driver-progress read policy. Review and tighten these before any production cutover; the
  local startup confirms they are active.
- Validate the ten required trip/maintenance rules, contract tiers, RLS, Realtime, and the mobile
  mutation queue before switching either app away from the hosted project.
