-- Ground Up — manual_jobs
--
-- Jobs a contractor adds that aren't in QuickBooks yet (a fresh bid, a job
-- they haven't invoiced). Shown on the Job Board alongside QB-derived jobs.
--
-- Like quickbooks_tokens, this is touched ONLY by the backend using the
-- service-role key (which bypasses RLS). RLS is enabled with no client-role
-- policies, so anon/authenticated get nothing — rows are scoped per user in
-- the API layer (where user_id = the signed-in Supabase user).

create table if not exists public.manual_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  customer text,
  contract_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists manual_jobs_user_id_idx on public.manual_jobs (user_id);

alter table public.manual_jobs enable row level security;

-- Defense-in-depth: no direct client access. The backend uses service_role.
revoke all on table public.manual_jobs from anon;
revoke all on table public.manual_jobs from authenticated;
