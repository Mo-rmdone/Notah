\set ON_ERROR_STOP on
\pset pager off

-- =============================================================================
-- 05_allocation.sql — شلال التوزيع والانحدار الذي بُنيت من أجله الهجرة
-- =============================================================================

-- ---------------------------------------------------------------------------
-- الانحدار: من دفع مقدمًا لا يُوسم متأخرًا
-- ---------------------------------------------------------------------------
-- هذا الاختبار يفشل على الشيفرة القديمة. كان «المدفوع» يُحسب كمجموع دفعات الشهر،
-- فمن دفع قسطين في الشهر الأول ثم لا شيء في الثاني يظهر «متأخرًا» في الثاني.
--
-- THE regression test. This fails against the pre-00014 implementation: `paid`
-- was the sum of payments *made in* a calendar month, so paying two installments
-- up front in month 1 and nothing in month 2 rendered month 2 as «متأخر».
do $$
declare
  v_org uuid;
  v_cust uuid;
  v_contract uuid;
  v_m0 date := date_trunc('month', current_date)::date;
  v_start date := (date_trunc('month', current_date) - interval '3 months')::date;
  v_status text;
  v_paid numeric;
  v_n_paid integer;
begin
  select org_id into v_org from public.organizations o
  join public.profiles p on p.org_id = o.id limit 1;

  insert into public.customers (org_id, full_name, known_as, phone, national_id, address)
  values (v_org, 'عميل الدفع المقدم', 'المقدم', '01000000099', '29001010100099', 'اختبار')
  returning id into v_cust;

  -- عقد يبدأ قبل ٣ شهور، نافذة مبكرة (يوم ١٠)، قسط ٥٠٠
  insert into public.contracts (
    org_id, customer_id, category, contract_start_date,
    payment_window, total_amount, down_payment, monthly_installment
  )
  values (v_org, v_cust, 'household', v_start, 'early', 5000, 0, 500)
  returning id into v_contract;

  -- دفعة واحدة بقيمة قسطين، في الشهر الأول فقط
  insert into public.customer_payments (org_id, contract_id, amount, payment_date)
  values (v_org, v_contract, 1000, v_start + 7);

  -- القسطان الأول والثاني مسددان بدفعة واحدة
  select count(*) into v_n_paid
  from public.installments
  where contract_id = v_contract and status = 'paid';
  raise notice 'A1 one payment settled exactly two installments: %', (v_n_paid = 2);

  -- الشهر الثاني (الذي لم تصله دفعة) يجب أن يقرأ «مدفوع»
  select status, paid into v_status, v_paid
  from public.customer_performance(v_cust)
  where month_start = (date_trunc('month', v_start) + interval '1 month')::date;

  raise notice 'A2 month 2 reads paid, not missed (was the bug): %', (v_status = 'paid');
  raise notice 'A3 month 2 shows the carried-over 500: %', (v_paid = 500);

  -- والشهر الثالث فعلًا متأخر — الإصلاح لا يخفي التأخير الحقيقي
  select status into v_status
  from public.customer_performance(v_cust)
  where month_start = (date_trunc('month', v_start) + interval '2 months')::date;
  raise notice 'A4 a genuinely unpaid month still reads missed: %', (v_status = 'missed');

  -- الشهر الحالي متأخر أيضًا · and so does the current month
  select status into v_status
  from public.customer_performance(v_cust) where month_start = v_m0;
  raise notice 'A5 current unpaid month reads missed: %', (v_status = 'missed');
end;
$$;

-- ---------------------------------------------------------------------------
-- الشلال · the waterfall
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid; v_cust uuid; v_contract uuid;
  v_first_paid numeric; v_second_paid numeric; v_second_status text;
  v_alloc_total numeric; v_pay_id uuid; v_n integer;
begin
  select org_id into v_org from public.organizations o
  join public.profiles p on p.org_id = o.id limit 1;

  insert into public.customers (org_id, full_name, known_as, phone, national_id, address)
  values (v_org, 'عميل الشلال', 'الشلال', '01000000098', '29001010100098', 'اختبار')
  returning id into v_cust;

  insert into public.contracts (
    org_id, customer_id, category, contract_start_date,
    payment_window, total_amount, down_payment, monthly_installment
  )
  values (v_org, v_cust, 'household', '2026-01-05', 'mid', 3000, 0, 1000)
  returning id into v_contract;

  -- دفعة جزئية: تملأ الأقدم أولًا
  insert into public.customer_payments (org_id, contract_id, amount, payment_date)
  values (v_org, v_contract, 600, '2026-01-20')
  returning id into v_pay_id;

  select amount_paid into v_first_paid
  from public.installments where contract_id = v_contract and seq_no = 1;
  raise notice 'B1 partial payment fills the oldest installment first: %', (v_first_paid = 600);

  select status into v_second_status
  from public.installments where contract_id = v_contract and seq_no = 1;
  raise notice 'B2 a partly-filled installment reads partial: %', (v_second_status = 'partial');

  -- دفعة ثانية تكمل الأول وتفيض على الثاني
  insert into public.customer_payments (org_id, contract_id, amount, payment_date)
  values (v_org, v_contract, 900, '2026-02-15');

  select amount_paid into v_first_paid
  from public.installments where contract_id = v_contract and seq_no = 1;
  select amount_paid, status into v_second_paid, v_second_status
  from public.installments where contract_id = v_contract and seq_no = 2;
  raise notice 'B3 overflow completes the first installment: %', (v_first_paid = 1000);
  raise notice 'B4 and spills onto the next one: %', (v_second_paid = 500);
  raise notice 'B5 the spilled-onto installment reads partial: %', (v_second_status = 'partial');

  -- مجموع التخصيصات = مجموع الدفعات
  select coalesce(sum(a.amount), 0) into v_alloc_total
  from public.payment_allocations a
  join public.installments i on i.id = a.installment_id
  where i.contract_id = v_contract;
  raise notice 'B6 allocations account for every pound paid (1500): %', (v_alloc_total = 1500);

  -- حذف دفعة يعيد التوزيع كاملًا
  delete from public.customer_payments where id = v_pay_id;
  select amount_paid into v_first_paid
  from public.installments where contract_id = v_contract and seq_no = 1;
  select coalesce(sum(a.amount), 0) into v_alloc_total
  from public.payment_allocations a
  join public.installments i on i.id = a.installment_id
  where i.contract_id = v_contract;
  raise notice 'B7 deleting a payment reallocates the rest (900 on inst 1): %', (v_first_paid = 900);
  raise notice 'B8 allocations shrink to match (900): %', (v_alloc_total = 900);

  select count(*) into v_n
  from public.installments where contract_id = v_contract and status = 'paid';
  raise notice 'B9 no installment is fully paid any more: %', (v_n = 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- الثوابت على كل البيانات · invariants across all data
-- ---------------------------------------------------------------------------
select 'C1. amount_paid never exceeds amount_due' as check,
       not exists (select 1 from public.installments where amount_paid > amount_due) as pass;

select 'C2. every installment status matches its amounts' as check,
       not exists (
         select 1 from public.installments
         where status <> 'waived'
           and status <> case
                 when amount_paid >= amount_due then 'paid'
                 when amount_paid > 0 then 'partial'
                 else 'pending'
               end::public.installment_status
       ) as pass;

-- المخصص لقسط = amount_paid عليه · allocations reconcile to the installment
select 'C3. allocations reconcile to installment amount_paid' as check,
       not exists (
         select 1 from public.installments i
         where i.amount_paid <> coalesce(
           (select sum(a.amount) from public.payment_allocations a where a.installment_id = i.id), 0
         )
       ) as pass;

-- المخصص من دفعة لا يتجاوزها · a payment is never over-allocated
select 'C4. no payment is allocated beyond its amount' as check,
       not exists (
         select 1 from public.customer_payments p
         where coalesce(
           (select sum(a.amount) from public.payment_allocations a where a.payment_id = p.id), 0
         ) > p.amount
       ) as pass;

-- الأقساط غير المسددة = المتبقي على العقد · unpaid schedule equals the balance
select 'C5. unpaid installments reconcile to contract remaining' as check,
       not exists (
         select 1 from public.contracts k
         where coalesce(
                 (select sum(i.amount_due - i.amount_paid)
                  from public.installments i
                  where i.contract_id = k.id and i.status <> 'waived'), 0
               ) <> k.remaining_amount
       ) as pass;

select 'C6. every allocation shares its installment''s org' as check,
       not exists (
         select 1 from public.payment_allocations a
         join public.installments i on i.id = a.installment_id
         where a.org_id <> i.org_id
       ) as pass;
