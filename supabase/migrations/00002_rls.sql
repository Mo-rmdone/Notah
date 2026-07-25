-- =============================================================================
-- 00002_rls.sql — سياسات أمان الصفوف (Row Level Security)
-- Owners: full access. Collectors: read customers + insert payments only.
-- Collectors never see suppliers, invoices, or capital.
-- =============================================================================

create schema if not exists private;
grant usage on schema private to authenticated;

-- Security-definer helpers so policies can consult profiles without recursion.
create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'owner'
      and p.active
  );
$$;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
  );
$$;

revoke all on function private.is_owner() from public;
revoke all on function private.is_active_user() from public;
grant execute on function private.is_owner() to authenticated;
grant execute on function private.is_active_user() to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: read own or owner reads all"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.is_owner());

create policy "profiles: owner updates"
on public.profiles for update to authenticated
using (private.is_owner())
with check (private.is_owner());

-- ---------------------------------------------------------------------------
-- customers — collectors may read, only owners may write
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;

create policy "customers: active users read"
on public.customers for select to authenticated
using (private.is_active_user());

create policy "customers: owner inserts"
on public.customers for insert to authenticated
with check (private.is_owner());

create policy "customers: owner updates"
on public.customers for update to authenticated
using (private.is_owner())
with check (private.is_owner());

create policy "customers: owner deletes"
on public.customers for delete to authenticated
using (private.is_owner());

-- ---------------------------------------------------------------------------
-- customer_payments — collectors insert their own; nobody edits but the owner
-- ---------------------------------------------------------------------------
alter table public.customer_payments enable row level security;

create policy "customer_payments: active users read"
on public.customer_payments for select to authenticated
using (private.is_active_user());

create policy "customer_payments: collector inserts own, owner any"
on public.customer_payments for insert to authenticated
with check (
  private.is_owner()
  or (private.is_active_user() and collected_by = (select auth.uid()))
);

create policy "customer_payments: owner updates"
on public.customer_payments for update to authenticated
using (private.is_owner())
with check (private.is_owner());

create policy "customer_payments: owner deletes"
on public.customer_payments for delete to authenticated
using (private.is_owner());

-- ---------------------------------------------------------------------------
-- suppliers / supplier_payments / supplier_invoices / capital_entries
-- owner-only, all operations
-- ---------------------------------------------------------------------------
alter table public.suppliers enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.supplier_invoices enable row level security;
alter table public.capital_entries enable row level security;

create policy "suppliers: owner all"
on public.suppliers for all to authenticated
using (private.is_owner())
with check (private.is_owner());

create policy "supplier_payments: owner all"
on public.supplier_payments for all to authenticated
using (private.is_owner())
with check (private.is_owner());

create policy "supplier_invoices: owner all"
on public.supplier_invoices for all to authenticated
using (private.is_owner())
with check (private.is_owner());

create policy "capital_entries: owner all"
on public.capital_entries for all to authenticated
using (private.is_owner())
with check (private.is_owner());

-- ---------------------------------------------------------------------------
-- المنح على مستوى الجدول · table-level grants
-- RLS يحكم الصفوف، لكن الدور يحتاج صلاحية على الجدول أصلًا. مشاريع Supabase
-- الحديثة لا تكشف الجداول الجديدة تلقائيًا، لذا نمنح الصلاحيات صراحة.
-- RLS governs rows, but the role still needs table privileges. Newer Supabase
-- projects no longer auto-expose new tables, so grant explicitly rather than
-- depending on default privileges.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on all tables in schema public to authenticated;

-- No anon access at all.
revoke all on all tables in schema public from anon;
