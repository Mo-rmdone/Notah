\set ON_ERROR_STOP on
\pset pager off

-- Create an owner so the seed script has someone to attribute rows to.
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'owner@example.com', '{"full_name":"المالك"}'::jsonb);

update public.profiles set role = 'owner', full_name = 'المالك'
where id = '11111111-1111-1111-1111-111111111111';

select '1. handle_new_user created a profile' as check,
       (select count(*) = 1 from public.profiles) as pass;

\echo '--- running seed.sql ---'
\i /tmp/seed.sql

select '2. seed inserted 10 customers' as check,
       (select count(*) = 10 from public.customers) as pass;
select '3. seed inserted 3 suppliers' as check,
       (select count(*) = 3 from public.suppliers) as pass;

-- remaining must equal total - down - sum(payments) for every customer
select '4. customer remaining matches ledger' as check,
       not exists (
         select 1 from public.customers c
         where c.remaining_amount <> c.total_amount - c.down_payment
           - coalesce((select sum(amount) from public.customer_payments p where p.customer_id = c.id), 0)
       ) as pass;

select '5. supplier remaining matches ledger' as check,
       not exists (
         select 1 from public.suppliers s
         where s.remaining_amount <> s.total_owed
           - coalesce((select sum(amount) from public.supplier_payments p where p.supplier_id = s.id), 0)
       ) as pass;

-- overpayment must be rejected
do $$
declare
  v_id uuid;
  v_remaining numeric;
  v_rejected boolean := false;
begin
  select id, remaining_amount into v_id, v_remaining from public.customers order by full_name limit 1;
  begin
    insert into public.customer_payments (customer_id, amount, payment_date)
    values (v_id, v_remaining + 1, current_date);
  exception when others then
    v_rejected := position('PAYMENT_EXCEEDS_REMAINING' in sqlerrm) > 0;
  end;
  raise notice '6. overpayment rejected: %', v_rejected;
end;
$$;

-- payment deducts, delete restores
do $$
declare
  v_id uuid;
  v_before numeric; v_after numeric; v_restored numeric;
  v_pay uuid;
begin
  select id, remaining_amount into v_id, v_before from public.customers where remaining_amount > 500 order by full_name limit 1;
  insert into public.customer_payments (customer_id, amount, payment_date)
  values (v_id, 500, current_date) returning id into v_pay;
  select remaining_amount into v_after from public.customers where id = v_id;
  delete from public.customer_payments where id = v_pay;
  select remaining_amount into v_restored from public.customers where id = v_id;
  raise notice '7. insert deducts 500: %', (v_before - v_after = 500);
  raise notice '8. delete restores: %', (v_restored = v_before);
end;
$$;

-- editing a customer's total recomputes remaining rather than trusting the client
do $$
declare
  v_id uuid; v_paid numeric; v_remaining numeric;
begin
  select id into v_id from public.customers where full_name = 'أحمد محمد السيد';
  select coalesce(sum(amount),0) into v_paid from public.customer_payments where customer_id = v_id;
  update public.customers set total_amount = 20000, remaining_amount = 999999 where id = v_id;
  select remaining_amount into v_remaining from public.customers where id = v_id;
  raise notice '9. update ignores client remaining, recomputes (%): %',
    v_remaining, (v_remaining = 20000 - 3000 - v_paid);
end;
$$;

\echo '--- RPCs ---'
select '10. dashboard_summary' as check, * from public.dashboard_summary();
select '11. collections_by_category' as check, * from public.collections_by_category();
select '12. daily_collections rows (expect 30)' as check, count(*) as rows from public.daily_collections(30);
select '13. today_payments rows' as check, count(*) as rows from public.today_payments();

select '14. customer_performance (5 months)' as check, month_start, expected, paid, status
from public.customer_performance((select id from public.customers where full_name = 'أحمد محمد السيد'));

select '15. performance for defaulter shows missed' as check, month_start, paid, status
from public.customer_performance((select id from public.customers where full_name = 'ياسر عبد الله سالم'));

-- capital is derived, not stored
select '16. capital = deposits - withdrawals' as check,
       (select total_capital from public.dashboard_summary()) = 250000 + 50000 - 20000 as pass;
