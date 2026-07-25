-- =============================================================================
-- seed.sql — بيانات تجريبية
-- شغّل هذا الملف بعد إنشاء حساب المالك الأول وترقيته (انظر README).
-- Dates are relative to current_date so charts and the performance widget
-- render meaningfully whenever you run it.
-- =============================================================================

do $$
declare
  v_owner uuid;
  v_m0 date := date_trunc('month', current_date)::date;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
  c6 uuid; c7 uuid; c8 uuid; c9 uuid; c10 uuid;
  s1 uuid; s2 uuid; s3 uuid;
begin
  select id into v_owner
  from public.profiles
  where role = 'owner'
  order by created_at
  limit 1;

  if v_owner is null then
    raise exception 'أنشئ حساب المالك الأول قبل تشغيل البيانات التجريبية — create and promote the first owner account before seeding';
  end if;

  -- ---------------------------------------------------------------------------
  -- رأس المال
  -- ---------------------------------------------------------------------------
  insert into public.capital_entries (amount, entry_type, note, entry_date, created_by) values
    (250000, 'deposit',    'رأس المال الافتتاحي', v_m0 - interval '5 months', v_owner),
    (50000,  'deposit',    'زيادة رأس المال',      v_m0 - interval '2 months', v_owner),
    (20000,  'withdrawal', 'مسحوبات شخصية',        v_m0 - interval '1 month' + interval '9 days', v_owner);

  -- ---------------------------------------------------------------------------
  -- العملاء (trigger يحسب المتبقي = الإجمالي - المقدم)
  -- ---------------------------------------------------------------------------
  insert into public.customers
    (full_name, known_as, phone, national_id, address, category,
     total_amount, down_payment, monthly_installment,
     guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
     trust_receipt, legal_status, created_at, created_by)
  values
    ('أحمد محمد السيد', 'أبو كريم', '01012345671', '28501011234561', 'شارع الجيش، طنطا', 'appliances',
     18000, 3000, 1000, 'محمد السيد', 'والده', '01098765431', 'شارع الجيش، طنطا',
     true, 'clean', v_m0 - interval '5 months', v_owner)
  returning id into c1;

  insert into public.customers
    (full_name, known_as, phone, national_id, address, category,
     total_amount, down_payment, monthly_installment,
     guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
     trust_receipt, legal_status, created_at, created_by)
  values
    ('محمود عبد الرحمن علي', 'الحاج محمود', '01112345672', '27903021234562', 'شارع البحر، المحلة الكبرى', 'furniture',
     30000, 5000, 1500, 'عبد الرحمن علي', 'شقيقه', '01198765432', 'شارع البحر، المحلة',
     true, 'clean', v_m0 - interval '5 months', v_owner)
  returning id into c2;

  insert into public.customers
    (full_name, known_as, phone, national_id, address, category,
     total_amount, down_payment, monthly_installment,
     trust_receipt, legal_status, created_at, created_by)
  values
    ('سعاد إبراهيم حسن', 'أم حسن', '01212345673', '28807041234563', 'شارع سعد زغلول، طنطا', 'household',
     6000, 1000, 400,
     true, 'clean', v_m0 - interval '5 months', v_owner)
  returning id into c3;

  insert into public.customers
    (full_name, known_as, phone, national_id, address, category,
     total_amount, down_payment, monthly_installment,
     guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
     trust_receipt, legal_status, created_at, created_by)
  values
    ('خالد فتحي عبد الله', 'خالد الكهربائي', '01512345674', '29105061234564', 'شارع المديرية، طنطا', 'appliances',
     24000, 4000, 1200, 'فتحي عبد الله', 'والده', '01598765434', 'شارع المديرية، طنطا',
     true, 'in_litigation', v_m0 - interval '5 months', v_owner)
  returning id into c4;

  insert into public.customers
    (full_name, known_as, phone, national_id, address, category,
     total_amount, down_payment, monthly_installment,
     trust_receipt, legal_status, created_at, created_by)
  values
    ('منى عبد العزيز محمد', 'أم يوسف', '01012345675', '29309081234565', 'شارع النحاس، كفر الزيات', 'furniture',
     15000, 2500, 800,
     true, 'clean', v_m0 - interval '5 months', v_owner)
  returning id into c5;

  insert into public.customers
    (full_name, known_as, phone, national_id, address, category,
     total_amount, down_payment, monthly_installment,
     trust_receipt, legal_status, created_at, created_by)
  values
    ('طارق حسن إبراهيم', 'أبو سيف', '01112345676', '28611101234566', 'ميدان الساعة، طنطا', 'household',
     4500, 500, 300,
     true, 'clean', v_m0 - interval '4 months', v_owner)
  returning id into c6;

  insert into public.customers
    (full_name, known_as, phone, national_id, address, category,
     total_amount, down_payment, monthly_installment,
     guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
     trust_receipt, legal_status, created_at, created_by)
  values
    ('هالة مصطفى كامل', 'هالة المدرسة', '01212345677', '29001121234567', 'شارع المحطة، زفتى', 'appliances',
     21000, 3000, 1100, 'مصطفى كامل', 'والدها', '01298765437', 'شارع المحطة، زفتى',
     true, 'clean', v_m0 - interval '5 months', v_owner)
  returning id into c7;

  insert into public.customers
    (full_name, known_as, phone, national_id, address, category,
     total_amount, down_payment, monthly_installment,
     guarantor_name, guarantor_relation, guarantor_phone, guarantor_address,
     trust_receipt, legal_status, created_at, created_by)
  values
    ('ياسر عبد الله سالم', 'ياسر النجار', '01512345678', '28203141234568', 'شارع الجمهورية، بسيون', 'furniture',
     27000, 4000, 1400, 'سالم عبد الله', 'عمه', '01098765438', 'شارع الجمهورية، بسيون',
     false, 'in_litigation', v_m0 - interval '5 months', v_owner)
  returning id into c8;

  insert into public.customers
    (full_name, known_as, phone, national_id, address, category,
     total_amount, down_payment, monthly_installment,
     trust_receipt, legal_status, created_at, created_by)
  values
    ('نادية سمير فهمي', 'أم أحمد', '01012345679', '29507161234569', 'شارع بورسعيد، طنطا', 'household',
     7500, 1500, 350,
     true, 'clean', v_m0 - interval '5 months', v_owner)
  returning id into c9;

  insert into public.customers
    (full_name, known_as, phone, national_id, address, category,
     total_amount, down_payment, monthly_installment,
     trust_receipt, legal_status, created_at, created_by)
  values
    ('عمرو صلاح الدين', 'عمرو الدكتور', '01112345680', '29711181234570', 'شارع الاستاد، طنطا', 'appliances',
     12000, 2000, 700,
     true, 'clean', v_m0 - interval '5 months', v_owner)
  returning id into c10;

  -- ---------------------------------------------------------------------------
  -- دفعات العملاء عبر آخر ٦ شهور
  -- month offsets: -5 … 0 (0 = الشهر الحالي)
  -- ---------------------------------------------------------------------------
  insert into public.customer_payments (customer_id, amount, payment_date, collected_by, note) values
    -- c1: منتظم بالكامل
    (c1, 1000, v_m0 - interval '5 months' + interval '8 days', v_owner, null),
    (c1, 1000, v_m0 - interval '4 months' + interval '8 days', v_owner, null),
    (c1, 1000, v_m0 - interval '3 months' + interval '7 days', v_owner, null),
    (c1, 1000, v_m0 - interval '2 months' + interval '9 days', v_owner, null),
    (c1, 1000, v_m0 - interval '1 month' + interval '8 days', v_owner, null),
    (c1, 1000, current_date, v_owner, 'قسط الشهر الحالي'),
    -- c2: متذبذب
    (c2, 1500, v_m0 - interval '5 months' + interval '12 days', v_owner, null),
    (c2, 1500, v_m0 - interval '4 months' + interval '10 days', v_owner, null),
    (c2, 700,  v_m0 - interval '3 months' + interval '15 days', v_owner, 'دفعة جزئية'),
    (c2, 1500, v_m0 - interval '2 months' + interval '11 days', v_owner, null),
    (c2, 800,  current_date, v_owner, 'دفعة جزئية'),
    -- c3: منتظمة
    (c3, 400, v_m0 - interval '5 months' + interval '5 days', v_owner, null),
    (c3, 400, v_m0 - interval '4 months' + interval '5 days', v_owner, null),
    (c3, 400, v_m0 - interval '3 months' + interval '6 days', v_owner, null),
    (c3, 400, v_m0 - interval '2 months' + interval '5 days', v_owner, null),
    (c3, 400, v_m0 - interval '1 month' + interval '4 days', v_owner, null),
    (c3, 400, current_date, v_owner, null),
    -- c4: متعثر (يتم التقاضي)
    (c4, 1200, v_m0 - interval '5 months' + interval '20 days', v_owner, null),
    (c4, 1200, v_m0 - interval '4 months' + interval '22 days', v_owner, null),
    (c4, 600,  v_m0 - interval '1 month' + interval '25 days', v_owner, 'دفعة بعد إنذار'),
    -- c5
    (c5, 800, v_m0 - interval '5 months' + interval '9 days', v_owner, null),
    (c5, 800, v_m0 - interval '4 months' + interval '9 days', v_owner, null),
    (c5, 800, v_m0 - interval '3 months' + interval '10 days', v_owner, null),
    (c5, 400, v_m0 - interval '2 months' + interval '12 days', v_owner, 'دفعة جزئية'),
    (c5, 800, v_m0 - interval '1 month' + interval '9 days', v_owner, null),
    -- c6: بدأ من ٤ شهور، منتظم
    (c6, 300, v_m0 - interval '4 months' + interval '3 days', v_owner, null),
    (c6, 300, v_m0 - interval '3 months' + interval '3 days', v_owner, null),
    (c6, 300, v_m0 - interval '2 months' + interval '4 days', v_owner, null),
    (c6, 300, v_m0 - interval '1 month' + interval '3 days', v_owner, null),
    (c6, 300, current_date, v_owner, null),
    -- c7
    (c7, 1100, v_m0 - interval '5 months' + interval '14 days', v_owner, null),
    (c7, 1100, v_m0 - interval '4 months' + interval '13 days', v_owner, null),
    (c7, 1100, v_m0 - interval '3 months' + interval '14 days', v_owner, null),
    (c7, 1100, v_m0 - interval '1 month' + interval '16 days', v_owner, null),
    -- c8: متعثر تماماً (يتم التقاضي)
    (c8, 700, v_m0 - interval '4 months' + interval '18 days', v_owner, 'آخر دفعة قبل التقاضي'),
    -- c9
    (c9, 350, v_m0 - interval '5 months' + interval '6 days', v_owner, null),
    (c9, 350, v_m0 - interval '4 months' + interval '6 days', v_owner, null),
    (c9, 350, v_m0 - interval '3 months' + interval '7 days', v_owner, null),
    (c9, 350, v_m0 - interval '2 months' + interval '6 days', v_owner, null),
    (c9, 175, v_m0 - interval '1 month' + interval '8 days', v_owner, 'دفعة جزئية'),
    -- c10: منتظم
    (c10, 700, v_m0 - interval '5 months' + interval '2 days', v_owner, null),
    (c10, 700, v_m0 - interval '4 months' + interval '2 days', v_owner, null),
    (c10, 700, v_m0 - interval '3 months' + interval '2 days', v_owner, null),
    (c10, 700, v_m0 - interval '2 months' + interval '3 days', v_owner, null),
    (c10, 700, v_m0 - interval '1 month' + interval '2 days', v_owner, null),
    (c10, 700, current_date, v_owner, null);

  -- ---------------------------------------------------------------------------
  -- التجار وفواتيرهم ودفعاتهم
  -- ---------------------------------------------------------------------------
  insert into public.suppliers (name, trade_type, phone_1, phone_2, total_owed, monthly_payment, created_by)
  values ('شركة النور للأدوات المنزلية', 'household', '01055500011', '0403334444', 120000, 10000, v_owner)
  returning id into s1;

  insert into public.suppliers (name, trade_type, phone_1, total_owed, monthly_payment, created_by)
  values ('مؤسسة الأمل للأجهزة الكهربائية', 'appliances', '01155500022', 200000, 15000, v_owner)
  returning id into s2;

  insert into public.suppliers (name, trade_type, phone_1, total_owed, monthly_payment, created_by)
  values ('معرض الحرية للموبيليا', 'furniture', '01255500033', 90000, 8000, v_owner)
  returning id into s3;

  insert into public.supplier_payments (supplier_id, amount, payment_date, note, created_by) values
    (s1, 10000, v_m0 - interval '3 months' + interval '1 day', 'قسط شهري', v_owner),
    (s1, 10000, v_m0 - interval '2 months' + interval '1 day', 'قسط شهري', v_owner),
    (s1, 10000, v_m0 - interval '1 month' + interval '1 day', 'قسط شهري', v_owner),
    (s2, 15000, v_m0 - interval '4 months' + interval '5 days', 'قسط شهري', v_owner),
    (s2, 15000, v_m0 - interval '3 months' + interval '5 days', 'قسط شهري', v_owner),
    (s2, 15000, v_m0 - interval '2 months' + interval '5 days', 'قسط شهري', v_owner),
    (s2, 15000, v_m0 - interval '1 month' + interval '5 days', 'قسط شهري', v_owner),
    (s3, 8000, v_m0 - interval '2 months' + interval '10 days', 'قسط شهري', v_owner),
    (s3, 8000, v_m0 - interval '1 month' + interval '10 days', 'قسط شهري', v_owner);

  insert into public.supplier_invoices (supplier_id, invoice_number, amount, invoice_date, note, created_by) values
    (s1, 'NR-2024-118', 70000, v_m0 - interval '5 months' + interval '2 days', 'دفعة بضاعة أدوات منزلية', v_owner),
    (s1, 'NR-2024-142', 50000, v_m0 - interval '3 months' + interval '15 days', null, v_owner),
    (s2, 'AML-889', 120000, v_m0 - interval '5 months' + interval '4 days', 'أجهزة كهربائية متنوعة', v_owner),
    (s2, 'AML-921', 80000, v_m0 - interval '2 months' + interval '20 days', null, v_owner),
    (s3, 'HR-301', 90000, v_m0 - interval '4 months' + interval '8 days', 'غرف نوم وأنتريهات', v_owner);
end;
$$;
