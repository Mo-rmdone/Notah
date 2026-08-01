\set ON_ERROR_STOP on
\pset pager off

-- =============================================================================
-- 04_schedule.sql — محرك جدول الأقساط
-- =============================================================================
-- الدالة نقية، فتُختبر وحدها بمراجع محسوبة يدويًا قبل أي تكامل.
-- The generator is pure, so it is tested standalone against hand-calculated
-- references before any integration.

-- ---------------------------------------------------------------------------
-- مراجع محسوبة يدويًا · hand-calculated references
-- ---------------------------------------------------------------------------
-- ١٠٠٠ ممولة على ٣٠٠ شهريًا = ٤ أقساط: ٣٠٠+٣٠٠+٣٠٠+١٠٠ (الكسر على الأخير)
select '1. 1000 financed / 300 monthly gives 4 installments' as check,
       (select count(*) = 4
        from private.build_schedule('2026-01-05'::date, 'mid', 1000, 300)) as pass;

select '2. residual lands entirely on the last installment' as check,
       (select array_agg(amount_due order by seq_no) = array[300, 300, 300, 100]::numeric[]
        from private.build_schedule('2026-01-05'::date, 'mid', 1000, 300)) as pass;

select '3. schedule sums to the financed amount to the piaster' as check,
       (select sum(amount_due) = 1000
        from private.build_schedule('2026-01-05'::date, 'mid', 1000, 300)) as pass;

-- قسمة بلا كسر: كل الأقساط متساوية ولا يشذ الأخير
select '4. exact division leaves every installment equal' as check,
       (select array_agg(amount_due order by seq_no) = array[300, 300, 300, 300]::numeric[]
        from private.build_schedule('2026-01-05'::date, 'mid', 1200, 300)) as pass;

-- المبلغ أصغر من القسط الشهري = قسط واحد بقيمته
select '5. financed below one installment yields a single row' as check,
       (select array_agg(amount_due) = array[250]::numeric[]
        from private.build_schedule('2026-01-05'::date, 'mid', 250, 300)) as pass;

-- عقد مسدد بالكامل مقدمًا لا جدول له
select '6. a fully prepaid contract generates no schedule' as check,
       (select count(*) = 0
        from private.build_schedule('2026-01-05'::date, 'mid', 0, 300)) as pass;

-- ---------------------------------------------------------------------------
-- التواريخ · due dates
-- ---------------------------------------------------------------------------
-- عقد ٣١ يناير بنافذة آخر الشهر: فبراير ٢٨ ثم مارس ٣١ ثم أبريل ٣٠ — بلا حالة خاصة
select '7. month-end window rolls Jan 31 to Feb 28, not Mar 3' as check,
       (select array_agg(due_date order by seq_no)
               = array['2026-02-28', '2026-03-31', '2026-04-30']::date[]
        from private.build_schedule('2026-01-31'::date, 'late', 900, 300)) as pass;

-- لا يستحق قسط يوم التوقيع
select '8. nothing falls due on the signing day itself' as check,
       (select min(due_date) > '2026-01-10'::date
        from private.build_schedule('2026-01-10'::date, 'early', 900, 300)) as pass;

-- نافذة أُغلقت قبل التوقيع تنتقل للشهر التالي
select '9. a window already closed rolls to the next month' as check,
       (select min(due_date) = '2026-02-10'::date
        from private.build_schedule('2026-01-15'::date, 'early', 900, 300)) as pass;

-- النوافذ الثلاث تعطي ١٠ و٢٠ وآخر الشهر
select '10. the three windows close on day 10 / 20 / month-end' as check,
       (select private.window_due_day('early', '2026-03-15'::date) = '2026-03-10'::date
           and private.window_due_day('mid',   '2026-03-15'::date) = '2026-03-20'::date
           and private.window_due_day('late',  '2026-03-15'::date) = '2026-03-31'::date) as pass;

-- ---------------------------------------------------------------------------
-- الثابت الحاكم — لا انحراف بين الجدول والرصيد
-- ---------------------------------------------------------------------------
-- هذا هو الاختبار الذي يمنع الجدول من أن يصبح مصدر حقيقة ثانيًا للمال.
-- This is the test that stops the schedule becoming a second source of truth
-- for money: Σ amount_due must equal what the contract says is financed.
select '11. every contract with a balance has a schedule' as check,
       not exists (
         select 1 from public.contracts k
         where k.total_amount - k.down_payment > 0
           and not exists (select 1 from public.installments i where i.contract_id = k.id)
       ) as pass;

select '12. sum of installments equals total minus down, every contract' as check,
       not exists (
         select 1 from public.contracts k
         where coalesce(
                 (select sum(i.amount_due) from public.installments i where i.contract_id = k.id),
                 0
               ) <> k.total_amount - k.down_payment
       ) as pass;

select '13. every installment carries its contract''s org_id' as check,
       not exists (
         select 1 from public.installments i
         join public.contracts k on k.id = i.contract_id
         where i.org_id <> k.org_id
       ) as pass;

-- ---------------------------------------------------------------------------
-- المحفّز — عقد جديد يولّد جدوله تلقائيًا
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  v_cust uuid;
  v_contract uuid;
  v_count integer;
  v_sum numeric;
begin
  select org_id, id into v_org, v_cust from public.customers order by created_at limit 1;

  insert into public.contracts (
    org_id, customer_id, category, contract_start_date,
    payment_window, total_amount, down_payment, monthly_installment
  )
  values (v_org, v_cust, 'household', '2026-01-05', 'mid', 1300, 100, 300)
  returning id into v_contract;

  select count(*), coalesce(sum(amount_due), 0) into v_count, v_sum
  from public.installments where contract_id = v_contract;

  raise notice '14. insert trigger generated a schedule: %', (v_count = 4);
  raise notice '15. generated schedule sums to financed (1200): %', (v_sum = 1200);

  -- تعديل إجمالي العقد يعيد اشتقاق الجدول — وإلا بقي جدول قديم صامت
  -- Editing the contract total must re-derive the schedule. Without the UPDATE
  -- trigger this leaves a stale schedule and every downstream due-date figure
  -- is silently wrong.
  update public.contracts set total_amount = 2500 where id = v_contract;
  select count(*), coalesce(sum(amount_due), 0) into v_count, v_sum
  from public.installments where contract_id = v_contract;
  raise notice '16. editing total regenerates the schedule (8 rows): %', (v_count = 8);
  raise notice '17. regenerated schedule sums to new financed (2400): %', (v_sum = 2400);

  -- تسجيل دفعة يغيّر remaining_amount وحده، فلا يجوز أن يعيد بناء الجدول
  update public.contracts set monthly_installment = 300 where id = v_contract;
  select count(*) into v_count from public.installments where contract_id = v_contract;
  raise notice '18. schedule still intact after a no-op-shaped edit: %', (v_count = 8);

  -- حذف العقد يحذف جدوله تتابعيًا
  delete from public.contracts where id = v_contract;
  select count(*) into v_count from public.installments where contract_id = v_contract;
  raise notice '19. deleting a contract cascades to its installments: %', (v_count = 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- «متأخر» مشتق لا مخزّن
-- ---------------------------------------------------------------------------
select '20. overdue is not a storable status' as check,
       not exists (
         select 1 from pg_enum e
         join pg_type t on t.oid = e.enumtypid
         where t.typname = 'installment_status' and e.enumlabel = 'overdue'
       ) as pass;
