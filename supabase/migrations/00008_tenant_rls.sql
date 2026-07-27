-- =============================================================================
-- 00008_tenant_rls.sql — سياسات الأمان بعد تعدد المستأجرين
-- =============================================================================
-- محوران مستقلان، وكلاهما إلزامي في كل سياسة:
--   1. العزل بين المؤسسات — org_id = private.current_org_id()
--   2. الصلاحية حسب الدور  — private.is_owner() / private.is_active_user()
--
-- Two orthogonal axes, and BOTH must appear in every policy:
--   1. tenant isolation — org_id = private.current_org_id()
--   2. role permission  — private.is_owner() / private.is_active_user()
--
-- تحذير: سياسة واحدة من نوع `for all using (org_id = ...)` تكفي لكسر النظام
-- بالكامل. Postgres يدمج السياسات بـ OR، فتمنح كل محصّل صلاحية كتابة كاملة على
-- كل جدول وتُبطل قيود الدور كلها.
--
-- WARNING: a single permissive `FOR ALL USING (org_id = …)` policy would undo
-- this entire file. Postgres combines policies with OR, so such a policy passes
-- for every collector on every command and silently grants them full write
-- access. Tenancy alone is not authorization.
--
-- نموذج المحصّل: الإضافة فقط. يضيف عملاء وعقودًا ودفعات، ولا يعدّل أو يحذف شيئًا
-- إطلاقًا — سجل الدفعات يبقى غير قابل للتلاعب.
--
-- Collector model is APPEND-ONLY: they may create customers, contracts, and
-- payments, but may never update or delete anything. There is deliberately no
-- UPDATE or DELETE policy for them on any table, which makes the payment ledger
-- tamper-evident by construction.

-- ---------------------------------------------------------------------------
-- إسقاط سياسات ما قبل التعدد · drop the pre-tenancy policies
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: read own or owner reads all" on public.profiles;
drop policy if exists "profiles: owner updates" on public.profiles;
drop policy if exists "customers: active users read" on public.customers;
drop policy if exists "customers: owner inserts" on public.customers;
drop policy if exists "customers: owner updates" on public.customers;
drop policy if exists "customers: owner deletes" on public.customers;
drop policy if exists "customer_payments: active users read" on public.customer_payments;
drop policy if exists "customer_payments: collector inserts own, owner any" on public.customer_payments;
drop policy if exists "customer_payments: owner updates" on public.customer_payments;
drop policy if exists "customer_payments: owner deletes" on public.customer_payments;
drop policy if exists "suppliers: owner all" on public.suppliers;
drop policy if exists "supplier_payments: owner all" on public.supplier_payments;
drop policy if exists "supplier_invoices: owner all" on public.supplier_invoices;
drop policy if exists "capital_entries: owner all" on public.capital_entries;

alter table public.organizations enable row level security;
alter table public.contracts enable row level security;

-- ---------------------------------------------------------------------------
-- organizations — يقرأها كل عضو نشط، ويعدّلها المالك وحده
-- ---------------------------------------------------------------------------
create policy "organizations: members read own org"
on public.organizations for select to authenticated
using (id = private.current_org_id() and private.is_active_user());

create policy "organizations: owner updates own org"
on public.organizations for update to authenticated
using (id = private.current_org_id() and private.is_owner())
with check (id = private.current_org_id() and private.is_owner());

-- ---------------------------------------------------------------------------
-- profiles — العضو يرى نفسه، والمالك يرى فريق مؤسسته فقط
-- ---------------------------------------------------------------------------
create policy "profiles: read self or owner reads org team"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (org_id = private.current_org_id() and private.is_owner())
);

create policy "profiles: owner updates org team"
on public.profiles for update to authenticated
using (org_id = private.current_org_id() and private.is_owner())
with check (org_id = private.current_org_id() and private.is_owner());

-- ---------------------------------------------------------------------------
-- customers — قراءة وإضافة لكل عضو نشط، وتعديل وحذف للمالك فقط
-- ---------------------------------------------------------------------------
create policy "customers: org members read"
on public.customers for select to authenticated
using (org_id = private.current_org_id() and private.is_active_user());

create policy "customers: org members insert"
on public.customers for insert to authenticated
with check (org_id = private.current_org_id() and private.is_active_user());

create policy "customers: owner updates"
on public.customers for update to authenticated
using (org_id = private.current_org_id() and private.is_owner())
with check (org_id = private.current_org_id() and private.is_owner());

create policy "customers: owner deletes"
on public.customers for delete to authenticated
using (org_id = private.current_org_id() and private.is_owner());

-- ---------------------------------------------------------------------------
-- contracts — نفس النموذج: المحصّل يسجّل صفقة جديدة ولا يعدّلها بعد ذلك
-- A collector who can enrol a customer must be able to record that customer's
-- deal too, otherwise the customer row is meaningless. They still cannot touch
-- it afterwards.
-- ---------------------------------------------------------------------------
create policy "contracts: org members read"
on public.contracts for select to authenticated
using (org_id = private.current_org_id() and private.is_active_user());

create policy "contracts: org members insert"
on public.contracts for insert to authenticated
with check (org_id = private.current_org_id() and private.is_active_user());

create policy "contracts: owner updates"
on public.contracts for update to authenticated
using (org_id = private.current_org_id() and private.is_owner())
with check (org_id = private.current_org_id() and private.is_owner());

create policy "contracts: owner deletes"
on public.contracts for delete to authenticated
using (org_id = private.current_org_id() and private.is_owner());

-- ---------------------------------------------------------------------------
-- customer_payments — الإضافة منسوبة للمُدخِل، ولا تعديل ولا حذف إلا للمالك
-- ---------------------------------------------------------------------------
create policy "customer_payments: org members read"
on public.customer_payments for select to authenticated
using (org_id = private.current_org_id() and private.is_active_user());

-- المحصّل ينسب الدفعة لنفسه حصرًا؛ المالك ينسبها لمن شاء داخل مؤسسته.
-- A collector may only attribute a payment to themselves; an owner may record
-- one on anybody's behalf within their own org.
create policy "customer_payments: org members insert"
on public.customer_payments for insert to authenticated
with check (
  org_id = private.current_org_id()
  and (
    private.is_owner()
    or (private.is_active_user() and collected_by = (select auth.uid()))
  )
);

create policy "customer_payments: owner updates"
on public.customer_payments for update to authenticated
using (org_id = private.current_org_id() and private.is_owner())
with check (org_id = private.current_org_id() and private.is_owner());

create policy "customer_payments: owner deletes"
on public.customer_payments for delete to authenticated
using (org_id = private.current_org_id() and private.is_owner());

-- ---------------------------------------------------------------------------
-- التجار ورأس المال — المالك فقط، وداخل مؤسسته فقط
-- Suppliers and capital: owner-only, and only within their own organization.
-- ---------------------------------------------------------------------------
create policy "suppliers: owner all in org"
on public.suppliers for all to authenticated
using (org_id = private.current_org_id() and private.is_owner())
with check (org_id = private.current_org_id() and private.is_owner());

create policy "supplier_payments: owner all in org"
on public.supplier_payments for all to authenticated
using (org_id = private.current_org_id() and private.is_owner())
with check (org_id = private.current_org_id() and private.is_owner());

create policy "supplier_invoices: owner all in org"
on public.supplier_invoices for all to authenticated
using (org_id = private.current_org_id() and private.is_owner())
with check (org_id = private.current_org_id() and private.is_owner());

create policy "capital_entries: owner all in org"
on public.capital_entries for all to authenticated
using (org_id = private.current_org_id() and private.is_owner())
with check (org_id = private.current_org_id() and private.is_owner());

-- ---------------------------------------------------------------------------
-- المنح · grants — RLS يحكم الصفوف، والدور يحتاج صلاحية على الجدول أصلًا
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
