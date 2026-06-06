-- Ground Up — reminder_log
--
-- Records invoice payment reminders so the same invoice can't be reminded more
-- than once per 7 days. Backend-only via the service-role key (RLS on, no
-- client policies), same pattern as the other tables.

create table if not exists public.reminder_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  invoice_id text not null,
  customer text,
  sent_at timestamptz default now()
);

create index if not exists reminder_log_lookup_idx
  on public.reminder_log (user_id, invoice_id, sent_at);

alter table public.reminder_log enable row level security;
revoke all on table public.reminder_log from anon;
revoke all on table public.reminder_log from authenticated;
