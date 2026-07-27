-- =============================================================================
-- 00011_storage_parent_scoped.sql — ربط عزل الملفات بمالك السجل بدل بادئة المسار
-- =============================================================================
-- 00009 اشترط أن يبدأ مسار الملف بمعرّف المؤسسة. لكن الملفات المرفوعة قبل ذلك
-- مخزَّنة بالشكل «<معرّف العميل>/<الملف>»، فأصبحت صور بطاقات حقيقية غير قابلة
-- للقراءة (خطأ 400 عند إنشاء الرابط الموقّع).
--
-- 00009 required the object path to start with the org id. Files uploaded before
-- it are stored as `<customer_id>/<file>`, so real, already-uploaded national-ID
-- photos became unreadable — createSignedUrl returned HTTP 400. Found by opening
-- the page in a browser; the type-checker and build could not see it.
--
-- بدل نقل الملفات فعليًا (وهو ما يكسر الروابط القائمة)، تتحقق السياسة الآن من
-- أن السجل الأب — العميل أو التاجر — يخص مؤسسة المستخدم. هذا يصلح البيانات
-- الحالية دون نقل، وهو تحقّق أقوى: الملف يجب أن يعود لسجل موجود فعلًا.
--
-- Instead of physically moving objects, the policies now verify that the PARENT
-- row (customer or supplier) belongs to the caller's organization. That repairs
-- the existing files without moving them, and is a stricter check than a path
-- prefix: the object must belong to a row that actually exists in your org.

drop policy if exists "national-ids: org members read" on storage.objects;
drop policy if exists "national-ids: owner writes in own org" on storage.objects;
drop policy if exists "national-ids: owner updates in own org" on storage.objects;
drop policy if exists "national-ids: owner deletes in own org" on storage.objects;
drop policy if exists "supplier-invoices: owner reads in own org" on storage.objects;
drop policy if exists "supplier-invoices: owner writes in own org" on storage.objects;
drop policy if exists "supplier-invoices: owner updates in own org" on storage.objects;
drop policy if exists "supplier-invoices: owner deletes in own org" on storage.objects;

-- ملاحظة: تتم المقارنة بتحويل معرّف السجل إلى نص، لا بتحويل جزء المسار إلى uuid،
-- كي لا يرمي مسار غير صالح استثناءً بدل أن يُرفض بهدوء.
-- The row id is cast to text rather than casting the path segment to uuid, so a
-- malformed path is simply denied instead of raising an exception.

create policy "national-ids: org members read"
on storage.objects for select to authenticated
using (
  bucket_id = 'national-ids'
  and private.is_active_user()
  and exists (
    select 1 from public.customers c
    where c.id::text = split_part(storage.objects.name, '/', 1)
      and c.org_id = private.current_org_id()
  )
);

create policy "national-ids: org members write"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'national-ids'
  and private.is_active_user()
  and exists (
    select 1 from public.customers c
    where c.id::text = split_part(storage.objects.name, '/', 1)
      and c.org_id = private.current_org_id()
  )
);

create policy "national-ids: owner updates"
on storage.objects for update to authenticated
using (
  bucket_id = 'national-ids'
  and private.is_owner()
  and exists (
    select 1 from public.customers c
    where c.id::text = split_part(storage.objects.name, '/', 1)
      and c.org_id = private.current_org_id()
  )
)
with check (
  bucket_id = 'national-ids'
  and private.is_owner()
  and exists (
    select 1 from public.customers c
    where c.id::text = split_part(storage.objects.name, '/', 1)
      and c.org_id = private.current_org_id()
  )
);

create policy "national-ids: owner deletes"
on storage.objects for delete to authenticated
using (
  bucket_id = 'national-ids'
  and private.is_owner()
  and exists (
    select 1 from public.customers c
    where c.id::text = split_part(storage.objects.name, '/', 1)
      and c.org_id = private.current_org_id()
  )
);

-- فواتير التجار: المالك فقط، والتاجر يجب أن يكون من مؤسسته
create policy "supplier-invoices: owner reads"
on storage.objects for select to authenticated
using (
  bucket_id = 'supplier-invoices'
  and private.is_owner()
  and exists (
    select 1 from public.suppliers s
    where s.id::text = split_part(storage.objects.name, '/', 1)
      and s.org_id = private.current_org_id()
  )
);

create policy "supplier-invoices: owner writes"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'supplier-invoices'
  and private.is_owner()
  and exists (
    select 1 from public.suppliers s
    where s.id::text = split_part(storage.objects.name, '/', 1)
      and s.org_id = private.current_org_id()
  )
);

create policy "supplier-invoices: owner updates"
on storage.objects for update to authenticated
using (
  bucket_id = 'supplier-invoices'
  and private.is_owner()
  and exists (
    select 1 from public.suppliers s
    where s.id::text = split_part(storage.objects.name, '/', 1)
      and s.org_id = private.current_org_id()
  )
)
with check (
  bucket_id = 'supplier-invoices'
  and private.is_owner()
  and exists (
    select 1 from public.suppliers s
    where s.id::text = split_part(storage.objects.name, '/', 1)
      and s.org_id = private.current_org_id()
  )
);

create policy "supplier-invoices: owner deletes"
on storage.objects for delete to authenticated
using (
  bucket_id = 'supplier-invoices'
  and private.is_owner()
  and exists (
    select 1 from public.suppliers s
    where s.id::text = split_part(storage.objects.name, '/', 1)
      and s.org_id = private.current_org_id()
  )
);
