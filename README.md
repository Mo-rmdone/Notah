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
   supabase/migrations/00005_harden_trigger_functions.sql  -- تقييد دوال المحفزات
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

## ٤. فحص ملفات الهجرة · Verifying the migrations

يوجد فحص يشغّل الهجرات على Postgres مؤقت داخل Docker ويتحقق من المحفزات وسياسات الأمان،
دون المساس بمشروع Supabase:
A test harness applies the migrations to a throwaway Postgres container and checks the balance
triggers, the reporting RPCs, and every RLS rule — without touching your Supabase project:

```bash
bash supabase/tests/run.sh
```

يتحقق من: خصم الدفعة واستعادتها عند الحذف، رفض الدفعة الأكبر من المتبقي، إعادة حساب المتبقي عند
التعديل، وأن المحصّل لا يستطيع تعديل العملاء أو رؤية التجار ورأس المال.
Covers: payment deduct/restore, overpayment rejection, server-side recomputation of balances, and
that a collector cannot edit customers, delete payments, or see suppliers and capital.

## ٥. النشر على Cloudflare · Deploy

`wrangler.toml` مضبوط كـ **Worker يقدّم ملفات ثابتة** (Workers Static Assets)، وهو ما يوافق أمر
النشر الافتراضي `npx wrangler deploy`.
`wrangler.toml` is configured as a **Worker serving static assets**, which matches the default
`npx wrangler deploy` deploy command.

**من لوحة تحكم Cloudflare · via the dashboard**

1. Workers & Pages → Create → Connect to Git، واختر المستودع.
2. إعدادات البناء · build settings:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
3. Settings → Variables and Secrets، أضف `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`.
   **متغيرات Vite تُدمج وقت البناء** — لن تسري إلا بعد إعادة نشر، والبناء ينجح حتى لو كانت ناقصة
   (ستظهر شاشة «إعدادات Supabase غير مكتملة» بدل صفحة الدخول).
   Vite inlines env vars at build time: the build still succeeds without them, and the site simply
   renders the setup screen — so set them *before* the build you intend to ship, and redeploy after
   any change.

**من سطر الأوامر · via Wrangler**

```bash
npm run build
npx wrangler deploy              # أو للتحقق دون نشر · or validate without deploying:
npx wrangler deploy --dry-run
```

`not_found_handling = "single-page-application"` في `wrangler.toml` يعيد `index.html` لأي مسار غير
معروف حتى تعمل مسارات SPA عند تحديث الصفحة.

> لا تُضِف ملف `public/_redirects` بقاعدة `/* /index.html 200`: هذه القاعدة صحيحة على Cloudflare
> Pages لكن Workers ترفضها عند النشر بخطأ «Infinite loop detected»، لأن `not_found_handling` يؤدي
> نفس الغرض أصلًا.
`not_found_handling = "single-page-application"` serves `index.html` for unknown paths so deep links
survive a refresh.

> Do not add a `public/_redirects` file containing `/* /index.html 200`. That rule is correct on
> Cloudflare Pages, but Workers rejects it at deploy time with "Infinite loop detected" — Workers
> already normalizes `/index.html`, and `not_found_handling` covers the same case.

## ٦. نشر دوال الحافة · Deploying Edge Functions

**هدف نشر ثانٍ مستقل عن Cloudflare.** نشر الواجهة لا ينشر هذه الدوال، ونشرها لا يحدّث الواجهة.

A **second deploy target, independent of Cloudflare.** Shipping the frontend does not ship these
functions, and vice versa. Deploy them whenever `supabase/functions/**` changes:

```bash
npx supabase functions deploy manage-collector --project-ref <ref>
```

| الدالة · Function | ماذا تفعل · What it does |
|---|---|
| `manage-collector` | إنشاء حساب محصّل وحذفه · creates and deletes collector accounts |

`manage-collector` تحتاج `service_role`، وهو مفتاح يتجاوز كل سياسات RLS ولا يجوز أن يصل إلى
المتصفح — لذلك العملية على الخادم. المفتاح **تحقنه المنصة تلقائيًا** في `SUPABASE_SERVICE_ROLE_KEY`،
فلا سر يُضاف يدويًا ولا يُكتب في أي ملف.

`manage-collector` needs the `service_role` key, which bypasses every RLS policy and must never
reach the browser — hence a server-side function. The platform injects that key automatically as
`SUPABASE_SERVICE_ROLE_KEY`, so **there is no secret to add or store anywhere**. Keep `verify_jwt`
enabled; the function additionally resolves the caller's token to a profile and refuses anyone who
is not an active owner of the target organization.

عدد المحصّلين محدود بـ `organizations.max_collectors` (افتراضيًا ٢). الحد مفروض في المحفّز
`enforce_collector_limit` داخل قاعدة البيانات، والدالة تفحصه مسبقًا لتعطي رسالة أوضح فقط.

The collector cap lives in `organizations.max_collectors` (default 2) and is enforced by the
`enforce_collector_limit` trigger in the database; the function pre-checks it only to return a
clearer message. Suspending a collector (`active = false`) frees a slot without deleting the
account, which keeps their name on the payments they already collected.

## ٧. تحديث أنواع قاعدة البيانات · Regenerating DB types

`src/types/database.types.ts` مولَّد من المخطط الحيّ. بعد أي تعديل على المخطط:
Generated from the live schema. After a schema change:

```bash
npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.types.ts
```

---

## بنية المشروع · Project structure

```
supabase/
  migrations/          # SQL: schema, RLS, RPCs, storage
  seed.sql             # بيانات تجريبية · sample data
  tests/               # فحص الهجرات على Docker · migration test harness
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
