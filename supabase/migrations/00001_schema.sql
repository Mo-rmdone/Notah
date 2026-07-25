-- =============================================================================
-- 00001_schema.sql — الجداول الأساسية والمحفزات (core tables & triggers)
-- Money is numeric(12,2) everywhere. remaining_amount is never trusted from
-- clients: triggers keep it equal to total - down_payment - sum(payments).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('owner', 'collector');
create type public.product_category as enum ('household', 'appliances', 'furniture');
create type public.legal_status as enum ('clean', 'in_litigation'); -- سليم / يتم التقاضي
create type public.capital_entry_type as enum ('deposit', 'withdrawal');

-- ---------------------------------------------------------------------------
-- profiles — linked to auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'collector',
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'ملفات المستخدمين: المالك والمحصلون';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- customers — العملاء
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  known_as text not null check (length(trim(known_as)) > 0), -- الشهرة
  phone text not null check (phone ~ '^01[0-9]{9}$'),
  alt_phone text check (alt_phone is null or alt_phone ~ '^01[0-9]{9}$'),
  national_id text not null check (national_id ~ '^[0-9]{14}$'),
  address text not null check (length(trim(address)) > 0),
  category public.product_category not null,
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  down_payment numeric(12, 2) not null default 0 check (down_payment >= 0),
  remaining_amount numeric(12, 2) not null default 0 check (remaining_amount >= 0),
  monthly_installment numeric(12, 2) not null check (monthly_installment > 0),
  guarantor_name text,
  guarantor_relation text,
  guarantor_phone text,
  guarantor_address text,
  trust_receipt boolean not null, -- وصل أمانة
  legal_status public.legal_status not null default 'clean',
  national_id_photo text, -- path inside the private national-ids bucket
  archived_at timestamptz, -- soft delete
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint customers_down_payment_lte_total check (down_payment <= total_amount)
);

create index customers_phone_idx on public.customers (phone);
create index customers_national_id_idx on public.customers (national_id);
create index customers_full_name_idx on public.customers (full_name);
create index customers_category_idx on public.customers (category);
create index customers_active_idx on public.customers (archived_at) where archived_at is null;

-- ---------------------------------------------------------------------------
-- customer_payments — دفعات العملاء
-- ---------------------------------------------------------------------------
create table public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  collected_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index customer_payments_customer_idx on public.customer_payments (customer_id);
create index customer_payments_date_idx on public.customer_payments (payment_date);
create index customer_payments_collector_idx on public.customer_payments (collected_by);

-- ---------------------------------------------------------------------------
-- suppliers — التجار / الموردون
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  trade_type public.product_category not null,
  phone_1 text,
  phone_2 text,
  total_owed numeric(12, 2) not null default 0 check (total_owed >= 0),
  remaining_amount numeric(12, 2) not null default 0 check (remaining_amount >= 0),
  monthly_payment numeric(12, 2) not null default 0 check (monthly_payment >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- supplier_payments — دفعاتنا للتجار
-- ---------------------------------------------------------------------------
create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index supplier_payments_supplier_idx on public.supplier_payments (supplier_id);
create index supplier_payments_date_idx on public.supplier_payments (payment_date);

-- ---------------------------------------------------------------------------
-- supplier_invoices — فواتير التجار
-- ---------------------------------------------------------------------------
create table public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  invoice_number text not null check (length(trim(invoice_number)) > 0),
  amount numeric(12, 2) not null check (amount > 0),
  invoice_date date not null default current_date,
  file_path text, -- path inside the private supplier-invoices bucket
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index supplier_invoices_supplier_idx on public.supplier_invoices (supplier_id);

-- ---------------------------------------------------------------------------
-- capital_entries — حركة رأس المال (إيداع / سحب)
-- ---------------------------------------------------------------------------
create table public.capital_entries (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12, 2) not null check (amount > 0),
  entry_type public.capital_entry_type not null,
  note text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

-- =============================================================================
-- Balance triggers
-- pg_trigger_depth() = 1 → statement came directly from a client: recompute
-- remaining from scratch and ignore any client-supplied value.
-- pg_trigger_depth() > 1 → update issued by a payment trigger: pass through.
-- =============================================================================

create or replace function public.customers_set_remaining()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid numeric(12, 2);
begin
  if tg_op = 'INSERT' then
    new.remaining_amount := new.total_amount - new.down_payment;
    return new;
  end if;

  if pg_trigger_depth() > 1 then
    return new; -- adjustment coming from the payments trigger
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.customer_payments
  where customer_id = new.id;

  new.remaining_amount := new.total_amount - new.down_payment - v_paid;
  if new.remaining_amount < 0 then
    raise exception 'INVALID_TOTALS: المبلغ الإجمالي أقل من مجموع المدفوعات'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger customers_set_remaining
before insert or update on public.customers
for each row execute function public.customers_set_remaining();

create or replace function public.apply_customer_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining numeric(12, 2);
begin
  if tg_op = 'INSERT' then
    select remaining_amount into v_remaining
    from public.customers where id = new.customer_id for update;

    if new.amount > v_remaining then
      raise exception 'PAYMENT_EXCEEDS_REMAINING: الدفعة أكبر من المبلغ المتبقي'
        using errcode = 'P0001';
    end if;

    update public.customers
    set remaining_amount = remaining_amount - new.amount
    where id = new.customer_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.customers
    set remaining_amount = remaining_amount + old.amount
    where id = old.customer_id;
    return old;
  end if;

  -- UPDATE: restore the old amount, then apply the new one with the same check
  if new.customer_id <> old.customer_id then
    raise exception 'PAYMENT_CUSTOMER_IMMUTABLE: لا يمكن نقل الدفعة لعميل آخر'
      using errcode = 'P0001';
  end if;

  select remaining_amount + old.amount into v_remaining
  from public.customers where id = new.customer_id for update;

  if new.amount > v_remaining then
    raise exception 'PAYMENT_EXCEEDS_REMAINING: الدفعة أكبر من المبلغ المتبقي'
      using errcode = 'P0001';
  end if;

  update public.customers
  set remaining_amount = remaining_amount + old.amount - new.amount
  where id = new.customer_id;
  return new;
end;
$$;

create trigger apply_customer_payment
before insert or update or delete on public.customer_payments
for each row execute function public.apply_customer_payment();

create or replace function public.suppliers_set_remaining()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid numeric(12, 2);
begin
  if tg_op = 'INSERT' then
    new.remaining_amount := new.total_owed;
    return new;
  end if;

  if pg_trigger_depth() > 1 then
    return new;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.supplier_payments
  where supplier_id = new.id;

  new.remaining_amount := new.total_owed - v_paid;
  if new.remaining_amount < 0 then
    raise exception 'INVALID_TOTALS: إجمالي المديونية أقل من مجموع المدفوعات'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger suppliers_set_remaining
before insert or update on public.suppliers
for each row execute function public.suppliers_set_remaining();

create or replace function public.apply_supplier_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining numeric(12, 2);
begin
  if tg_op = 'INSERT' then
    select remaining_amount into v_remaining
    from public.suppliers where id = new.supplier_id for update;

    if new.amount > v_remaining then
      raise exception 'PAYMENT_EXCEEDS_REMAINING: الدفعة أكبر من المبلغ المتبقي'
        using errcode = 'P0001';
    end if;

    update public.suppliers
    set remaining_amount = remaining_amount - new.amount
    where id = new.supplier_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.suppliers
    set remaining_amount = remaining_amount + old.amount
    where id = old.supplier_id;
    return old;
  end if;

  if new.supplier_id <> old.supplier_id then
    raise exception 'PAYMENT_SUPPLIER_IMMUTABLE: لا يمكن نقل الدفعة لتاجر آخر'
      using errcode = 'P0001';
  end if;

  select remaining_amount + old.amount into v_remaining
  from public.suppliers where id = new.supplier_id for update;

  if new.amount > v_remaining then
    raise exception 'PAYMENT_EXCEEDS_REMAINING: الدفعة أكبر من المبلغ المتبقي'
      using errcode = 'P0001';
  end if;

  update public.suppliers
  set remaining_amount = remaining_amount + old.amount - new.amount
  where id = new.supplier_id;
  return new;
end;
$$;

create trigger apply_supplier_payment
before insert or update or delete on public.supplier_payments
for each row execute function public.apply_supplier_payment();
