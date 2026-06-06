-- Ground Up — subscriptions
--
-- One row per user tracking their Pro subscription / free trial. Touched ONLY
-- by the backend via the service-role key (which bypasses RLS), same pattern as
-- quickbooks_tokens and manual_jobs. RLS on, no client policies = deny by
-- default for anon/authenticated.

create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'free',
  status text default 'trialing',
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

revoke all on table public.subscriptions from anon;
revoke all on table public.subscriptions from authenticated;
