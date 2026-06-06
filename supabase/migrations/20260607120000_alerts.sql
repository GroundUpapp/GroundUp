-- Ground Up — alerts
--
-- Dedup ledger for cash-flow alert emails so the same alert isn't sent twice.
-- Backend-only via the service-role key (RLS on, no client policies), same
-- pattern as the other tables. reference_id is stored as '' for account-wide
-- alerts (low cash / runway) so the unique constraint dedupes reliably.

create table if not exists public.alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  alert_type text not null,
  reference_id text default '',
  sent_at timestamptz default now(),
  unique (user_id, alert_type, reference_id)
);

create index if not exists alerts_user_idx on public.alerts (user_id);

alter table public.alerts enable row level security;
revoke all on table public.alerts from anon;
revoke all on table public.alerts from authenticated;
