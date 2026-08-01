-- =============================================================================
-- 00015_audit_log.sql — سجل تدقيق غير قابل للتعديل
-- =============================================================================
-- المحصّل ممنوع من التعديل والحذف بحكم سياسات 00008، لكن المالك يستطيع تعديل أو
-- حذف أي دفعة دون أن يترك أثرًا. في تطبيق كل غرضه مالٌ متنازع عليه، هذا هو
-- الانكشاف الحقيقي: لا وسيلة للإجابة عن «من غيّر هذا الرقم ومتى وماذا كان قبله».
--
-- Collectors are already append-only by policy (00008), but an owner can edit or
-- delete any payment leaving no trace. In an app whose entire purpose is
-- contested money, that is the real exposure: nothing can answer "who changed
-- this number, when, and what was it before?". This table answers it.
--
-- تُدقَّق المدخلات فقط: العقود والعملاء والدفعات. الأقساط والتخصيصات مشتقة
-- ويُعاد بناؤها من الدفعات، فتدقيقها يعني آلاف الصفوف بلا معلومة إضافية.
--
-- Only INPUTS are audited — contracts, customers, payments. Installments and
-- allocations are derived and get rebuilt from payments on every change, so
-- auditing them would mean thousands of rows carrying no information the payment
-- rows do not already carry.
--
-- ملاحظة: لا يُخزَّن عنوان IP. المتاح داخل Postgres هو عنوان مجمّع الاتصالات لا
-- المستخدم، وتخزين قيمة مضلِّلة في سجل تدقيق أسوأ من تركها فارغة.
-- No IP column: what Postgres can see is the connection pooler's address, not
-- the user's. A misleading value in an audit log is worse than no value.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- فارغ يعني عملية لم تمر بجلسة مستخدم (بذور، مفتاح خدمة) — وهي معلومة بذاتها
  -- NULL means the change did not come through a user session (seed, service
  -- role). That is itself information, so it is recorded rather than faked.
  user_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_type text not null,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'سجل تدقيق غير قابل للتعديل لكل تغيير مالي';

create index audit_log_org_time_idx on public.audit_log (org_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- المحفّز العام — جدول واحد يخدم كل الجداول
-- ---------------------------------------------------------------------------
-- to_jsonb(old/new) بدل old.id مباشرة، فالأخير غير متاح في دالة عامة لا تعرف
-- شكل الجدول الذي تعمل عليه.
-- to_jsonb(old/new) rather than old.id: a generic function has no compile-time
-- knowledge of the row type it is handed, so the columns are read as JSON.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
begin
  if tg_op = 'DELETE' then
    v_before := to_jsonb(old);
    v_after := null;
    v_row := v_before;
  elsif tg_op = 'INSERT' then
    v_before := null;
    v_after := to_jsonb(new);
    v_row := v_after;
  else
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_row := v_after;
  end if;

  insert into public.audit_log (
    org_id, user_id, action, entity_type, entity_id, before_json, after_json
  )
  values (
    (v_row ->> 'org_id')::uuid,
    (select auth.uid()),
    tg_op,
    tg_table_name,
    (v_row ->> 'id')::uuid,
    v_before,
    v_after
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.write_audit_log() from public, anon, authenticated;

create trigger audit_customer_payments
after insert or update or delete on public.customer_payments
for each row execute function public.write_audit_log();

create trigger audit_contracts
after insert or update or delete on public.contracts
for each row execute function public.write_audit_log();

create trigger audit_customers
after insert or update or delete on public.customers
for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------------
-- عدم القابلية للتعديل — بالبناء لا بالاتفاق
-- ---------------------------------------------------------------------------
-- لا سياسة insert ولا update ولا delete على الإطلاق: المحفّز (security definer)
-- هو الكاتب الوحيد، ولا يملك أي عميل — ولا المالك — وسيلة لتغيير سطر أو محوه.
-- القراءة للمالك وحده: السجل يحمل صورًا كاملة للصفوف، ومنها بيانات العملاء.
--
-- No INSERT, UPDATE, or DELETE policy exists at all. The security-definer
-- trigger is the only writer, and no client — owner included — has any path to
-- alter or erase a row. That is what makes it an audit log rather than a table
-- of suggestions. SELECT is owner-only because the rows carry full row snapshots
-- including customer PII.
alter table public.audit_log enable row level security;

create policy "audit_log: owner reads own org"
on public.audit_log for select to authenticated
using (org_id = private.current_org_id() and private.is_owner());

grant select on public.audit_log to authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
revoke all on public.audit_log from anon;
