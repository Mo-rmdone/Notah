\pset pager off
\set QUIET on

-- Add a collector alongside the existing owner.
insert into auth.users (id, email, raw_user_meta_data)
values ('22222222-2222-2222-2222-222222222222', 'collector@example.com', '{"full_name":"محصّل"}'::jsonb);

-- A suspended user, to prove `active` is enforced.
insert into auth.users (id, email, raw_user_meta_data)
values ('33333333-3333-3333-3333-333333333333', 'ex@example.com', '{"full_name":"موقوف"}'::jsonb);
update public.profiles set active = false where id = '33333333-3333-3333-3333-333333333333';

\set QUIET off
\echo ''
\echo '=========== COLLECTOR (should be limited) ==========='
set role authenticated;
set app.current_user_id = '22222222-2222-2222-2222-222222222222';

select 'R1 collector reads customers (expect >0)' as check, count(*) from public.customers;
select 'R2 collector reads suppliers (expect 0)' as check, count(*) from public.suppliers;
select 'R3 collector reads capital (expect 0)' as check, count(*) from public.capital_entries;
select 'R4 collector reads invoices (expect 0)' as check, count(*) from public.supplier_invoices;
select 'R5 collector sees only own profile (expect 1)' as check, count(*) from public.profiles;

-- writes that must fail
do $$
declare blocked boolean;
begin
  begin
    update public.customers set full_name = 'اختراق' where true;
    blocked := not found; -- zero rows updated also counts as blocked
  exception when others then blocked := true;
  end;
  raise notice 'R6 collector CANNOT edit customers: %', blocked;
end; $$;

do $$
declare blocked boolean;
begin
  begin
    delete from public.customer_payments where true;
    blocked := not found;
  exception when others then blocked := true;
  end;
  raise notice 'R7 collector CANNOT delete payments: %', blocked;
end; $$;

do $$
declare blocked boolean := false;
begin
  begin
    insert into public.suppliers (name, trade_type, total_owed, monthly_payment)
    values ('تاجر مزيف', 'household', 1000, 100);
  exception when others then blocked := true;
  end;
  raise notice 'R8 collector CANNOT add suppliers: %', blocked;
end; $$;

-- attributing a payment to someone else must fail
do $$
declare blocked boolean := false; v_id uuid;
begin
  select id into v_id from public.customers where remaining_amount > 100 limit 1;
  begin
    insert into public.customer_payments (customer_id, amount, payment_date, collected_by)
    values (v_id, 50, current_date, '11111111-1111-1111-1111-111111111111');
  exception when others then blocked := true;
  end;
  raise notice 'R9 collector CANNOT attribute payment to another user: %', blocked;
end; $$;

-- the one write a collector SHOULD be able to do
do $$
declare ok boolean := false; v_id uuid; v_before numeric; v_after numeric;
begin
  select id, remaining_amount into v_id, v_before from public.customers where remaining_amount > 100 limit 1;
  insert into public.customer_payments (customer_id, amount, payment_date, collected_by)
  values (v_id, 100, current_date, '22222222-2222-2222-2222-222222222222');
  select remaining_amount into v_after from public.customers where id = v_id;
  ok := (v_before - v_after = 100);
  raise notice 'R10 collector CAN record own payment and balance drops: %', ok;
end; $$;

\echo ''
\echo '=========== SUSPENDED USER (should see nothing) ==========='
set app.current_user_id = '33333333-3333-3333-3333-333333333333';
select 'R11 suspended reads customers (expect 0)' as check, count(*) from public.customers;

\echo ''
\echo '=========== ANONYMOUS (should see nothing) ==========='
set app.current_user_id = '';
select 'R12 no session reads customers (expect 0)' as check, count(*) from public.customers;

\echo ''
\echo '=========== OWNER (full access) ==========='
set app.current_user_id = '11111111-1111-1111-1111-111111111111';
select 'R13 owner reads suppliers (expect 3)' as check, count(*) from public.suppliers;
select 'R14 owner reads capital (expect 3)' as check, count(*) from public.capital_entries;
select 'R15 owner reads all profiles (expect 3)' as check, count(*) from public.profiles;

do $$
declare ok boolean := false;
begin
  update public.customers set legal_status = 'in_litigation'
  where id = (select id from public.customers order by full_name limit 1);
  ok := found;
  raise notice 'R16 owner CAN edit customers: %', ok;
end; $$;

reset role;
