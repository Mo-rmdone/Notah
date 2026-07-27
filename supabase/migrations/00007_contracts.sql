-- =============================================================================
-- 00007_contracts.sql — فصل العقود عن العملاء (customers → customers + contracts)
-- =============================================================================
-- العميل الواحد قد يشتري صنفًا ثانيًا وهو ما زال يسدد الأول. لذلك انتقل كل ما
-- يخص «الصفقة» إلى جدول contracts، وبقي في customers ما يخص «الشخص» فقط.
--
-- One customer can buy a second item while still paying off the first, so every
-- deal-level field moves to `contracts` and `customers` keeps identity only.
-- Doing this before go-live is cheap; afterwards it would mean migrating every
-- payment row and rewriting both balance triggers under load.
--
-- قرار: legal_status يبقى على العميل (سمة شخص، وتظهر كشارة في جدول العملاء)،
-- بينما trust_receipt ينتقل للعقد (وصل أمانة لصفقة بعينها).
-- Decision: legal_status stays on the customer — it is a property of the person
-- and §6 renders it as a badge in the customers table — while trust_receipt is
-- per deal and moves to the contract.

create type public.payment_window as enum ('early', 'mid', 'late');

comment on type public.payment_window is 'نافذة السداد الشهرية: 1-10 / 11-20 / 21-آخر الشهر';

-- ---------------------------------------------------------------------------
-- contracts — العقود
-- ---------------------------------------------------------------------------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  category public.product_category not null,
  -- تاريخ بدء العقد الحقيقي، لا تاريخ إدخال السجل: بدونه ينهار حساب الانتظام
  -- لأي محل يُرحّل دفاتره الورقية دفعة واحدة.
  -- The real contract date, not the row's insertion date. Without it, a shop
  -- migrating six months of paper ledgers on day one would have every historical
  -- month score as 'none' and the credit score would be blank for exactly the
  -- customers it exists to evaluate.
  contract_start_date date not null,
  payment_window public.payment_window not null default 'mid',
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  down_payment numeric(12, 2) not null default 0 check (down_payment >= 0),
  remaining_amount numeric(12, 2) not null default 0 check (remaining_amount >= 0),
  monthly_installment numeric(12, 2) not null check (monthly_installment > 0),
  trust_receipt boolean not null default false,
  note text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint contracts_down_payment_lte_total check (down_payment <= total_amount),
  constraint contracts_customer_org_fkey
    foreign key (customer_id, org_id) references public.customers (id, org_id) on delete cascade
);

comment on table public.contracts is 'عقود التقسيط — عميل واحد قد يملك أكثر من عقد';

alter table public.contracts add constraint contracts_id_org_key unique (id, org_id);

create index contracts_org_idx on public.contracts (org_id);
create index contracts_customer_idx on public.contracts (customer_id);
create index contracts_category_idx on public.contracts (category);
create index contracts_active_idx on public.contracts (archived_at) where archived_at is null;

-- ---------------------------------------------------------------------------
-- ترحيل البيانات: كل عميل قائم يصبح عقدًا واحدًا
-- Each pre-split customer becomes exactly one contract. No-op on an empty DB.
-- ---------------------------------------------------------------------------
insert into public.contracts (
  org_id, customer_id, category, contract_start_date, total_amount,
  down_payment, remaining_amount, monthly_installment, trust_receipt,
  archived_at, created_at, created_by
)
select
  c.org_id, c.id, c.category, c.created_at::date, c.total_amount,
  c.down_payment, c.remaining_amount, c.monthly_installment, c.trust_receipt,
  c.archived_at, c.created_at, c.created_by
from public.customers c;

-- ---------------------------------------------------------------------------
-- الدفعات تشير إلى العقد بدل العميل
-- Payments point at the contract, not the customer.
-- ---------------------------------------------------------------------------
alter table public.customer_payments add column contract_id uuid;

update public.customer_payments p
set contract_id = k.id
from public.contracts k
where k.customer_id = p.customer_id;

alter table public.customer_payments alter column contract_id set not null;

-- المحفزات القديمة كانت على customer_id · the old triggers keyed off customer_id
drop trigger if exists apply_customer_payment on public.customer_payments;
drop trigger if exists customers_set_remaining on public.customers;

alter table public.customer_payments
  drop constraint customer_payments_customer_org_fkey,
  drop column customer_id,
  add constraint customer_payments_contract_org_fkey
    foreign key (contract_id, org_id) references public.contracts (id, org_id) on delete cascade;

drop index if exists public.customer_payments_customer_idx;
create index customer_payments_contract_idx on public.customer_payments (contract_id);

-- ---------------------------------------------------------------------------
-- إزالة أعمدة الصفقة من جدول العملاء
-- Drop the deal-level columns from customers now that contracts owns them.
-- ---------------------------------------------------------------------------
alter table public.customers
  drop column category,
  drop column total_amount,
  drop column down_payment,
  drop column remaining_amount,
  drop column monthly_installment,
  drop column trust_receipt;

drop index if exists public.customers_category_idx;

-- ---------------------------------------------------------------------------
-- محفزات الأرصدة — نفس منطق 00001 بعد نقله إلى contracts
-- ---------------------------------------------------------------------------
-- نمط pg_trigger_depth() محفوظ كما هو: عمق 1 يعني أمرًا قادمًا من العميل
-- فيُعاد الحساب من الصفر، وأعمق من ذلك يعني تعديلًا صادرًا عن محفّز الدفعات.
--
-- The pg_trigger_depth() pattern is carried over unchanged from 00001, where it
-- is already verified against live Postgres: depth 1 means the statement came
-- straight from a client, so recompute from scratch and ignore any client-sent
-- remaining_amount; deeper means the payments trigger issued it, so pass through.
create or replace function public.contracts_set_remaining()
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
    return new;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.customer_payments
  where contract_id = new.id;

  new.remaining_amount := new.total_amount - new.down_payment - v_paid;
  if new.remaining_amount < 0 then
    raise exception 'INVALID_TOTALS: المبلغ الإجمالي أقل من مجموع المدفوعات'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.contracts_set_remaining() from public, anon, authenticated;

create trigger contracts_set_remaining
before insert or update on public.contracts
for each row execute function public.contracts_set_remaining();

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
    from public.contracts where id = new.contract_id for update;

    if new.amount > v_remaining then
      raise exception 'PAYMENT_EXCEEDS_REMAINING: الدفعة أكبر من المبلغ المتبقي'
        using errcode = 'P0001';
    end if;

    update public.contracts
    set remaining_amount = remaining_amount - new.amount
    where id = new.contract_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.contracts
    set remaining_amount = remaining_amount + old.amount
    where id = old.contract_id;
    return old;
  end if;

  if new.contract_id <> old.contract_id then
    raise exception 'PAYMENT_CONTRACT_IMMUTABLE: لا يمكن نقل الدفعة لعقد آخر'
      using errcode = 'P0001';
  end if;

  select remaining_amount + old.amount into v_remaining
  from public.contracts where id = new.contract_id for update;

  if new.amount > v_remaining then
    raise exception 'PAYMENT_EXCEEDS_REMAINING: الدفعة أكبر من المبلغ المتبقي'
      using errcode = 'P0001';
  end if;

  update public.contracts
  set remaining_amount = remaining_amount + old.amount - new.amount
  where id = new.contract_id;
  return new;
end;
$$;

revoke all on function public.apply_customer_payment() from public, anon, authenticated;

create trigger apply_customer_payment
before insert or update or delete on public.customer_payments
for each row execute function public.apply_customer_payment();

-- ---------------------------------------------------------------------------
-- contracts يخضع لنفس ضمانات المؤسسة
-- contracts gets the same tenancy guarantees as every other business table.
-- ---------------------------------------------------------------------------
create trigger set_org_id before insert on public.contracts
  for each row execute function public.set_org_id();

create trigger freeze_org_id before update on public.contracts
  for each row execute function public.freeze_org_id();

grant select, insert, update, delete on public.contracts to authenticated;
revoke all on public.contracts from anon;
