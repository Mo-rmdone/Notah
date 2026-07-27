-- =============================================================================
-- 00009_tenant_storage.sql — عزل الملفات بين المؤسسات
-- =============================================================================
-- صور البطاقات وفواتير التجار لم تكن معزولة: السياسة القديمة تفحص «مستخدم نشط»
-- فقط، فأي مستخدم من أي محل كان يقرأ صور البطاقات القومية لكل المحلات الأخرى.
-- هذه أخطر ثغرة في الترقية، لأن المسرَّب هنا مستندات هوية رسمية.
--
-- The pre-tenancy policies gated these buckets on `private.is_active_user()`
-- alone. Under multi-tenancy that means any authenticated user of ANY shop could
-- read every other shop's scanned national-ID photos. Of everything the tenancy
-- migration touches, this is the one that leaks government identity documents,
-- and the v2 spec did not mention storage at all.
--
-- الحل: كل ملف يُخزَّن تحت مجلد باسم المؤسسة «<org_id>/<file>»، والسياسة تقارن
-- الجزء الأول من المسار بمؤسسة المستخدم.
-- Fix: every object lives under `<org_id>/<filename>` and the policies compare
-- the first path segment against the caller's own org.
--
-- نستخدم split_part بدل storage.foldername كي تبقى الهجرة قابلة للفحص على
-- Postgres عادي داخل حاوية الاختبار.
-- split_part is used rather than storage.foldername so the migration stays
-- verifiable against a plain Postgres container in the test harness.

drop policy if exists "national-ids: active users read" on storage.objects;
drop policy if exists "national-ids: owner writes" on storage.objects;
drop policy if exists "national-ids: owner updates" on storage.objects;
drop policy if exists "national-ids: owner deletes" on storage.objects;
drop policy if exists "supplier-invoices: owner reads" on storage.objects;
drop policy if exists "supplier-invoices: owner writes" on storage.objects;
drop policy if exists "supplier-invoices: owner updates" on storage.objects;
drop policy if exists "supplier-invoices: owner deletes" on storage.objects;

-- ---------------------------------------------------------------------------
-- national-ids — يقرؤها كل عضو نشط في نفس المؤسسة، ويكتبها المالك
-- ---------------------------------------------------------------------------
create policy "national-ids: org members read"
on storage.objects for select to authenticated
using (
  bucket_id = 'national-ids'
  and split_part(name, '/', 1) = private.current_org_id()::text
  and private.is_active_user()
);

create policy "national-ids: owner writes in own org"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'national-ids'
  and split_part(name, '/', 1) = private.current_org_id()::text
  and private.is_owner()
);

create policy "national-ids: owner updates in own org"
on storage.objects for update to authenticated
using (
  bucket_id = 'national-ids'
  and split_part(name, '/', 1) = private.current_org_id()::text
  and private.is_owner()
)
with check (
  bucket_id = 'national-ids'
  and split_part(name, '/', 1) = private.current_org_id()::text
  and private.is_owner()
);

create policy "national-ids: owner deletes in own org"
on storage.objects for delete to authenticated
using (
  bucket_id = 'national-ids'
  and split_part(name, '/', 1) = private.current_org_id()::text
  and private.is_owner()
);

-- ---------------------------------------------------------------------------
-- supplier-invoices — المالك فقط، وداخل مؤسسته فقط
-- ---------------------------------------------------------------------------
create policy "supplier-invoices: owner reads in own org"
on storage.objects for select to authenticated
using (
  bucket_id = 'supplier-invoices'
  and split_part(name, '/', 1) = private.current_org_id()::text
  and private.is_owner()
);

create policy "supplier-invoices: owner writes in own org"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'supplier-invoices'
  and split_part(name, '/', 1) = private.current_org_id()::text
  and private.is_owner()
);

create policy "supplier-invoices: owner updates in own org"
on storage.objects for update to authenticated
using (
  bucket_id = 'supplier-invoices'
  and split_part(name, '/', 1) = private.current_org_id()::text
  and private.is_owner()
)
with check (
  bucket_id = 'supplier-invoices'
  and split_part(name, '/', 1) = private.current_org_id()::text
  and private.is_owner()
);

create policy "supplier-invoices: owner deletes in own org"
on storage.objects for delete to authenticated
using (
  bucket_id = 'supplier-invoices'
  and split_part(name, '/', 1) = private.current_org_id()::text
  and private.is_owner()
);
