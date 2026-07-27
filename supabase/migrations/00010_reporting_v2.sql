-- =============================================================================
-- 00010_reporting_v2.sql — تحديث دوال التقارير بعد فصل العقود
-- =============================================================================
-- دوال 00003 كانت تقرأ customers.remaining_amount و customer_payments.customer_id
-- وكلاهما انتقل في 00007. أجسام دوال SQL النصية لا تتتبع التبعيات، فحذف الأعمدة
-- ينجح بصمت ويترك الدوال معطوبة حتى أول استدعاء — لذلك تُعاد كتابتها هنا.
--
-- The 00003 functions read customers.remaining_amount and
-- customer_payments.customer_id, both of which moved in 00007. Postgres does not
-- track dependencies through string-bodied SQL functions, so dropping those
-- columns succeeds silently and leaves the functions broken until first call.
-- Rewriting them here is what keeps that from happening.
--
-- كلها security invoker، لذا تُطبَّق سياسات 00008 تلقائيًا وتصبح كل الأرقام
-- محصورة في مؤسسة المستخدم دون أي شرط org_id مكتوب يدويًا.
-- All remain SECURITY INVOKER, so the 00008 policies apply inside them and every
-- figure is automatically scoped to the caller's own organization — no manual
-- org_id predicate needed, and no way to forget one.

create or replace function public.dashboard_summary()
returns table (
  total_capital numeric(12, 2),
  total_collected numeric(12, 2),
  collected_today numeric(12, 2),
  collected_this_month numeric(12, 2),
  total_outstanding numeric(12, 2),
  total_owed_suppliers numeric(12, 2)
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (
      select coalesce(sum(case when entry_type = 'deposit' then amount else -amount end), 0)
      from public.capital_entries
    ) as total_capital,
    (select coalesce(sum(amount), 0) from public.customer_payments) as total_collected,
    (
      select coalesce(sum(amount), 0)
      from public.customer_payments
      where payment_date = current_date
    ) as collected_today,
    (
      select coalesce(sum(amount), 0)
      from public.customer_payments
      where payment_date >= date_trunc('month', current_date)::date
    ) as collected_this_month,
    (
      select coalesce(sum(remaining_amount), 0)
      from public.contracts
      where archived_at is null
    ) as total_outstanding,
    (select coalesce(sum(remaining_amount), 0) from public.suppliers) as total_owed_suppliers;
$$;

create or replace function public.collections_by_category()
returns table (
  category public.product_category,
  total numeric(12, 2)
)
language sql
stable
security invoker
set search_path = ''
as $$
  select k.category, coalesce(sum(p.amount), 0) as total
  from public.contracts k
  join public.customer_payments p on p.contract_id = k.id
  group by k.category
  order by k.category;
$$;

-- انتظام العميل عبر كل عقوده مجتمعة · a customer's performance across all of
-- their contracts combined. Phase 4 replaces this with the weighted credit
-- score; this keeps the existing widget working through the schema split.
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
    ) as month_start
  ),
  due as (
    select
      m.month_start,
      coalesce(sum(k.monthly_installment) filter (
        where date_trunc('month', k.contract_start_date::timestamp) <= m.month_start
      ), 0) as expected,
      bool_or(k.remaining_amount = 0) as any_settled
    from months m
    left join public.contracts k on k.customer_id = p_customer_id
    group by m.month_start
  ),
  got as (
    select
      m.month_start,
      coalesce(sum(p.amount), 0) as paid
    from months m
    left join public.contracts k on k.customer_id = p_customer_id
    left join public.customer_payments p
      on p.contract_id = k.id
      and date_trunc('month', p.payment_date::timestamp) = m.month_start
    group by m.month_start
  )
  select
    d.month_start::date,
    d.expected,
    g.paid,
    case
      when d.expected = 0 then 'na'
      when g.paid >= d.expected then 'paid'
      when g.paid > 0 then 'partial'
      when d.any_settled then 'na'
      else 'missed'
    end as status
  from due d
  join got g on g.month_start = d.month_start
  order by d.month_start;
$$;

create or replace function public.today_payments()
returns table (
  id uuid,
  customer_id uuid,
  customer_name text,
  amount numeric(12, 2),
  collector_name text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    c.id as customer_id,
    c.full_name as customer_name,
    p.amount,
    coalesce(pr.full_name, '—') as collector_name,
    p.created_at
  from public.customer_payments p
  join public.contracts k on k.id = p.contract_id
  join public.customers c on c.id = k.customer_id
  left join public.profiles pr on pr.id = p.collected_by
  where p.payment_date = current_date
  order by p.created_at desc;
$$;

grant execute on function public.dashboard_summary() to authenticated;
grant execute on function public.collections_by_category() to authenticated;
grant execute on function public.customer_performance(uuid) to authenticated;
grant execute on function public.today_payments() to authenticated;

revoke execute on function public.dashboard_summary() from anon;
revoke execute on function public.collections_by_category() from anon;
revoke execute on function public.customer_performance(uuid) from anon;
revoke execute on function public.today_payments() from anon;
