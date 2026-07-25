-- =============================================================================
-- 00005_harden_trigger_functions.sql — منع استدعاء دوال المحفزات عبر الـ API
-- =============================================================================
-- دوال المحفزات تُنشأ بصلاحية تنفيذ للجميع افتراضيًا، فيراها فاحص الأمان في
-- Supabase مكشوفة على /rest/v1/rpc/<name>. تنفيذ المحفّز نفسه لا يمر على هذه
-- الصلاحية إطلاقًا، لذا السحب هنا لا يغيّر شيئًا في حساب الأرصدة.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, so the Supabase
-- security linter flags these five as callable at /rest/v1/rpc/<name>
-- (lints 0028 / 0029). Firing a trigger does NOT consult EXECUTE privileges on
-- the trigger function, so revoking is a pure tightening: the balance triggers
-- keep working exactly as before.
--
-- Verified against the live database after applying: insert sets remaining,
-- a payment deducts it, an overpayment is rejected with
-- PAYMENT_EXCEEDS_REMAINING, and deleting the payment restores the balance.

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.customers_set_remaining() from public, anon, authenticated;
revoke all on function public.apply_customer_payment() from public, anon, authenticated;
revoke all on function public.suppliers_set_remaining() from public, anon, authenticated;
revoke all on function public.apply_supplier_payment() from public, anon, authenticated;
