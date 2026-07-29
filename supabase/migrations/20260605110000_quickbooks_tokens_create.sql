-- Creates public.quickbooks_tokens.
-- This table was originally created out-of-band via the Supabase SQL editor,
-- so no migration defined it. Added retroactively so a fresh environment
-- (supabase db reset / db push) provisions it correctly.
--
-- NOTE: the unique constraint on user_id and RLS enablement live in
-- 20260605120000_quickbooks_tokens_rls.sql, which runs immediately after this.

create table if not exists public.quickbooks_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  access_token  text        not null,
  refresh_token text        not null,
  realm_id      text        not null,
  expires_at    timestamptz not null,
  created_at    timestamptz default now()
);