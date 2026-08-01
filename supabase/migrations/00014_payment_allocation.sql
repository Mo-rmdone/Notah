-- =============================================================================
-- 00014_payment_allocation.sql — توزيع الدفعات على الأقساط
-- =============================================================================
-- هذه الهجرة تصلح خطأً حقيقيًا كان يظهر للمستخدم: العميل الذي يدفع شهرين مقدمًا
-- ثم لا يدفع في الشهر التالي (وهو محق) كان يظهر «متأخرًا». السبب أن الحالة كانت
-- تُستنتج بمقارنة مجموع دفعات الشهر بمجموع أقساطه، ولم يكن هناك ما يسجّل أن دفعة
-- بعينها سدّدت قسطًا بعينه.
--
-- This migration fixes a user-visible wrong answer: a customer who paid two
-- months up front and then correctly paid nothing the next month was displayed
-- as «متأخر» — the app flagged its best-paying customers as late. The cause was
-- that status was inferred by comparing a calendar month's payments against that
-- month's installments, with nothing recording that a given payment settled a
-- given due date. `payment_allocations` is that record.
--
-- الاستراتيجية: إعادة حساب كاملة لكل عقد بدل تعديل تفاضلي. أبسط في التفكير،
-- ولا يمكن أن تنحرف، وتتعامل مع الإضافة والتعديل والحذف بنفس المسار.
--
-- STRATEGY — full recompute per contract, not incremental patching. Every
-- payment for the contract is replayed through the waterfall in date order. It
-- is idempotent, cannot drift, and handles insert/update/delete by one path.
-- A contract has on the order of 20 installments and 20 payments, so the cost
-- is irrelevant and the correctness guarantee is absolute.

-- مطلوب للمفتاح المركب أدناه · needed for the composite FK below
alter table public.customer_payments
  add constraint customer_payments_id_org_key unique (id, org_id);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  payment_id uuid not null,
  installment_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  constraint payment_allocations_payment_org_fkey
    foreign key (payment_id, org_id) references public.customer_payments (id, org_id) on delete cascade,
  constraint payment_allocations_installment_org_fkey
    foreign key (installment_id, org_id) references public.installments (id, org_id) on delete cascade
);

comment on table public.payment_allocations is 'أي دفعة سدّدت أي قسط وبكم — الجواب الذي كان مفقودًا';

create index payment_allocations_org_idx on public.payment_allocations (org_id);
create index payment_allocations_payment_idx on public.payment_allocations (payment_id);
create index payment_allocations_installment_idx on public.payment_allocations (installment_id);

-- ---------------------------------------------------------------------------
-- الشلال — الأقدم أولًا
-- ---------------------------------------------------------------------------
-- تُمسح تخصيصات العقد ثم تُعاد كل دفعاته بترتيب تاريخها، وكل دفعة تملأ أقدم قسط
-- غير مسدد ثم الذي يليه. هكذا تسدد دفعة واحدة كبيرة أقساطًا مستقبلية بعينها،
-- وهو بالضبط ما كان مستحيلًا قبل هذا الجدول.
--
-- Wipe the contract's allocations, then replay every payment in date order,
-- each filling the oldest unpaid installment then the next. This is what lets a
-- single large payment settle specific *future* installments — precisely what
-- was impossible before, and the reason for the false «متأخر».
--
-- الثابت: مجموع الأقساط غير المسددة = remaining_amount على العقد، فلا يبقى من
-- أي دفعة رصيد غير مخصص (ما لم يُعفَ قسط — وهو غير مُفعَّل بعد).
-- Invariant: Σ unpaid installments = contracts.remaining_amount, so no payment
-- ever leaves an unallocated remainder — unless an installment is waived, which
-- is not yet exposed anywhere.
create or replace function private.reallocate_contract(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment record;
  v_inst record;
  v_left numeric(12, 2);
  v_take numeric(12, 2);
begin
  delete from public.payment_allocations
  where installment_id in (
    select id from public.installments where contract_id = p_contract_id
  );

  update public.installments
  set amount_paid = 0,
      paid_at = null,
      status = (case when status = 'waived' then 'waived' else 'pending' end)::public.installment_status
  where contract_id = p_contract_id;

  for v_payment in
    select id, org_id, amount, payment_date
    from public.customer_payments
    where contract_id = p_contract_id
    order by payment_date, created_at, id
  loop
    v_left := v_payment.amount;

    for v_inst in
      select id, amount_due, amount_paid
      from public.installments
      where contract_id = p_contract_id
        and status <> 'waived'
        and amount_paid < amount_due
      order by seq_no
    loop
      exit when v_left <= 0;

      v_take := least(v_left, v_inst.amount_due - v_inst.amount_paid);

      insert into public.payment_allocations (org_id, payment_id, installment_id, amount)
      values (v_payment.org_id, v_payment.id, v_inst.id, v_take);

      update public.installments
      set amount_paid = v_inst.amount_paid + v_take,
          status = (case
                     when v_inst.amount_paid + v_take >= amount_due then 'paid'
                     else 'partial'
                   end)::public.installment_status,
          paid_at = case
                      when v_inst.amount_paid + v_take >= amount_due
                      then v_payment.payment_date::timestamptz
                      else null
                    end
      where id = v_inst.id;

      v_left := v_left - v_take;
    end loop;
  end loop;
end;
$$;

revoke all on function private.reallocate_contract(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- أي تغيير في الدفعات يعيد التوزيع
-- ---------------------------------------------------------------------------
create or replace function public.customer_payments_reallocate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.reallocate_contract(old.contract_id);
    return old;
  end if;
  perform private.reallocate_contract(new.contract_id);
  return new;
end;
$$;

revoke all on function public.customer_payments_reallocate() from public, anon, authenticated;

create trigger customer_payments_reallocate
after insert or update or delete on public.customer_payments
for each row execute function public.customer_payments_reallocate();

-- ---------------------------------------------------------------------------
-- إعادة بناء الجدول تستدعي إعادة التوزيع
-- ---------------------------------------------------------------------------
-- 00013 يحذف الأقساط ويعيد توليدها عند تعديل العقد، والتخصيصات تُحذف تتابعيًا
-- معها. بدون إعادة التوزيع هنا تظهر كل الأقساط غير مسددة رغم وجود الدفعات.
-- هذا يُغلق التحذير المكتوب في 00013: لا حاجة للحفاظ على الصفوف المسددة ما دام
-- إعادة التشغيل الكاملة تعيد بناء الحالة نفسها من الدفعات.
--
-- 00013 drops and regenerates installments when a contract is edited, cascading
-- the allocations away with them. Without reallocating here, every installment
-- would read unpaid despite the payments existing. This closes the ⚠ note left
-- in 00013: settled rows need no preserving, because replaying the payments
-- reconstructs exactly the same state.
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

  perform private.reallocate_contract(new.id);

  return new;
end;
$$;

revoke all on function public.contracts_sync_installments() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- ترحيل: وزّع كل الدفعات القائمة · backfill every existing contract
-- ---------------------------------------------------------------------------
do $$
declare
  v_id uuid;
begin
  for v_id in select id from public.contracts loop
    perform private.reallocate_contract(v_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- انتظام السداد — محسوبًا من الأقساط لا من مجاميع الشهور
-- ---------------------------------------------------------------------------
-- هذا هو موضع الإصلاح: «المتوقع» صار مجموع الأقساط المستحقة في الشهر، و«المدفوع»
-- ما خُصص لتلك الأقساط تحديدًا — أيًا كان تاريخ الدفعة التي سددتها. فمن دفع
-- مقدمًا يظهر «مدفوعًا» في الشهر الذي غطّاه، لا «متأخرًا».
--
-- The fix lands here. `expected` is now the installments *due* in that month,
-- and `paid` is what was allocated to those specific installments — regardless
-- of when the payment settling them arrived. A customer who paid ahead now reads
-- «مدفوع» for the month they covered, instead of «متأخر».
create or replace function public.customer_performance(p_customer_id uuid)
returns table (
  month_start date,
  expected numeric(12, 2),
  paid numeric(12, 2),
  status text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with months as (
    select generate_series(
      date_trunc('month', current_date) - interval '4 months',
      date_trunc('month', current_date),
      interval '1 month'
    )::date as month_start
  ),
  agg as (
    select
      m.month_start,
      coalesce(sum(i.amount_due), 0)::numeric(12, 2) as expected,
      coalesce(sum(i.amount_paid), 0)::numeric(12, 2) as paid
    from months m
    left join public.contracts k on k.customer_id = p_customer_id
    left join public.installments i
      on i.contract_id = k.id
     and date_trunc('month', i.due_date)::date = m.month_start
     and i.status <> 'waived'
    group by m.month_start
  )
  select
    a.month_start,
    a.expected,
    a.paid,
    case
      when a.expected = 0 then 'na'
      when a.paid >= a.expected then 'paid'
      when a.paid > 0 then 'partial'
      else 'missed'
    end as status
  from agg a
  order by a.month_start;
$$;

grant execute on function public.customer_performance(uuid) to authenticated;
revoke execute on function public.customer_performance(uuid) from anon;

-- ---------------------------------------------------------------------------
-- السياسات · policies
-- ---------------------------------------------------------------------------
-- القراءة فقط للعميل: الدالة (security definer) هي الكاتب الوحيد.
-- Read-only for clients; the security-definer function is the sole writer.
alter table public.payment_allocations enable row level security;

create policy "payment_allocations: org members read"
on public.payment_allocations for select to authenticated
using (org_id = private.current_org_id() and private.is_active_user());

grant select on public.payment_allocations to authenticated;
revoke all on public.payment_allocations from anon;
