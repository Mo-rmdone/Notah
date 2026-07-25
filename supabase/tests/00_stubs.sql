-- Minimal stand-ins for the Supabase-managed objects the migrations depend on.
-- Test harness only — never part of the shipped migrations.
create extension if not exists pgcrypto;

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- Session stand-in: tests set app.current_user_id to impersonate.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid
);

alter table storage.objects enable row level security;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
end;
$$;

grant usage on schema public, auth, storage to authenticated, anon;
grant all on all tables in schema storage to authenticated;

-- Deliberately NO default-privilege grant on public tables: newer Supabase
-- projects don't auto-expose new tables either, so the migrations must issue
-- their own GRANTs. Leaving this out is what makes the harness catch it.
