# نظام إدارة الأقساط — Installment Management System

نظام لإدارة البيع بالتقسيط لمحل تجزئة في مصر: عملاء وأقساط شهرية، تجار (موردون) ومديونياتهم،
محصلون، ورأس مال قابل للمراجعة. الواجهة عربية بالكامل من اليمين إلى اليسار.

A production-grade installment management system for an Egyptian retail shop selling household
tools, electrical appliances, and furniture on monthly installments. Fully Arabic RTL interface.

---

## المزايا · Features

| العربية | English |
|---|---|
| لوحة رئيسية: رأس المال، إجمالي المحصل، تحصيل اليوم، المتبقي على العملاء | Dashboard KPIs, category donut, 30-day collections chart, today's payments |
| العملاء: بحث وفلترة، إضافة/تعديل، صورة البطاقة، أرشفة بدل الحذف | Customers: search & filter, add/edit, ID photo, soft-delete archive |
| الدفعات: تسجيل فوري (optimistic)، سجل كامل، ودفتر انتظام آخر ٥ شهور | Payments: optimistic entry, full history, 5-month performance widget |
| التجار: مديونيات، دفعات، فواتير بملفات مرفقة | Suppliers: balances, payments, invoices with file attachments |
| رأس المال: سجل إيداع/سحب — الرقم في الرئيسية محسوب منه وليس ثابتًا | Capital: auditable deposit/withdrawal ledger |
| صلاحيات: مالك (كل شيء) ومحصّل (قراءة العملاء وتسجيل الدفعات فقط) | Roles: owner (full) and collector (read customers, insert payments) |

## التقنيات · Tech stack

React 18 · Vite · TypeScript · Tailwind CSS v4 · shadcn-style UI (Radix) · TanStack Query ·
Zustand · React Hook Form + Zod · Recharts · Supabase (Postgres + Auth + Storage + RLS) ·
Cloudflare Pages

---

## ١. إعداد مشروع Supabase · Supabase setup

1. أنشئ مشروعًا جديدًا على [supabase.com](https://supabase.com) (الخطة المجانية تكفي).
   Create a new project at supabase.com (free tier is enough).

2. شغّل ملفات الهجرة بالترتيب من **SQL Editor** في لوحة Supabase:
   Run the migrations **in order** from the Supabase SQL Editor:

   ```
   supabase/migrations/00001_schema.sql      -- الجداول والمحفزات · tables & triggers
   supabase/migrations/00002_rls.sql         -- سياسات الأمان · RLS policies
   supabase/migrations/00003_reporting.sql   -- دوال التقارير · reporting RPCs
   supabase/migrations/00004_storage.sql     -- مخازن الملفات · storage buckets
   ```

   أو باستخدام Supabase CLI · or with the CLI:

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

3. أنشئ حساب المالك الأول من **Authentication → Users → Add user** (فعّل Auto Confirm)،
   ثم رقّه إلى مالك بهذا الأمر في SQL Editor:
   Create the first user, then promote them to owner:

   ```sql
   update public.profiles
   set role = 'owner', full_name = 'اسم المالك'
   where id = (select id from auth.users where email = 'owner@example.com');
   ```

4. (اختياري) بيانات تجريبية — بعد إنشاء المالك:
   (Optional) sample data — **after** the owner exists:

   ```
   supabase/seed.sql
   ```

   يضيف ١٠ عملاء و٣ تجار ودفعات على مدى ٦ شهور وحركات رأس مال.
   Adds 10 customers, 3 suppliers, 6 months of payments, and capital entries.

5. **إضافة محصّل جديد:** أنشئ له حسابًا من Authentication → Add user؛ سيظهر تلقائيًا في صفحة
   «الفريق» بدور «محصّل» لتعديل اسمه وهاتفه.
   To add a collector, create the user in the Supabase dashboard — they appear in the Team page
   with the `collector` role by default.

## ٢. متغيرات البيئة · Environment variables

انسخ `.env.example` إلى `.env` واملأ القيم من **Project Settings → API**:
Copy `.env.example` to `.env` and fill in the values from Project Settings → API:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

مفتاح `anon` آمن للاستخدام في المتصفح — الحماية الفعلية عبر RLS.
The `anon` key is safe in the browser; RLS does the actual authorization.

## ٣. التشغيل محليًا · Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # فحص الأنواع + بناء الإنتاج · type-check + production build
npm run lint         # oxlint
```

## ٤. النشر على Cloudflare Pages · Deploy

**من لوحة تحكم Cloudflare · via the dashboard**

1. Workers & Pages → Create → Pages → Connect to Git، واختر المستودع.
2. إعدادات البناء · build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Settings → Environment variables، أضف `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`
   لبيئتي Production و Preview. **متغيرات Vite تُقرأ وقت البناء** — أي تعديل يتطلب إعادة نشر.
   Vite inlines env vars at build time, so changing them requires a redeploy.

**من سطر الأوامر · via Wrangler**

```bash
npm run build
npx wrangler pages deploy dist
```

`public/_redirects` يوجّه كل المسارات إلى `index.html` حتى تعمل مسارات SPA عند تحديث الصفحة.
`public/_redirects` handles SPA routing so deep links survive a refresh.

## ٥. تحديث أنواع قاعدة البيانات · Regenerating DB types

`src/types/database.types.ts` مكتوب يدويًا ليطابق ملفات الهجرة. بعد أي تعديل على المخطط:
Hand-written to match the migrations. After a schema change:

```bash
npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.types.ts
```

---

## بنية المشروع · Project structure

```
supabase/
  migrations/          # SQL: schema, RLS, RPCs, storage
  seed.sql             # بيانات تجريبية · sample data
src/
  components/ui/       # shadcn-style primitives (RTL-safe logical properties)
  components/layout/   # الهيكل والشريط الجانبي · app shell & sidebar
  features/
    auth/              # دخول، حراس المسارات، صفحة الفريق
    customers/         # قائمة، نموذج، صفحة العميل
    payments/          # تسجيل الدفعات، السجل، دفتر الانتظام
    dashboard/         # المؤشرات، الرسوم، رأس المال
    suppliers/         # التجار، الدفعات، الفواتير
  lib/                 # عميل Supabase، التنسيق، الأخطاء، التسميات
  types/               # أنواع قاعدة البيانات
```

كل feature يحتوي `api/` (استدعاءات Supabase) و `hooks/` (TanStack Query) و `components/`
و `schemas/` (Zod). المكوّنات لا تستدعي Supabase مباشرة.
Each feature keeps its own `api/`, `hooks/`, `components/`, and `schemas/`. Components never call
Supabase directly — all access goes through hooks.

## ملاحظات معمارية · Architecture notes

- **الأموال · Money:** `numeric(12,2)` في قاعدة البيانات، وكل الحساب يتم في Postgres عبر
  المحفزات. الواجهة تعرض فقط بصيغة الجنيه المصري. لا حسابات بأرقام عشرية في JavaScript.
  All balance math happens in Postgres triggers — never in JS floats.
- **المتبقي · Remaining balance:** محفّز على `customer_payments` و`supplier_payments` يخصم
  عند الإضافة ويعيد المبلغ عند الحذف، ويرفض أي دفعة أكبر من المتبقي.
  Triggers deduct on insert, restore on delete, and reject overpayments.
- **الحذف · Deletion:** العملاء يُؤرشفون (`archived_at`) ولا يُحذفون، حفاظًا على سجل الدفعات.
  Customers are archived, not deleted, so payment history stays intact.
- **الملفات · Files:** مخزنا `national-ids` و`supplier-invoices` خاصان، والوصول عبر روابط
  موقّعة مؤقتة فقط. Private buckets; access via short-lived signed URLs only.
- **الصلاحيات · Permissions:** RLS مفعّل على كل الجداول. المحصّل لا يرى التجار ولا رأس المال،
  ولا يستطيع تعديل بيانات العملاء أو حذف الدفعات.
  RLS on every table; collectors cannot see suppliers or capital, nor edit customers.
