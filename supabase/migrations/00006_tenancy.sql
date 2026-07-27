-- =============================================================================
-- 00006_tenancy.sql — تعدد المستأجرين (multi-tenancy)
-- =============================================================================
-- كل محل يصبح «مؤسسة» (organization) معزولة تمامًا. كل جدول أعمال يحمل org_id
-- غير قابل للتزوير من العميل: محفّز before insert يضبطه من جلسة المستخدم.
--
-- Every shop becomes an isolated organization. Each business table carries a
-- non-nullable org_id that the client cannot spoof: a before-insert trigger
-- overwrites whatever the client sent with the caller's own org.
--
-- ملاحظة: السياسات نفسها في 00008. هذا الملف يبني البنية فقط.
-- Policies live in 00008; this file only builds the structure.

-- ---------------------------------------------------------------------------
-- organizations — المؤسسات (المحلات المشتركة)
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  address text,
  owner_id uuid not null references auth.users (id) on delete restrict,
  -- حد المحصلين يُقرأ من هنا، لا من رقم ثابت داخل محفّز.
  -- The collector cap is read from here rather than hardcoded in a trigger, so
  -- raising it later is an UPDATE and not a migration.
  max_collectors integer not null default 2 check (max_collectors >= 0),
  created_at timestamptz not null default now()
);

comment on table public.organizations is 'المحلات المشتركة في النظام — كل واحد معزول تمامًا عن الآخر';

create index organizations_owner_idx on public.organizations (owner_id);

-- ---------------------------------------------------------------------------
-- org_id على كل جدول — يُضاف قابلًا للعدم أولًا، ثم يُملأ، ثم يُقيَّد
-- Added nullable first, backfilled, then constrained — so the migration is
-- safe to run against a database that already holds rows.
-- ---------------------------------------------------------------------------
alter table public.profiles           add column org_id uuid references public.organizations (id) on delete cascade;
alter table public.customers          add column org_id uuid references public.organizations (id) on delete cascade;
alter table public.customer_payments  add column org_id uuid references public.organizations (id) on delete cascade;
alter table public.suppliers          add column org_id uuid references public.organizations (id) on delete cascade;
alter table public.supplier_payments  add column org_id uuid references public.organizations (id) on delete cascade;
alter table public.supplier_invoices  add column org_id uuid references public.organizations (id) on delete cascade;
alter table public.capital_entries    add column org_id uuid references public.organizations (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- ترحيل البيانات القائمة: أول ملف مستخدم يصبح مالك مؤسسة «افتراضية»
-- Backfill: the pre-tenancy owner profile becomes the owner of a bootstrap org,
-- and every existing row is attached to it. No-op on an empty database.
-- ---------------------------------------------------------------------------
do $$
declare
  v_profile uuid;
  v_name text;
  v_org uuid;
begin
  select id, nullif(full_name, '') into v_profile, v_name
  from public.profiles
  order by created_at
  limit 1;

  if v_profile is null then
    return; -- fresh database, nothing to migrate
  end if;

  insert into public.organizations (name, owner_id)
  values (coalesce(v_name, 'المحل'), v_profile)
  returning id into v_org;

  update public.profiles          set org_id = v_org where org_id is null;
  update public.customers         set org_id = v_org where org_id is null;
  update public.customer_payments set org_id = v_org where org_id is null;
  update public.suppliers         set org_id = v_org where org_id is null;
  update public.supplier_payments set org_id = v_org where org_id is null;
  update public.supplier_invoices set org_id = v_org where org_id is null;
  update public.capital_entries   set org_id = v_org where org_id is null;

  -- الملف الأول هو المالك بحكم الترحيل
  update public.profiles set role = 'owner' where id = v_profile;
end;
$$;

alter table public.profiles           alter column org_id set not null;
alter table public.customers          alter column org_id set not null;
alter table public.customer_payments  alter column org_id set not null;
alter table public.suppliers          alter column org_id set not null;
alter table public.supplier_payments  alter column org_id set not null;
alter table public.supplier_invoices  alter column org_id set not null;
alter table public.capital_entries    alter column org_id set not null;

create index profiles_org_idx           on public.profiles (org_id);
create index customers_org_idx          on public.customers (org_id);
create index customer_payments_org_idx  on public.customer_payments (org_id);
create index suppliers_org_idx          on public.suppliers (org_id);
create index supplier_payments_org_idx  on public.supplier_payments (org_id);
create index supplier_invoices_org_idx  on public.supplier_invoices (org_id);
create index capital_entries_org_idx    on public.capital_entries (org_id);

-- ---------------------------------------------------------------------------
-- مفاتيح مركبة: الدفعة لا يمكن أن تنتمي لعميل من مؤسسة أخرى
-- Composite FKs so a row can never point at a parent in another tenant, even if
-- a policy were ever mis-written. Requires a unique key on (id, org_id).
-- ---------------------------------------------------------------------------
alter table public.customers add constraint customers_id_org_key unique (id, org_id);
alter table public.suppliers add constraint suppliers_id_org_key unique (id, org_id);

alter table public.customer_payments
  drop constraint customer_payments_customer_id_fkey,
  add constraint customer_payments_customer_org_fkey
    foreign key (customer_id, org_id) references public.customers (id, org_id) on delete cascade;

alter table public.supplier_payments
  drop constraint supplier_payments_supplier_id_fkey,
  add constraint supplier_payments_supplier_org_fkey
    foreign key (supplier_id, org_id) references public.suppliers (id, org_id) on delete cascade;

alter table public.supplier_invoices
  drop constraint supplier_invoices_supplier_id_fkey,
  add constraint supplier_invoices_supplier_org_fkey
    foreign key (supplier_id, org_id) references public.suppliers (id, org_id) on delete cascade;

-- ---------------------------------------------------------------------------
-- private.current_org_id — مؤسسة المستخدم الحالي
-- ---------------------------------------------------------------------------
-- security definer مقصود: الدالة تقرأ profiles، وjعلى profiles سياسة تستدعي هذه
-- الدالة نفسها. بدون security definer تحدث حلقة لا نهائية. الدالة في مخطط
-- private فلا تُكشف على /rest/v1/rpc.
--
-- SECURITY DEFINER is deliberate and load-bearing: this reads public.profiles,
-- and profiles' own tenant policy calls this function. Without definer rights
-- the policy would recurse infinitely. Living in `private` also keeps it off the
-- PostgREST surface — see 00005 for why that matters.
create or replace function private.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.org_id from public.profiles p where p.id = (select auth.uid());
$$;

revoke all on function private.current_org_id() from public, anon;
grant execute on function private.current_org_id() to authenticated;

-- ---------------------------------------------------------------------------
-- ضبط org_id تلقائيًا — العميل لا يستطيع تزويره
-- ---------------------------------------------------------------------------
-- إن وُجدت جلسة، تُفرض مؤسستها ويُتجاهل ما أرسله العميل. إن لم توجد (service
-- role أو بذور البيانات) تُترك القيمة المرسلة كما هي.
--
-- With a session, the caller's own org always wins and whatever the client sent
-- is discarded. With no session (service role, seeding) the supplied value is
-- kept, which is what lets the seed script write into a chosen org.
create or replace function public.set_org_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.org_id := coalesce(private.current_org_id(), new.org_id);
  return new;
end;
$$;

revoke all on function public.set_org_id() from public, anon, authenticated;

create trigger set_org_id before insert on public.customers
  for each row execute function public.set_org_id();
create trigger set_org_id before insert on public.customer_payments
  for each row execute function public.set_org_id();
create trigger set_org_id before insert on public.suppliers
  for each row execute function public.set_org_id();
create trigger set_org_id before insert on public.supplier_payments
  for each row execute function public.set_org_id();
create trigger set_org_id before insert on public.supplier_invoices
  for each row execute function public.set_org_id();
create trigger set_org_id before insert on public.capital_entries
  for each row execute function public.set_org_id();

-- org_id لا يتغير بعد الإنشاء · a row can never migrate between tenants
create or replace function public.freeze_org_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.org_id is distinct from old.org_id then
    raise exception 'ORG_IMMUTABLE: لا يمكن نقل السجل إلى مؤسسة أخرى'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.freeze_org_id() from public, anon, authenticated;

create trigger freeze_org_id before update on public.customers
  for each row execute function public.freeze_org_id();
create trigger freeze_org_id before update on public.customer_payments
  for each row execute function public.freeze_org_id();
create trigger freeze_org_id before update on public.suppliers
  for each row execute function public.freeze_org_id();
create trigger freeze_org_id before update on public.supplier_payments
  for each row execute function public.freeze_org_id();
create trigger freeze_org_id before update on public.supplier_invoices
  for each row execute function public.freeze_org_id();
create trigger freeze_org_id before update on public.capital_entries
  for each row execute function public.freeze_org_id();
create trigger freeze_org_id before update on public.profiles
  for each row execute function public.freeze_org_id();

-- ---------------------------------------------------------------------------
-- إنشاء المستخدم: تسجيل ذاتي ينشئ مؤسسة، ودعوة تنضم لمؤسسة قائمة
-- ---------------------------------------------------------------------------
-- التمييز عبر org_id داخل user_metadata: دالة الحافة `invite-collector` تمرره،
-- والتسجيل الذاتي لا يمرره.
--
-- Self-signup creates a brand new organization and makes the user its owner.
-- An invited collector arrives with org_id in user_metadata (set server-side by
-- the invite-collector Edge Function) and joins that org instead. The old
-- version hardcoded role = 'collector', which under tenancy would have left
-- every signing-up owner with no organization at all.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(new.email, '@', 1)
  );
  v_org_id := nullif(new.raw_user_meta_data ->> 'org_id', '')::uuid;

  if v_org_id is null then
    insert into public.organizations (name, owner_id)
    values (
      coalesce(nullif(new.raw_user_meta_data ->> 'shop_name', ''), v_full_name),
      new.id
    )
    returning id into v_org_id;

    insert into public.profiles (id, org_id, full_name, role)
    values (new.id, v_org_id, v_full_name, 'owner');
  else
    insert into public.profiles (id, org_id, full_name, role)
    values (new.id, v_org_id, v_full_name, 'collector');
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- حد المحصلين — يُقرأ من المؤسسة، ويُفحص عند الإضافة والتعديل معًا
-- ---------------------------------------------------------------------------
-- الفحص على INSERT وحده يمكن الالتفاف عليه: تُدرج الصف بدور مالك ثم تحدّثه إلى
-- محصّل. لذلك المحفّز يعمل في الحالتين.
--
-- Checking only on INSERT is bypassable: insert the row as 'owner', then UPDATE
-- it to 'collector'. This fires on both.
create or replace function public.enforce_collector_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_limit integer;
begin
  if new.role <> 'collector' or not new.active then
    return new;
  end if;

  select max_collectors into v_limit
  from public.organizations where id = new.org_id;

  select count(*) into v_count
  from public.profiles
  where org_id = new.org_id
    and role = 'collector'
    and active
    and id <> new.id;

  if v_count >= coalesce(v_limit, 0) then
    raise exception 'COLLECTOR_LIMIT_REACHED: تم بلوغ الحد الأقصى لعدد المحصّلين في هذه الباقة'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_collector_limit() from public, anon, authenticated;

create trigger enforce_collector_limit
before insert or update on public.profiles
for each row execute function public.enforce_collector_limit();

-- ---------------------------------------------------------------------------
-- المنح · grants
-- ---------------------------------------------------------------------------
grant select on public.organizations to authenticated;
grant update on public.organizations to authenticated; -- سياسة 00008 تقصره على المالك
revoke all on public.organizations from anon;
