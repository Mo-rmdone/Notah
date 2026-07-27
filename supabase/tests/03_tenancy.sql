\pset pager off
\set QUIET on

-- =============================================================================
-- بوابة العزل بين المؤسسات — لا يُشحن شيء قبل نجاح كل فحص هنا
-- The cross-tenant isolation gate. Nothing ships until every check below passes.
--
-- كل الفحوص تجري بدور `authenticated`، لأن الدور الخارق يتجاوز RLS تمامًا وكان
-- سيجعل كل فحص ينجح كذبًا.
-- Every assertion runs as `authenticated`, never the superuser: service_role
-- bypasses RLS entirely and would make all of these pass falsely.
--
-- المعرفات تُلتقط هنا بدور خارق قبل تبديل الدور. لو قرأناها لاحقًا من profiles
-- لأعادت NULL (لأن RLS تخفي ملف المالك الآخر)، وعندها يصبح شرط `org_id = NULL`
-- بلا مطابقات وتنجح كل فحوص العزل زورًا. هذا الالتقاط المسبق هو ما يمنع ذلك.
--
-- The org ids are captured HERE, as superuser, before switching roles. Reading
-- them later from profiles would return NULL — RLS hides the other owner's
-- profile — and `org_id = NULL` matches nothing, so every isolation check below
-- would pass vacuously while proving nothing.
-- =============================================================================

insert into auth.users (id, email, raw_user_meta_data)
values ('55555555-5555-5555-5555-555555555555', 'owner2@example.com',
        '{"full_name":"مالك الثاني","shop_name":"المحل الثاني"}'::jsonb);

-- تُخزَّن المعرفات في متغيرات جلسة لا في جدول مؤقت: الجدول المؤقت يعيش في
-- pg_temp ويحتاج منح صلاحيات بعد تبديل الدور، ومتغيرات الجلسة تعبر تبديل الدور
-- بلا أي صلاحيات.
-- Stashed in session GUCs rather than a temp table: a temp table lives in
-- pg_temp and needs grants after SET ROLE, while session settings survive the
-- role switch with no permissions involved at all.
select set_config('fx.org1',
  (select org_id::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'), false);
select set_config('fx.org2',
  (select org_id::text from public.profiles where id = '55555555-5555-5555-5555-555555555555'), false);
select set_config('fx.cust1',
  (select id::text from public.customers where full_name = 'أحمد محمد السيد'), false);
select set_config('fx.shop1_payments',
  (select count(*)::text from public.customer_payments), false);

-- لو جاء أي معرّف فارغًا لأصبحت كل فحوص العزل تنجح زورًا (شرط org_id = NULL لا
-- يطابق شيئًا)، لذلك نتوقف هنا صراحة.
-- If any fixture were empty, every isolation check below would pass vacuously
-- because `org_id = NULL` matches nothing. Fail loudly here instead.
do $$
begin
  if coalesce(current_setting('fx.org1', true), '') = ''
     or coalesce(current_setting('fx.org2', true), '') = ''
     or coalesce(current_setting('fx.cust1', true), '') = ''
     or current_setting('fx.org1') = current_setting('fx.org2') then
    raise exception 'FIXTURES_INVALID: the isolation gate cannot run — org/customer ids are missing or identical';
  end if;
end;
$$;

insert into storage.objects (bucket_id, name) values
  ('national-ids', current_setting('fx.org1') || '/card-a.jpg'),
  ('national-ids', current_setting('fx.org2') || '/card-b.jpg'),
  ('supplier-invoices', current_setting('fx.org1') || '/inv-a.pdf');

\set QUIET off

select 'T0 second signup created its own organization' as check,
       (select count(*) = 2 from public.organizations) as pass;
select 'T0b the two orgs are actually different' as check,
       (current_setting('fx.org1') <> current_setting('fx.org2')) as pass;

\echo ''
\echo '=========== SHOP 2 builds its own data ==========='
set role authenticated;
set app.current_user_id = '55555555-5555-5555-5555-555555555555';

do $$
declare v_cust uuid; v_contract uuid;
begin
  insert into public.customers (full_name, known_as, phone, national_id, address)
  values ('عميل المحل الثاني', 'ثانٍ', '01055554444', '29001019999999', 'الإسكندرية')
  returning id into v_cust;

  insert into public.contracts
    (customer_id, category, contract_start_date, total_amount, down_payment, monthly_installment)
  values (v_cust, 'furniture', current_date, 8000, 1000, 500)
  returning id into v_contract;

  insert into public.customer_payments (contract_id, amount, payment_date, collected_by)
  values (v_contract, 500, current_date, '55555555-5555-5555-5555-555555555555');

  insert into public.suppliers (name, trade_type, total_owed, monthly_payment)
  values ('مورد المحل الثاني', 'furniture', 20000, 2000);

  insert into public.capital_entries (amount, entry_type, entry_date)
  values (10000, 'deposit', current_date);
end;
$$;

select 'T1 shop 2 sees ONLY its own 1 customer' as check,
       (select count(*) = 1 from public.customers) as pass;
select 'T2 shop 2 sees ONLY its own 1 contract' as check,
       (select count(*) = 1 from public.contracts) as pass;
select 'T3 shop 2 sees ONLY its own 1 payment' as check,
       (select count(*) = 1 from public.customer_payments) as pass;
select 'T4 shop 2 sees ONLY its own 1 supplier' as check,
       (select count(*) = 1 from public.suppliers) as pass;
select 'T5 shop 2 sees ONLY its own 1 capital entry' as check,
       (select count(*) = 1 from public.capital_entries) as pass;
select 'T6 shop 2 sees ONLY its own organization' as check,
       (select count(*) = 1 from public.organizations) as pass;
select 'T7 shop 2 sees ONLY its own profile' as check,
       (select count(*) = 1 from public.profiles) as pass;

-- الدوال security invoker، فالأرقام المجمّعة معزولة تلقائيًا
select 'T8 shop 2 dashboard totals are its own (capital = 10000)' as check,
       (select total_capital = 10000 from public.dashboard_summary()) as pass;

\echo ''
\echo '--- shop 2 attacking shop 1 (every attempt must fail) ---'

do $$
declare v_org1 uuid; n integer;
begin
  v_org1 := current_setting('fx.org1')::uuid;

  select count(*) into n from public.customers where org_id = v_org1;
  raise notice 'T9  cannot READ shop 1 customers (expect 0): %', n;

  select count(*) into n from public.contracts where org_id = v_org1;
  raise notice 'T10 cannot READ shop 1 contracts (expect 0): %', n;

  select count(*) into n from public.customer_payments where org_id = v_org1;
  raise notice 'T11 cannot READ shop 1 payments (expect 0): %', n;

  select count(*) into n from public.supplier_invoices where org_id = v_org1;
  raise notice 'T12 cannot READ shop 1 invoices (expect 0): %', n;

  select count(*) into n from public.profiles where org_id = v_org1;
  raise notice 'T13 cannot READ shop 1 team (expect 0): %', n;
end;
$$;

do $$
declare v_cust1 uuid; blocked boolean;
begin
  v_cust1 := current_setting('fx.cust1')::uuid;
  begin
    update public.customers set full_name = 'اختراق' where id = v_cust1;
    blocked := not found;
  exception when others then blocked := true;
  end;
  raise notice 'T14 cannot UPDATE a shop 1 customer by id: %', blocked;
end; $$;

do $$
declare v_cust1 uuid; blocked boolean;
begin
  v_cust1 := current_setting('fx.cust1')::uuid;
  begin
    delete from public.customers where id = v_cust1;
    blocked := not found;
  exception when others then blocked := true;
  end;
  raise notice 'T15 cannot DELETE a shop 1 customer by id: %', blocked;
end; $$;

-- عقد يشير إلى عميل من مؤسسة أخرى — يمنعه المفتاح المركب حتى لو أخطأت السياسة
do $$
declare v_cust1 uuid; blocked boolean := false;
begin
  v_cust1 := current_setting('fx.cust1')::uuid;
  begin
    insert into public.contracts
      (customer_id, category, contract_start_date, total_amount, down_payment, monthly_installment)
    values (v_cust1, 'household', current_date, 1000, 0, 100);
  exception when others then blocked := true;
  end;
  raise notice 'T16 cannot attach a contract to another org''s customer: %', blocked;
end; $$;

-- تزوير org_id عند الإدراج: المحفّز يستبدله بمؤسسة المستخدم
do $$
declare v_org1 uuid; v_org2 uuid; v_new uuid; v_actual uuid;
begin
  v_org1 := current_setting('fx.org1')::uuid;
  v_org2 := current_setting('fx.org2')::uuid;

  insert into public.customers (org_id, full_name, known_as, phone, national_id, address)
  values (v_org1, 'محاولة تزوير', 'تزوير', '01011112222', '29001011111111', 'وهمي')
  returning id into v_new;

  select org_id into v_actual from public.customers where id = v_new;
  raise notice 'T17 spoofed org_id on INSERT is replaced by the caller''s own: %',
    (v_actual = v_org2 and v_actual <> v_org1);
end; $$;

-- نقل صف إلى مؤسسة أخرى بعد الإنشاء
do $$
declare v_org1 uuid; v_id uuid; blocked boolean := false;
begin
  v_org1 := current_setting('fx.org1')::uuid;
  select id into v_id from public.customers where full_name = 'عميل المحل الثاني';
  begin
    update public.customers set org_id = v_org1 where id = v_id;
  exception when others then
    blocked := position('ORG_IMMUTABLE' in sqlerrm) > 0;
  end;
  raise notice 'T18 cannot MOVE a row into another org: %', blocked;
end; $$;

\echo ''
\echo '--- storage isolation ---'
select 'T19 shop 2 sees only its own ID photo (expect 1)' as check,
       count(*) from storage.objects where bucket_id = 'national-ids';
select 'T20 shop 2 sees no shop 1 invoices (expect 0)' as check,
       count(*) from storage.objects where bucket_id = 'supplier-invoices';

-- كنس شامل: يجب ألا يمس صفوف المحل الأول إطلاقًا
do $$
begin
  delete from public.customer_payments where true;
  delete from public.customers where true;
end; $$;

\echo ''
\echo '=========== SHOP 1 must be untouched after all of that ==========='
set app.current_user_id = '11111111-1111-1111-1111-111111111111';

select 'T21 shop 1 still sees its 11 customers' as check,
       (select count(*) = 11 from public.customers) as pass;
select 'T22 shop 1 payment ledger survived shop 2''s delete sweep' as check,
       (select count(*) = current_setting('fx.shop1_payments')::integer from public.customer_payments) as pass;
select 'T23 shop 1 sees no shop 2 rows' as check,
       (select count(*) = 0 from public.customers where full_name = 'عميل المحل الثاني') as pass;
select 'T24 shop 1 customer name was not tampered with' as check,
       (select count(*) = 0 from public.customers where full_name = 'اختراق') as pass;
select 'T25 shop 1 sees only its own ID photo (expect 1)' as check,
       count(*) from storage.objects where bucket_id = 'national-ids';
select 'T26 shop 1 still sees its own invoice (expect 1)' as check,
       count(*) from storage.objects where bucket_id = 'supplier-invoices';

reset role;
