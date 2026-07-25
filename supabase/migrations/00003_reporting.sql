-- =============================================================================
-- 00003_reporting.sql — دوال التقارير (reporting RPCs)
-- All functions are SECURITY INVOKER so RLS keeps applying: a collector calling
-- an owner-only aggregate simply gets zeros/empty sets.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- dashboard_summary — أرقام الصفحة الرئيسية
-- ---------------------------------------------------------------------------
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
      from public.customers
      where archived_at is null
    ) as total_outstanding,
    (select coalesce(sum(remaining_amount), 0) from public.suppliers) as total_owed_suppliers;
$$;

-- ---------------------------------------------------------------------------
-- collections_by_category — التحصيل حسب نوع البضاعة (pie chart)
-- ---------------------------------------------------------------------------
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
  select c.category, coalesce(sum(p.amount), 0) as total
  from public.customers c
  join public.customer_payments p on p.customer_id = c.id
  group by c.category
  order by c.category;
$$;

-- ---------------------------------------------------------------------------
-- daily_collections — التحصيل اليومي لآخر n يوم (bar chart)
-- ---------------------------------------------------------------------------
create or replace function public.daily_collections(p_days integer default 30)
returns table (
  day date,
  total numeric(12, 2)
)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.day::date, coalesce(sum(p.amount), 0) as total
  from generate_series(
    current_date - (greatest(p_days, 1) - 1),
    current_date,
    interval '1 day'
  ) as d(day)
  left join public.customer_payments p on p.payment_date = d.day::date
  group by d.day
  order by d.day;
$$;

-- ---------------------------------------------------------------------------
-- customer_performance — أداء العميل في آخر 5 شهور
-- status: paid / partial / missed, or na for months before enrollment
-- and months after the balance was settled.
-- ---------------------------------------------------------------------------
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
  select
    m.month_start::date,
    c.monthly_installment as expected,
    coalesce(sum(p.amount), 0) as paid,
    case
      when m.month_start < date_trunc('month', c.created_at) then 'na'
      when coalesce(sum(p.amount), 0) >= c.monthly_installment then 'paid'
      when coalesce(sum(p.amount), 0) > 0 then 'partial'
      when c.remaining_amount = 0 then 'na' -- settled: nothing was due
      else 'missed'
    end as status
  from public.customers c
  cross join generate_series(
    date_trunc('month', current_date) - interval '4 months',
    date_trunc('month', current_date),
    interval '1 month'
  ) as m(month_start)
  left join public.customer_payments p
    on p.customer_id = c.id
    and date_trunc('month', p.payment_date::timestamp) = m.month_start
  where c.id = p_customer_id
  group by m.month_start, c.monthly_installment, c.created_at, c.remaining_amount
  order by m.month_start;
$$;

-- ---------------------------------------------------------------------------
-- today_payments — دفعات اليوم مع اسم العميل والمحصل (dashboard table)
-- ---------------------------------------------------------------------------
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
  join public.customers c on c.id = p.customer_id
  left join public.profiles pr on pr.id = p.collected_by
  where p.payment_date = current_date
  order by p.created_at desc;
$$;
