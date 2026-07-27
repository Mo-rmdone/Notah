\set ON_ERROR_STOP on
\pset pager off

-- التسجيل الذاتي: handle_new_user ينشئ مؤسسة ويجعل المستخدم مالكها.
-- Self-signup: handle_new_user must create an organization and make this user
-- its owner. Before tenancy it hardcoded role = 'collector', which would have
-- left every signing-up shop owner with no organization at all.
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'owner@example.com',
        '{"full_name":"المالك","shop_name":"محل الاختبار"}'::jsonb);

select '1. signup created a profile' as check,
       (select count(*) = 1 from public.profiles) as pass;
select '2. signup created an organization' as check,
       (select count(*) = 1 from public.organizations) as pass;
select '3. signup user is owner with an org' as check,
       (select role = 'owner' and org_id is not null
        from public.profiles where id = '11111111-1111-1111-1111-111111111111') as pass;
select '4. org name came from shop_name' as check,
       (select name = 'محل الاختبار' from public.organizations) as pass;

\echo '--- running seed.sql ---'
\i /tmp/seed.sql

select '5. seed inserted 10 customers' as check,
       (select count(*) = 10 from public.customers) as pass;
select '6. seed inserted 11 contracts' as check,
       (select count(*) = 11 from public.contracts) as pass;
select '7. seed inserted 3 suppliers' as check,
       (select count(*) = 3 from public.suppliers) as pass;

-- عميل واحد بعقدين — الحالة التي فُصل الجدول من أجلها
select '8. one customer holds two contracts' as check,
       (select count(*) = 2 from public.contracts k
        join public.customers c on c.id = k.customer_id
        where c.full_name = 'أحمد محمد السيد') as pass;

select '9. every row carries an org_id' as check,
       (select count(*) = 0 from (
          select 1 from public.customers where org_id is null
          union all select 1 from public.contracts where org_id is null
          union all select 1 from public.customer_payments where org_id is null
          union all select 1 from public.suppliers where org_id is null
          union all select 1 from public.capital_entries where org_id is null
        ) t) as pass;

-- المتبقي = الإجمالي - المقدم - مجموع الدفعات، لكل عقد
select '10. contract remaining matches ledger' as check,
       not exists (
         select 1 from public.contracts k
         where k.remaining_amount <> k.total_amount - k.down_payment
           - coalesce((select sum(amount) from public.customer_payments p where p.contract_id = k.id), 0)
       ) as pass;

select '11. supplier remaining matches ledger' as check,
       not exists (
         select 1 from public.suppliers s
         where s.remaining_amount <> s.total_owed
           - coalesce((select sum(amount) from public.supplier_payments p where p.supplier_id = s.id), 0)
       ) as pass;

-- الدفعة الأكبر من المتبقي مرفوضة
do $$
declare
  v_id uuid; v_org uuid; v_remaining numeric; v_rejected boolean := false;
begin
  select id, org_id, remaining_amount into v_id, v_org, v_remaining
  from public.contracts order by created_at limit 1;
  begin
    insert into public.customer_payments (org_id, contract_id, amount, payment_date)
    values (v_org, v_id, v_remaining + 1, current_date);
  exception when others then
    v_rejected := position('PAYMENT_EXCEEDS_REMAINING' in sqlerrm) > 0;
  end;
  raise notice '12. overpayment rejected: %', v_rejected;
end;
$$;

-- الإضافة تخصم والحذف يعيد
do $$
declare
  v_id uuid; v_org uuid; v_before numeric; v_after numeric; v_restored numeric; v_pay uuid;
begin
  select id, org_id, remaining_amount into v_id, v_org, v_before
  from public.contracts where remaining_amount > 500 order by created_at limit 1;

  insert into public.customer_payments (org_id, contract_id, amount, payment_date)
  values (v_org, v_id, 500, current_date) returning id into v_pay;
  select remaining_amount into v_after from public.contracts where id = v_id;

  delete from public.customer_payments where id = v_pay;
  select remaining_amount into v_restored from public.contracts where id = v_id;

  raise notice '13. insert deducts 500: %', (v_before - v_after = 500);
  raise notice '14. delete restores: %', (v_restored = v_before);
end;
$$;

-- تعديل الإجمالي يعيد الحساب ولا يثق بما أرسله العميل
do $$
declare
  v_id uuid; v_paid numeric; v_remaining numeric;
begin
  select k.id into v_id
  from public.contracts k join public.customers c on c.id = k.customer_id
  where c.full_name = 'أحمد محمد السيد' and k.category = 'appliances';

  select coalesce(sum(amount), 0) into v_paid
  from public.customer_payments where contract_id = v_id;

  update public.contracts set total_amount = 20000, remaining_amount = 999999 where id = v_id;
  select remaining_amount into v_remaining from public.contracts where id = v_id;

  raise notice '15. update ignores client remaining, recomputes (%): %',
    v_remaining, (v_remaining = 20000 - 3000 - v_paid);
end;
$$;

-- نقل الدفعة إلى عقد آخر مرفوض
do $$
declare
  v_pay uuid; v_other uuid; v_rejected boolean := false;
begin
  select id into v_pay from public.customer_payments order by created_at limit 1;
  select id into v_other from public.contracts order by created_at desc limit 1;
  begin
    update public.customer_payments set contract_id = v_other where id = v_pay;
  exception when others then
    v_rejected := position('PAYMENT_CONTRACT_IMMUTABLE' in sqlerrm) > 0;
  end;
  raise notice '16. payment cannot move between contracts: %', v_rejected;
end;
$$;

-- org_id مجمّد بعد الإنشاء
do $$
declare
  v_id uuid; v_rejected boolean := false;
begin
  select id into v_id from public.customers order by full_name limit 1;
  begin
    update public.customers set org_id = gen_random_uuid() where id = v_id;
  exception when others then
    v_rejected := position('ORG_IMMUTABLE' in sqlerrm) > 0;
  end;
  raise notice '17. org_id is frozen after insert: %', v_rejected;
end;
$$;

\echo '--- RPCs ---'
select '18. dashboard_summary' as check, * from public.dashboard_summary();
select '19. collections_by_category' as check, * from public.collections_by_category();
select '20. daily_collections rows (expect 30)' as check, count(*) as rows from public.daily_collections(30);
select '21. today_payments rows' as check, count(*) as rows from public.today_payments();

select '22. customer_performance (5 months)' as check, month_start, expected, paid, status
from public.customer_performance((select id from public.customers where full_name = 'أحمد محمد السيد'));

select '23. performance for defaulter shows missed' as check, month_start, paid, status
from public.customer_performance((select id from public.customers where full_name = 'ياسر عبد الله سالم'));

select '24. capital = deposits - withdrawals' as check,
       (select total_capital from public.dashboard_summary()) = 250000 + 50000 - 20000 as pass;
