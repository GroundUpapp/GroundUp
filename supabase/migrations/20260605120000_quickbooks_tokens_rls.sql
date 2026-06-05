-- Ground Up — Row Level Security for public.quickbooks_tokens
--
-- This table stores QuickBooks OAuth access/refresh tokens (secrets). It is
-- written and read ONLY by the backend using the Supabase service-role key,
-- which has the BYPASSRLS attribute and is therefore unaffected by the policies
-- below. The browser/anon/authenticated roles must never read these rows — the
-- app exposes connection state through GET /api/auth/quickbooks/status instead.
--
-- Security model: enable RLS and create NO permissive policies for client roles,
-- so they are denied by default. Also revoke the default table grants as
-- defense-in-depth. Apply via the Supabase SQL Editor or `supabase db push`.

-- 1. Guarantee a single-column UNIQUE on user_id.
--    saveTokenRow() upserts with onConflict: 'user_id', which requires it.
do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_attribute a
      on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
    where i.indrelid = 'public.quickbooks_tokens'::regclass
      and i.indisunique
      and a.attname = 'user_id'
      and array_length(i.indkey, 1) = 1
  ) then
    alter table public.quickbooks_tokens
      add constraint quickbooks_tokens_user_id_key unique (user_id);
  end if;
end $$;

-- 2. Enable RLS. With no policies for anon/authenticated, every client-role
--    query returns zero rows (deny by default). The service role bypasses RLS.
alter table public.quickbooks_tokens enable row level security;

-- 3. Defense-in-depth: drop the default API-role grants on this table so the
--    PostgREST roles have no access path at all. The service role keeps access
--    via BYPASSRLS regardless of these grants.
revoke all on table public.quickbooks_tokens from anon;
revoke all on table public.quickbooks_tokens from authenticated;

-- Intentionally NO `create policy ...` statements: client roles get nothing.
-- If you ever need a user to read their OWN row from the browser (not
-- recommended for token secrets), you could add:
--
--   create policy "owner can read own quickbooks row"
--     on public.quickbooks_tokens for select
--     to authenticated
--     using (auth.uid() = user_id);
