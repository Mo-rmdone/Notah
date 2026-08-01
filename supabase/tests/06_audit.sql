\set ON_ERROR_STOP on
\pset pager off

-- =============================================================================
-- 06_audit.sql — سجل التدقيق
-- =============================================================================

do $$
declare
  v_org uuid; v_cust uuid; v_contract uuid; v_pay uuid;
  v_n integer; v_before numeric; v_after numeric; v_action text;
begin
  select org_id into v_org from public.profiles where role = 'owner' order by created_at limit 1;

  insert into public.customers (org_id, full_name, known_as, phone, national_id, address)
  values (v_org, 'عميل التدقيق', 'دقيق', '01000000096', '29001010100096', 'ت')
  returning id into v_cust;

  select count(*) into v_n from public.audit_log
  where entity_type = 'customers' and entity_id = v_cust and action = 'INSERT';
  raise notice 'D1 creating a customer is audited: %', (v_n = 1);

  insert into public.contracts (org_id, customer_id, category, contract_start_date,
    payment_window, total_amount, down_payment, monthly_installment)
  values (v_org, v_cust, 'household', '2026-01-05', 'mid', 3000, 0, 1000)
  returning id into v_contract;

  insert into public.customer_payments (org_id, contract_id, amount, payment_date)
  values (v_org, v_contract, 500, '2026-01-20') returning id into v_pay;

  select count(*) into v_n from public.audit_log
  where entity_type = 'customer_payments' and entity_id = v_pay and action = 'INSERT';
  raise notice 'D2 recording a payment is audited: %', (v_n = 1);

  -- تعديل مبلغ دفعة يحفظ القيمة قبل وبعد
  update public.customer_payments set amount = 700 where id = v_pay;

  select (before_json ->> 'amount')::numeric, (after_json ->> 'amount')::numeric
  into v_before, v_after
  from public.audit_log
  where entity_type = 'customer_payments' and entity_id = v_pay and action = 'UPDATE';

  raise notice 'D3 an edit records the value before it (500): %', (v_before = 500);
  raise notice 'D4 an edit records the value after it (700): %', (v_after = 700);

  -- الحذف يحفظ الصف كاملًا قبل اختفائه — وهو الغرض كله
  delete from public.customer_payments where id = v_pay;

  select action, (before_json ->> 'amount')::numeric into v_action, v_before
  from public.audit_log
  where entity_type = 'customer_payments' and entity_id = v_pay and action = 'DELETE';

  raise notice 'D5 a deletion is audited: %', (v_action = 'DELETE');
  raise notice 'D6 the deleted row survives in before_json (700): %', (v_before = 700);

  -- الأثر باقٍ بعد اختفاء الدفعة نفسها
  select count(*) into v_n from public.customer_payments where id = v_pay;
  raise notice 'D7 the payment is really gone: %', (v_n = 0);
  select count(*) into v_n from public.audit_log where entity_id = v_pay;
  raise notice 'D8 but its full history remains (3 rows): %', (v_n = 3);
end;
$$;

-- ---------------------------------------------------------------------------
-- عدم القابلية للتعديل · immutability
-- ---------------------------------------------------------------------------
select 'E1. no client INSERT/UPDATE/DELETE policy exists on audit_log' as check,
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'audit_log'
           and cmd <> 'SELECT'
       ) as pass;

select 'E2. authenticated holds no write grant on audit_log' as check,
       not exists (
         select 1 from information_schema.role_table_grants
         where table_schema = 'public' and table_name = 'audit_log'
           and grantee = 'authenticated'
           and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
       ) as pass;

select 'E3. anon holds no grant at all on audit_log' as check,
       not exists (
         select 1 from information_schema.role_table_grants
         where table_schema = 'public' and table_name = 'audit_log' and grantee = 'anon'
       ) as pass;

-- كل صف تدقيق يحمل مؤسسته · every audit row is tenant-scoped
select 'E4. every audit row carries an org_id' as check,
       not exists (select 1 from public.audit_log where org_id is null) as pass;

-- المالك يقرأ، والمحصّل لا · owner reads, collector does not
set role authenticated;
set app.current_user_id = '22222222-2222-2222-2222-222222222222';  -- collector
select 'E5. a collector reads no audit rows' as check,
       (select count(*) = 0 from public.audit_log) as pass;

set app.current_user_id = '11111111-1111-1111-1111-111111111111';  -- owner
select 'E6. the owner reads their org''s audit trail' as check,
       (select count(*) > 0 from public.audit_log) as pass;

-- المالك نفسه لا يستطيع محو أثره · even the owner cannot erase their tracks
do $$
declare v_blocked boolean := false;
begin
  begin
    delete from public.audit_log where true;
    v_blocked := not found;
  exception when others then v_blocked := true;
  end;
  raise notice 'E7 even the owner cannot delete audit rows: %', v_blocked;

  begin
    update public.audit_log set action = 'INSERT' where true;
    v_blocked := not found;
  exception when others then v_blocked := true;
  end;
  raise notice 'E8 even the owner cannot rewrite audit rows: %', v_blocked;
end;
$$;

reset role;
set app.current_user_id = '';
