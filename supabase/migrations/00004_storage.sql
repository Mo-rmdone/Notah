-- =============================================================================
-- 00004_storage.sql — مخازن الملفات الخاصة (private storage buckets)
-- Both buckets are private; the app only ever uses signed URLs.
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('national-ids', 'national-ids', false),
  ('supplier-invoices', 'supplier-invoices', false)
on conflict (id) do nothing;

-- صور البطاقات: يرفعها ويعدلها المالك فقط، ويقرؤها أي مستخدم نشط
create policy "national-ids: active users read"
on storage.objects for select to authenticated
using (bucket_id = 'national-ids' and private.is_active_user());

create policy "national-ids: owner writes"
on storage.objects for insert to authenticated
with check (bucket_id = 'national-ids' and private.is_owner());

create policy "national-ids: owner updates"
on storage.objects for update to authenticated
using (bucket_id = 'national-ids' and private.is_owner())
with check (bucket_id = 'national-ids' and private.is_owner());

create policy "national-ids: owner deletes"
on storage.objects for delete to authenticated
using (bucket_id = 'national-ids' and private.is_owner());

-- فواتير التجار: المالك فقط قراءةً وكتابةً
create policy "supplier-invoices: owner reads"
on storage.objects for select to authenticated
using (bucket_id = 'supplier-invoices' and private.is_owner());

create policy "supplier-invoices: owner writes"
on storage.objects for insert to authenticated
with check (bucket_id = 'supplier-invoices' and private.is_owner());

create policy "supplier-invoices: owner updates"
on storage.objects for update to authenticated
using (bucket_id = 'supplier-invoices' and private.is_owner())
with check (bucket_id = 'supplier-invoices' and private.is_owner());

create policy "supplier-invoices: owner deletes"
on storage.objects for delete to authenticated
using (bucket_id = 'supplier-invoices' and private.is_owner());
