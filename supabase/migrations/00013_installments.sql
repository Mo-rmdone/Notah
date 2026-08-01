-- =============================================================================
-- 00013_installments.sql — جدول الأقساط المستحقة (the payment schedule)
-- =============================================================================
-- حتى الآن كان القسط رقمًا واحدًا على العقد (monthly_installment) والمتبقي رصيدًا
-- جاريًا. لا يوجد أي صف يقول «القسط الثالث من اثني عشر، يستحق في ١٥ أبريل».
-- ولهذا كانت customer_performance تقارن مجموع دفعات الشهر بمجموع الأقساط، فيظهر
-- العميل الذي دفع شهرين مقدمًا «متأخرًا» في الشهر التالي — وهو أسوأ خطأ ممكن:
-- وسم أفضل العملاء انضباطًا بأنهم متأخرون.
--
-- Until now the installment was a single scalar on the contract and the balance
-- a running total. Nothing recorded "installment 3 of 12, due April 15". That is
-- why customer_performance() compares a calendar month's payments against a
-- month's worth of installments, and why a customer who pays two months up front
-- then correctly pays nothing the next month is displayed as «متأخر». This table
-- is what makes a payment settle a *specific* due date instead of a month bucket.
--
-- قرار: مصدر الحقيقة للمال يبقى contracts.remaining_amount ومحفزاته المُختبرة.
-- هذا الجدول مصدر الحقيقة للـ«موعد» فقط. اختبار يؤكد تطابق المجموعين.
--
-- DESIGN CALL — deliberately NOT a second source of truth for money:
-- contracts.remaining_amount and its triggers (00007, already verified against
-- live Postgres) stay authoritative for how much is owed. These rows are
-- authoritative only for *when* it is owed. A test asserts
-- Σ amount_due = total_amount - down_payment so the two can never drift.

-- ---------------------------------------------------------------------------
-- الحالة — «متأخر» غير مخزّن عمدًا
-- ---------------------------------------------------------------------------
-- overdue مشتق دائمًا (due_date < current_date and status <> 'paid') ولا يُخزَّن.
-- الحالة المخزّنة تحتاج مهمة ليلية تقلبها، وأي تعطل في المهمة يعني لوحة تحكم
-- تكذب بصمت. المشتق لا يمكن أن يتقادم.
--
-- 'overdue' is deliberately absent: it is derived on read, never stored. A
-- stored overdue flag needs a nightly job to flip it, and a job that fails
-- leaves the dashboard silently lying. A derived one cannot go stale.
create type public.installment_status as enum ('pending', 'partial', 'paid', 'waived');

comment on type public.installment_status is 'حالة القسط — «متأخر» مشتق من due_date ولا يُخزَّن';

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  contract_id uuid not null,
  seq_no integer not null check (seq_no > 0),
  due_date date not null,
  amount_due numeric(12, 2) not null check (amount_due > 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  status public.installment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint installments_contract_org_fkey
    foreign key (contract_id, org_id) references public.contracts (id, org_id) on delete cascade,
  constraint installments_seq_unique unique (contract_id, seq_no)
);

comment on table public.installments is 'جدول الأقساط المستحقة لكل عقد — متى يُستحق كم';

-- مطلوب لمفتاح مركب من payment_allocation لاحقًا · for the composite FK in 00014
alter table public.installments add constraint installments_id_org_key unique (id, org_id);

create index installments_org_idx on public.installments (org_id);
create index installments_contract_idx on public.installments (contract_id);
-- الفهرس الذي تعتمد عليه كل أسئلة «المستحق اليوم» و«المتأخر» و«أعمار الديون»
-- The index every due-today / overdue / aging question rides on.
create index installments_due_open_idx on public.installments (due_date)
  where status <> 'paid' and status <> 'waived';

-- ---------------------------------------------------------------------------
-- نافذة السداد → يوم الاستحقاق
-- ---------------------------------------------------------------------------
-- النافذة مدى (١-١٠، ١١-٢٠، ٢١-آخر الشهر) والاستحقاق هو *إغلاق* المدى: اليوم
-- الذي يصبح القسط بعده متأخرًا. آخر الشهر محسوب من الشهر نفسه لا بإضافة أيام،
-- فيصح فبراير تلقائيًا (٣١ يناير → ٢٨ فبراير).
--
-- The window is a range; the due date is its *close* — the day after which the
-- installment is late. Month-end is computed from the month itself rather than
-- by adding days, so February resolves correctly with no special case.
create or replace function private.window_due_day(
  p_window public.payment_window,
  p_month date
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_window
    when 'early' then date_trunc('month', p_month)::date + 9   -- اليوم ١٠
    when 'mid'   then date_trunc('month', p_month)::date + 19  -- اليوم ٢٠
    else (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date
  end;
$$;

-- ---------------------------------------------------------------------------
-- توليد الجدول — دالة نقية قابلة للاختبار وحدها
-- ---------------------------------------------------------------------------
-- الكسور تذهب كلها إلى القسط الأخير حتى يساوي المجموع الممول بالقرش الواحد.
-- أول استحقاق = أول إغلاق نافذة يقع *بعد* تاريخ العقد (لا تستحق يوم التوقيع).
--
-- Pure and separately testable. The rounding residual is pushed entirely onto
-- the LAST installment so Σ equals the financed amount to the piaster. The first
-- due date is the first window close strictly after the contract date — nothing
-- falls due on the day you sign.
create or replace function private.build_schedule(
  p_start date,
  p_window public.payment_window,
  p_financed numeric,
  p_monthly numeric
)
returns table (seq_no integer, due_date date, amount_due numeric)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_n integer;
  v_first date;
  v_i integer;
  v_allocated numeric(12, 2) := 0;
begin
  -- عقد مدفوع بالكامل مقدمًا لا جدول له · a fully-prepaid contract has no schedule
  if coalesce(p_financed, 0) <= 0 or coalesce(p_monthly, 0) <= 0 then
    return;
  end if;

  v_n := ceil(p_financed / p_monthly);

  v_first := private.window_due_day(p_window, p_start);
  if v_first <= p_start then
    v_first := private.window_due_day(
      p_window,
      (date_trunc('month', p_start) + interval '1 month')::date
    );
  end if;

  for v_i in 1..v_n loop
    seq_no := v_i;
    due_date := private.window_due_day(
      p_window,
      (date_trunc('month', v_first) + make_interval(months => v_i - 1))::date
    );
    if v_i = v_n then
      amount_due := p_financed - v_allocated;  -- الباقي كله على الأخير
    else
      amount_due := p_monthly;
      v_allocated := v_allocated + p_monthly;
    end if;
    return next;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- ترحيل العقود القائمة · backfill existing contracts
-- ---------------------------------------------------------------------------
-- قبل إنشاء المحفّز، وإلا لا فرق: المحفّز يعمل على إدراج العقود لا الأقساط.
insert into public.installments (org_id, contract_id, seq_no, due_date, amount_due)
select k.org_id, k.id, s.seq_no, s.due_date, s.amount_due
from public.contracts k
cross join lateral private.build_schedule(
  k.contract_start_date,
  k.payment_window,
  k.total_amount - k.down_payment,
  k.monthly_installment
) s;

-- ---------------------------------------------------------------------------
-- الجدول يتبع العقد — إنشاءً وتعديلًا
-- ---------------------------------------------------------------------------
-- الجدول قيمة مشتقة من (تاريخ البدء، النافذة، الممول، القسط). تعديل أي منها على
-- العقد يجب أن يعيد اشتقاقه، وإلا بقي جدول قديم صامت تُحسب منه كل تواريخ
-- الاستحقاق والتأخير وأعمار الديون — أي لوحة تحكم تكذب دون أن يظهر خطأ.
--
-- The schedule is derived from (start_date, window, financed, monthly). Editing
-- any of them on the contract must re-derive it. Without this, an owner raising
-- a contract's total leaves a stale schedule behind, and every due-date,
-- overdue, and aging figure computed from it is silently wrong. Caught by the
-- Σ-invariant test, which is exactly what that test is for.
--
-- after insert لأن المفتاح الأجنبي يحتاج صف العقد موجودًا فعلًا.
-- AFTER INSERT because the composite FK needs the contract row to exist. The
-- DELETE matches nothing on insert, so one function serves both triggers.
--
-- ⚠ 00014: بعد وجود payment_allocation يجب أن يحفظ هذا الأقساط المسددة بدل
-- حذفها جميعًا. لا توجد تخصيصات بعد، فإعادة التوليد الكاملة صحيحة اليوم.
-- ⚠ 00014 must make this allocation-aware — preserving settled installments
-- instead of dropping them all. No allocations exist yet, so a full regenerate
-- is correct today.
create or replace function public.contracts_sync_installments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.installments where contract_id = new.id;

  insert into public.installments (org_id, contract_id, seq_no, due_date, amount_due)
  select new.org_id, new.id, s.seq_no, s.due_date, s.amount_due
  from private.build_schedule(
    new.contract_start_date,
    new.payment_window,
    new.total_amount - new.down_payment,
    new.monthly_installment
  ) s;

  return new;
end;
$$;

revoke all on function public.contracts_sync_installments() from public, anon, authenticated;

create trigger contracts_generate_installments
after insert on public.contracts
for each row execute function public.contracts_sync_installments();

-- remaining_amount ليس مدخلًا للجدول، فتعديله وحده لا يعيد التوليد.
-- remaining_amount is not a schedule input, so a payment changing it must not
-- rebuild the schedule — only the four determining columns do.
create trigger contracts_regenerate_installments
after update on public.contracts
for each row
when (
  old.contract_start_date is distinct from new.contract_start_date
  or old.payment_window is distinct from new.payment_window
  or old.total_amount is distinct from new.total_amount
  or old.down_payment is distinct from new.down_payment
  or old.monthly_installment is distinct from new.monthly_installment
)
execute function public.contracts_sync_installments();

-- ---------------------------------------------------------------------------
-- السياسات — نفس المحورين: العزل + الدور
-- ---------------------------------------------------------------------------
-- لا سياسة insert ولا delete للعملاء إطلاقًا: المحفّز (security definer) وحده
-- يُنشئ الصفوف، والحذف يتم تتابعيًا مع العقد. التعديل للمالك فقط (الإعفاء لاحقًا).
--
-- No client INSERT or DELETE policy at all: the security-definer trigger is the
-- only writer and deletion cascades with the contract. UPDATE is owner-only,
-- which is what a future «إعفاء» (waive) action will need.
alter table public.installments enable row level security;

create policy "installments: org members read"
on public.installments for select to authenticated
using (org_id = private.current_org_id() and private.is_active_user());

create policy "installments: owner updates"
on public.installments for update to authenticated
using (org_id = private.current_org_id() and private.is_owner())
with check (org_id = private.current_org_id() and private.is_owner());

grant select, update on public.installments to authenticated;
revoke all on public.installments from anon;
