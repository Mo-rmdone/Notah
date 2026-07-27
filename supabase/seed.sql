-- =============================================================================
-- seed.sql — بيانات تجريبية
-- شغّل هذا الملف بعد إنشاء حساب المالك الأول (انظر README).
-- Dates are relative to current_date so charts and the performance strip render
-- meaningfully whenever you run it.
--
-- ملاحظة: البذور تعمل بدون جلسة مستخدم، لذلك محفّز set_org_id يترك org_id كما
-- أُرسل. لهذا كل إدراج هنا يمرر org_id صراحة.
-- Seeding runs with no session, so set_org_id keeps whatever org_id is supplied
-- rather than overwriting it — which is why every insert below passes it.
-- =============================================================================

do $$
declare
  v_owner uuid;
  v_org uuid;
  v_m0 date := date_trunc('month', current_date)::date;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
  c6 uuid; c7 uuid; c8 uuid; c9 uuid; c10 uuid;
  k1 uuid; k2 uuid; k3 uuid; k4 uuid; k5 uuid;
  k6 uuid; k7 uuid; k8 uuid; k9 uuid; k10 uuid; k1b uuid;
  s1 uuid; s2 uuid; s3 uuid;
begin
  select id, org_id into v_owner, v_org
  from public.profiles
  where role = 'owner'
  order by created_at
  limit 1;

  if v_owner is null then
    raise exception 'أنشئ حساب المالك الأول قبل تشغيل البيانات التجريبية — create the first owner account before seeding';
  end if;

  -- ---------------------------------------------------------------------------
  -- رأس المال
  -- ---------------------------------------------------------------------------
  insert into public.capital_entries (org_id, amount, entry_type, note, entry_date, created_by) values
    (v_org, 250000, 'deposit',    'رأس المال الافتتاحي', v_m0 - interval '5 months', v_owner),
    (v_org, 50000,  'deposit',    'زيادة رأس المال',      v_m0 - interval '2 months', v_owner),
    (v_org, 20000,  'withdrawal', 'مسحوبات شخصية',        v_m0 - interval '1 month' + interval '9 days', v_owner);

  -- ---------------------------------------------------------------------------
  -- العملاء — بيانات الشخص فقط، بلا أي مبالغ
  -- Identity only; every amount now lives on the contract.
  -- ---------------------------------------------------------------------------
  insert into public.customers
    (org_id, full_name, known_as, phone, national_id, address,
     guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
     legal_status, created_at, created_by)
  values
    (v_org, 'أحمد محمد السيد', 'أبو كريم', '01012345671', '28501011234561', 'شارع الجيش، طنطا',
     'محمد السيد', 'والده', '01098765431', 'شارع الجيش، طنطا',
     'clean', v_m0 - interval '5 months', v_owner)
  returning id into c1;

  insert into public.customers
    (org_id, full_name, known_as, phone, national_id, address,
     guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
     legal_status, created_at, created_by)
  values
    (v_org, 'محمود عبد الرحمن علي', 'الحاج محمود', '01112345672', '27903021234562', 'شارع البحر، المحلة الكبرى',
     'عبد الرحمن علي', 'شقيقه', '01198765432', 'شارع البحر، المحلة',
     'clean', v_m0 - interval '5 months', v_owner)
  returning id into c2;

  insert into public.customers
    (org_id, full_name, known_as, phone, national_id, address, legal_status, created_at, created_by)
  values
    (v_org, 'سعاد إبراهيم حسن', 'أم حسن', '01212345673', '28807041234563', 'شارع سعد زغلول، طنطا',
     'clean', v_m0 - interval '5 months', v_owner)
  returning id into c3;

  insert into public.customers
    (org_id, full_name, known_as, phone, national_id, address,
     guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
     legal_status, created_at, created_by)
  values
    (v_org, 'خالد فتحي عبد الله', 'خالد الكهربائي', '01512345674', '29105061234564', 'شارع المديرية، طنطا',
     'فتحي عبد الله', 'والده', '01598765434', 'شارع المديرية، طنطا',
     'in_litigation', v_m0 - interval '5 months', v_owner)
  returning id into c4;

  insert into public.customers
    (org_id, full_name, known_as, phone, national_id, address, legal_status, created_at, created_by)
  values
    (v_org, 'منى عبد العزيز محمد', 'أم يوسف', '01012345675', '29309081234565', 'شارع النحاس، كفر الزيات',
     'clean', v_m0 - interval '5 months', v_owner)
  returning id into c5;

  insert into public.customers
    (org_id, full_name, known_as, phone, national_id, address, legal_status, created_at, created_by)
  values
    (v_org, 'طارق حسن إبراهيم', 'أبو سيف', '01112345676', '28611101234566', 'ميدان الساعة، طنطا',
     'clean', v_m0 - interval '4 months', v_owner)
  returning id into c6;

  insert into public.customers
    (org_id, full_name, known_as, phone, national_id, address,
     guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
     legal_status, created_at, created_by)
  values
    (v_org, 'هالة مصطفى كامل', 'هالة المدرسة', '01212345677', '29001121234567', 'شارع المحطة، زفتى',
     'مصطفى كامل', 'والدها', '01298765437', 'شارع المحطة، زفتى',
     'clean', v_m0 - interval '5 months', v_owner)
  returning id into c7;

  insert into public.customers
    (org_id, full_name, known_as, phone, national_id, address,
     guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
     legal_status, created_at, created_by)
  values
    (v_org, 'ياسر عبد الله سالم', 'ياسر النجار', '01512345678', '28203141234568', 'شارع الجمهورية، بسيون',
     'سالم عبد الله', 'عمه', '01098765438', 'شارع الجمهورية، بسيون',
     'in_litigation', v_m0 - interval '5 months', v_owner)
  returning id into c8;

  insert into public.customers
    (org_id, full_name, known_as, phone, national_id, address, legal_status, created_at, created_by)
  values
    (v_org, 'نادية سمير فهمي', 'أم أحمد', '01012345679', '29507161234569', 'شارع بورسعيد، طنطا',
     'clean', v_m0 - interval '5 months', v_owner)
  returning id into c9;

  insert into public.customers
    (org_id, full_name, known_as, phone, national_id, address, legal_status, created_at, created_by)
  values
    (v_org, 'عمرو صلاح الدين', 'عمرو الدكتور', '01112345680', '29711181234570', 'شارع الاستاد، طنطا',
     'clean', v_m0 - interval '5 months', v_owner)
  returning id into c10;

  -- ---------------------------------------------------------------------------
  -- العقود — نوافذ سداد متنوعة كي يُختبر حساب الانتظام على الحالات الثلاث
  -- Contracts, with a spread of payment windows so the credit score is exercised
  -- across all three. c1 deliberately holds two contracts at once.
  -- ---------------------------------------------------------------------------
  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, created_at, created_by)
  values
    (v_org, c1, 'appliances', (v_m0 - interval '5 months')::date, 'early',
     18000, 3000, 1000, true, v_m0 - interval '5 months', v_owner)
  returning id into k1;

  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, note, created_at, created_by)
  values
    (v_org, c1, 'household', (v_m0 - interval '2 months')::date, 'early',
     9000, 1000, 500, true, 'عقد ثانٍ — غسالة', v_m0 - interval '2 months', v_owner)
  returning id into k1b;

  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, created_at, created_by)
  values
    (v_org, c2, 'furniture', (v_m0 - interval '5 months')::date, 'mid',
     30000, 5000, 1500, true, v_m0 - interval '5 months', v_owner)
  returning id into k2;

  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, created_at, created_by)
  values
    (v_org, c3, 'household', (v_m0 - interval '5 months')::date, 'early',
     6000, 1000, 400, true, v_m0 - interval '5 months', v_owner)
  returning id into k3;

  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, created_at, created_by)
  values
    (v_org, c4, 'appliances', (v_m0 - interval '5 months')::date, 'late',
     24000, 4000, 1200, true, v_m0 - interval '5 months', v_owner)
  returning id into k4;

  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, created_at, created_by)
  values
    (v_org, c5, 'furniture', (v_m0 - interval '5 months')::date, 'early',
     15000, 2500, 800, true, v_m0 - interval '5 months', v_owner)
  returning id into k5;

  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, created_at, created_by)
  values
    (v_org, c6, 'household', (v_m0 - interval '4 months')::date, 'early',
     4500, 500, 300, true, v_m0 - interval '4 months', v_owner)
  returning id into k6;

  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, created_at, created_by)
  values
    (v_org, c7, 'appliances', (v_m0 - interval '5 months')::date, 'mid',
     21000, 3000, 1100, true, v_m0 - interval '5 months', v_owner)
  returning id into k7;

  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, created_at, created_by)
  values
    (v_org, c8, 'furniture', (v_m0 - interval '5 months')::date, 'mid',
     27000, 4000, 1400, false, v_m0 - interval '5 months', v_owner)
  returning id into k8;

  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, created_at, created_by)
  values
    (v_org, c9, 'household', (v_m0 - interval '5 months')::date, 'early',
     7500, 1500, 350, true, v_m0 - interval '5 months', v_owner)
  returning id into k9;

  insert into public.contracts
    (org_id, customer_id, category, contract_start_date, payment_window,
     total_amount, down_payment, monthly_installment, trust_receipt, created_at, created_by)
  values
    (v_org, c10, 'appliances', (v_m0 - interval '5 months')::date, 'late',
     12000, 2000, 700, true, v_m0 - interval '5 months', v_owner)
  returning id into k10;

  -- ---------------------------------------------------------------------------
  -- دفعات العملاء عبر آخر ٦ شهور · month offsets -5 … 0
  -- ---------------------------------------------------------------------------
  insert into public.customer_payments (org_id, contract_id, amount, payment_date, collected_by, note) values
    -- k1: منتظم بالكامل
    (v_org, k1, 1000, v_m0 - interval '5 months' + interval '8 days', v_owner, null),
    (v_org, k1, 1000, v_m0 - interval '4 months' + interval '8 days', v_owner, null),
    (v_org, k1, 1000, v_m0 - interval '3 months' + interval '7 days', v_owner, null),
    (v_org, k1, 1000, v_m0 - interval '2 months' + interval '9 days', v_owner, null),
    (v_org, k1, 1000, v_m0 - interval '1 month' + interval '8 days', v_owner, null),
    (v_org, k1, 1000, current_date, v_owner, 'قسط الشهر الحالي'),
    -- k1b: العقد الثاني لنفس العميل
    (v_org, k1b, 500, v_m0 - interval '2 months' + interval '9 days', v_owner, null),
    (v_org, k1b, 500, v_m0 - interval '1 month' + interval '8 days', v_owner, null),
    -- k2: متذبذب
    (v_org, k2, 1500, v_m0 - interval '5 months' + interval '12 days', v_owner, null),
    (v_org, k2, 1500, v_m0 - interval '4 months' + interval '10 days', v_owner, null),
    (v_org, k2, 700,  v_m0 - interval '3 months' + interval '15 days', v_owner, 'دفعة جزئية'),
    (v_org, k2, 1500, v_m0 - interval '2 months' + interval '11 days', v_owner, null),
    (v_org, k2, 800,  current_date, v_owner, 'دفعة جزئية'),
    -- k3: منتظمة
    (v_org, k3, 400, v_m0 - interval '5 months' + interval '5 days', v_owner, null),
    (v_org, k3, 400, v_m0 - interval '4 months' + interval '5 days', v_owner, null),
    (v_org, k3, 400, v_m0 - interval '3 months' + interval '6 days', v_owner, null),
    (v_org, k3, 400, v_m0 - interval '2 months' + interval '5 days', v_owner, null),
    (v_org, k3, 400, v_m0 - interval '1 month' + interval '4 days', v_owner, null),
    (v_org, k3, 400, current_date, v_owner, null),
    -- k4: متعثر (يتم التقاضي)
    (v_org, k4, 1200, v_m0 - interval '5 months' + interval '20 days', v_owner, null),
    (v_org, k4, 1200, v_m0 - interval '4 months' + interval '22 days', v_owner, null),
    (v_org, k4, 600,  v_m0 - interval '1 month' + interval '25 days', v_owner, 'دفعة بعد إنذار'),
    -- k5
    (v_org, k5, 800, v_m0 - interval '5 months' + interval '9 days', v_owner, null),
    (v_org, k5, 800, v_m0 - interval '4 months' + interval '9 days', v_owner, null),
    (v_org, k5, 800, v_m0 - interval '3 months' + interval '10 days', v_owner, null),
    (v_org, k5, 400, v_m0 - interval '2 months' + interval '12 days', v_owner, 'دفعة جزئية'),
    (v_org, k5, 800, v_m0 - interval '1 month' + interval '9 days', v_owner, null),
    -- k6: بدأ من ٤ شهور، منتظم
    (v_org, k6, 300, v_m0 - interval '4 months' + interval '3 days', v_owner, null),
    (v_org, k6, 300, v_m0 - interval '3 months' + interval '3 days', v_owner, null),
    (v_org, k6, 300, v_m0 - interval '2 months' + interval '4 days', v_owner, null),
    (v_org, k6, 300, v_m0 - interval '1 month' + interval '3 days', v_owner, null),
    (v_org, k6, 300, current_date, v_owner, null),
    -- k7
    (v_org, k7, 1100, v_m0 - interval '5 months' + interval '14 days', v_owner, null),
    (v_org, k7, 1100, v_m0 - interval '4 months' + interval '13 days', v_owner, null),
    (v_org, k7, 1100, v_m0 - interval '3 months' + interval '14 days', v_owner, null),
    (v_org, k7, 1100, v_m0 - interval '1 month' + interval '16 days', v_owner, null),
    -- k8: متعثر تماماً (يتم التقاضي)
    (v_org, k8, 700, v_m0 - interval '4 months' + interval '18 days', v_owner, 'آخر دفعة قبل التقاضي'),
    -- k9
    (v_org, k9, 350, v_m0 - interval '5 months' + interval '6 days', v_owner, null),
    (v_org, k9, 350, v_m0 - interval '4 months' + interval '6 days', v_owner, null),
    (v_org, k9, 350, v_m0 - interval '3 months' + interval '7 days', v_owner, null),
    (v_org, k9, 350, v_m0 - interval '2 months' + interval '6 days', v_owner, null),
    (v_org, k9, 175, v_m0 - interval '1 month' + interval '8 days', v_owner, 'دفعة جزئية'),
    -- k10: منتظم
    (v_org, k10, 700, v_m0 - interval '5 months' + interval '2 days', v_owner, null),
    (v_org, k10, 700, v_m0 - interval '4 months' + interval '2 days', v_owner, null),
    (v_org, k10, 700, v_m0 - interval '3 months' + interval '2 days', v_owner, null),
    (v_org, k10, 700, v_m0 - interval '2 months' + interval '3 days', v_owner, null),
    (v_org, k10, 700, v_m0 - interval '1 month' + interval '2 days', v_owner, null),
    (v_org, k10, 700, current_date, v_owner, null);

  -- ---------------------------------------------------------------------------
  -- التجار وفواتيرهم ودفعاتهم
  -- ---------------------------------------------------------------------------
  insert into public.suppliers (org_id, name, trade_type, phone_1, phone_2, total_owed, monthly_payment, created_by)
  values (v_org, 'شركة النور للأدوات المنزلية', 'household', '01055500011', '0403334444', 120000, 10000, v_owner)
  returning id into s1;

  insert into public.suppliers (org_id, name, trade_type, phone_1, total_owed, monthly_payment, created_by)
  values (v_org, 'مؤسسة الأمل للأجهزة الكهربائية', 'appliances', '01155500022', 200000, 15000, v_owner)
  returning id into s2;

  insert into public.suppliers (org_id, name, trade_type, phone_1, total_owed, monthly_payment, created_by)
  values (v_org, 'معرض الحرية للموبيليا', 'furniture', '01255500033', 90000, 8000, v_owner)
  returning id into s3;

  insert into public.supplier_payments (org_id, supplier_id, amount, payment_date, note, created_by) values
    (v_org, s1, 10000, v_m0 - interval '3 months' + interval '1 day', 'قسط شهري', v_owner),
    (v_org, s1, 10000, v_m0 - interval '2 months' + interval '1 day', 'قسط شهري', v_owner),
    (v_org, s1, 10000, v_m0 - interval '1 month' + interval '1 day', 'قسط شهري', v_owner),
    (v_org, s2, 15000, v_m0 - interval '4 months' + interval '5 days', 'قسط شهري', v_owner),
    (v_org, s2, 15000, v_m0 - interval '3 months' + interval '5 days', 'قسط شهري', v_owner),
    (v_org, s2, 15000, v_m0 - interval '2 months' + interval '5 days', 'قسط شهري', v_owner),
    (v_org, s2, 15000, v_m0 - interval '1 month' + interval '5 days', 'قسط شهري', v_owner),
    (v_org, s3, 8000, v_m0 - interval '2 months' + interval '10 days', 'قسط شهري', v_owner),
    (v_org, s3, 8000, v_m0 - interval '1 month' + interval '10 days', 'قسط شهري', v_owner);

  insert into public.supplier_invoices (org_id, supplier_id, invoice_number, amount, invoice_date, note, created_by) values
    (v_org, s1, 'NR-2024-118', 70000, v_m0 - interval '5 months' + interval '2 days', 'دفعة بضاعة أدوات منزلية', v_owner),
    (v_org, s1, 'NR-2024-142', 50000, v_m0 - interval '3 months' + interval '15 days', null, v_owner),
    (v_org, s2, 'AML-889', 120000, v_m0 - interval '5 months' + interval '4 days', 'أجهزة كهربائية متنوعة', v_owner),
    (v_org, s2, 'AML-921', 80000, v_m0 - interval '2 months' + interval '20 days', null, v_owner),
    (v_org, s3, 'HR-301', 90000, v_m0 - interval '4 months' + interval '8 days', 'غرف نوم وأنتريهات', v_owner);
end;
$$;
