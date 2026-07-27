\pset pager off
\set QUIET on

-- محصّل داخل نفس مؤسسة المالك — يصل عبر مسار الدعوة (org_id في بيانات المستخدم)
-- A collector in the owner's org, arriving through the invite path: org_id in
-- user_metadata is what tells handle_new_user to join an existing org instead of
-- creating a new one.
do $$
declare v_org uuid;
begin
  select org_id into v_org from public.profiles where role = 'owner' order by created_at limit 1;

  insert into auth.users (id, email, raw_user_meta_data)
  values ('22222222-2222-2222-2222-222222222222', 'collector@example.com',
          jsonb_build_object('full_name', 'محصّل', 'org_id', v_org::text));

  insert into auth.users (id, email, raw_user_meta_data)
  values ('33333333-3333-3333-3333-333333333333', 'ex@example.com',
          jsonb_build_object('full_name', 'موقوف', 'org_id', v_org::text));
end;
$$;

update public.profiles set active = false where id = '33333333-3333-3333-3333-333333333333';

\set QUIET off

select 'P0 invited user joined the owner''s org as collector' as check,
       (select p.role = 'collector' and p.org_id = (
          select org_id from public.profiles where role = 'owner' order by created_at limit 1)
        from public.profiles p where p.id = '22222222-2222-2222-2222-222222222222') as pass;

-- حد المحصلين: الثالث مرفوض (max_collectors = 2، وواحد منهما موقوف فيُستثنى)
do $$
declare v_org uuid; v_blocked boolean := false;
begin
  select org_id into v_org from public.profiles where role = 'owner' order by created_at limit 1;
  -- المحصّل النشط الحالي واحد، لذا نرفع العدد إلى الحد ثم نتجاوزه
  update public.organizations set max_collectors = 1 where id = v_org;
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values ('44444444-4444-4444-4444-444444444444', 'extra@example.com',
            jsonb_build_object('full_name', 'زائد', 'org_id', v_org::text));
  exception when others then
    v_blocked := position('COLLECTOR_LIMIT_REACHED' in sqlerrm) > 0;
  end;
  update public.organizations set max_collectors = 2 where id = v_org;
  raise notice 'P1 collector limit enforced in the database: %', v_blocked;
end;
$$;

\echo ''
\echo '=========== COLLECTOR — append-only ==========='
set role authenticated;
set app.current_user_id = '22222222-2222-2222-2222-222222222222';

select 'R1 collector reads customers (expect >0)' as check, count(*) from public.customers;
select 'R2 collector reads contracts (expect >0)' as check, count(*) from public.contracts;
select 'R3 collector reads suppliers (expect 0)' as check, count(*) from public.suppliers;
select 'R4 collector reads capital (expect 0)' as check, count(*) from public.capital_entries;
select 'R5 collector reads invoices (expect 0)' as check, count(*) from public.supplier_invoices;
select 'R6 collector sees only own profile (expect 1)' as check, count(*) from public.profiles;

-- ما يستطيعه المحصّل: الإضافة
do $$
declare ok boolean := false; v_cust uuid;
begin
  insert into public.customers (full_name, known_as, phone, national_id, address)
  values ('عميل المحصّل', 'اختبار', '01099998888', '29912121234599', 'طنطا')
  returning id into v_cust;
  ok := v_cust is not null;
  raise notice 'R7 collector CAN add a customer: %', ok;

  insert into public.contracts
    (customer_id, category, contract_start_date, total_amount, down_payment, monthly_installment)
  values (v_cust, 'household', current_date, 5000, 1000, 400);
  raise notice 'R8 collector CAN add a contract: %', true;
exception when others then
  raise notice 'R7/R8 collector insert FAILED (should have worked): %', sqlerrm;
end;
$$;

do $$
declare ok boolean := false; v_id uuid; v_before numeric; v_after numeric;
begin
  select id, remaining_amount into v_id, v_before
  from public.contracts where remaining_amount > 100 order by created_at limit 1;

  insert into public.customer_payments (contract_id, amount, payment_date, collected_by)
  values (v_id, 100, current_date, '22222222-2222-2222-2222-222222222222');

  select remaining_amount into v_after from public.contracts where id = v_id;
  ok := (v_before - v_after = 100);
  raise notice 'R9 collector CAN record own payment and balance drops: %', ok;
end;
$$;

-- ما لا يستطيعه: أي تعديل أو حذف، في أي مكان
do $$
declare blocked boolean;
begin
  begin
    update public.customers set full_name = 'اختراق' where true;
    blocked := not found;
  exception when others then blocked := true;
  end;
  raise notice 'R10 collector CANNOT edit customers: %', blocked;
end; $$;

do $$
declare blocked boolean;
begin
  begin
    update public.contracts set total_amount = 1 where true;
    blocked := not found;
  exception when others then blocked := true;
  end;
  raise notice 'R11 collector CANNOT edit contracts: %', blocked;
end; $$;

do $$
declare blocked boolean;
begin
  begin
    update public.customer_payments set amount = 1 where true;
    blocked := not found;
  exception when others then blocked := true;
  end;
  raise notice 'R12 collector CANNOT edit past payments: %', blocked;
end; $$;

do $$
declare blocked boolean;
begin
  begin
    delete from public.customer_payments where true;
    blocked := not found;
  exception when others then blocked := true;
  end;
  raise notice 'R13 collector CANNOT delete payments: %', blocked;
end; $$;

do $$
declare blocked boolean;
begin
  begin
    delete from public.customers where true;
    blocked := not found;
  exception when others then blocked := true;
  end;
  raise notice 'R14 collector CANNOT delete customers: %', blocked;
end; $$;

do $$
declare blocked boolean := false;
begin
  begin
    insert into public.suppliers (name, trade_type, total_owed, monthly_payment)
    values ('تاجر مزيف', 'household', 1000, 100);
  exception when others then blocked := true;
  end;
  raise notice 'R15 collector CANNOT add suppliers: %', blocked;
end; $$;

do $$
declare blocked boolean := false; v_id uuid;
begin
  select id into v_id from public.contracts where remaining_amount > 100 limit 1;
  begin
    insert into public.customer_payments (contract_id, amount, payment_date, collected_by)
    values (v_id, 50, current_date, '11111111-1111-1111-1111-111111111111');
  exception when others then blocked := true;
  end;
  raise notice 'R16 collector CANNOT attribute a payment to someone else: %', blocked;
end; $$;

\echo ''
\echo '=========== SUSPENDED / ANONYMOUS ==========='
set app.current_user_id = '33333333-3333-3333-3333-333333333333';
select 'R17 suspended reads customers (expect 0)' as check, count(*) from public.customers;

set app.current_user_id = '';
select 'R18 no session reads customers (expect 0)' as check, count(*) from public.customers;

\echo ''
\echo '=========== OWNER — full access inside own org ==========='
set app.current_user_id = '11111111-1111-1111-1111-111111111111';
select 'R19 owner reads suppliers (expect 3)' as check, count(*) from public.suppliers;
select 'R20 owner reads capital (expect 3)' as check, count(*) from public.capital_entries;
select 'R21 owner reads org team (expect 3)' as check, count(*) from public.profiles;
select 'R22 owner reads own organization (expect 1)' as check, count(*) from public.organizations;

do $$
declare ok boolean := false;
begin
  update public.customers set legal_status = 'in_litigation'
  where id = (select id from public.customers order by full_name limit 1);
  ok := found;
  raise notice 'R23 owner CAN edit customers: %', ok;
end; $$;

do $$
declare ok boolean := false;
begin
  delete from public.customer_payments
  where id = (select id from public.customer_payments order by created_at desc limit 1);
  ok := found;
  raise notice 'R24 owner CAN delete a payment: %', ok;
end; $$;

reset role;
