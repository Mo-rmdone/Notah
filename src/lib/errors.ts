// Maps raised DB errors (see migrations) and common Postgres failures
// to user-facing Arabic messages for toasts.

const knownErrors: Array<{ match: string; message: string }> = [
  { match: 'PAYMENT_EXCEEDS_REMAINING', message: 'الدفعة أكبر من المبلغ المتبقي على الحساب' },
  {
    match: 'COLLECTOR_LIMIT_REACHED',
    message: 'تم بلوغ الحد الأقصى لعدد المحصّلين — أوقف حساب محصّل حالي أو احذفه',
  },
  { match: 'ORG_IMMUTABLE', message: 'لا يمكن نقل السجل إلى محل آخر' },
  { match: 'INVALID_TOTALS', message: 'المبلغ الإجمالي أقل من مجموع المدفوعات المسجلة' },
  { match: 'PAYMENT_CUSTOMER_IMMUTABLE', message: 'لا يمكن نقل الدفعة لعميل آخر' },
  { match: 'PAYMENT_SUPPLIER_IMMUTABLE', message: 'لا يمكن نقل الدفعة لتاجر آخر' },
  { match: 'customers_national_id_check', message: 'الرقم القومي يجب أن يكون 14 رقمًا' },
  { match: 'customers_phone_check', message: 'رقم الهاتف يجب أن يكون بصيغة 01xxxxxxxxx' },
  { match: 'duplicate key', message: 'هذا السجل موجود بالفعل' },
  { match: 'row-level security', message: 'ليست لديك صلاحية لتنفيذ هذه العملية' },
  { match: 'Invalid login credentials', message: 'بيانات الدخول غير صحيحة' },
  {
    match: 'Failed to fetch',
    message: 'تعذر الاتصال بالخادم — تحقق من إعدادات Supabase ومن اتصالك بالإنترنت',
  },
]

export function arabicErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error)

  for (const { match, message } of knownErrors) {
    if (raw.includes(match)) return message
  }

  // رسالة عربية تعني أنها كُتبت في طبقتنا (دالة حافة أو استثناء من المخطط)،
  // وهي أدق من أي بديل عام — تُعرض كما هي. الترتيب مقصود: الرموز أعلاه تفوز
  // أولًا، لأن استثناءات Postgres تحمل الرمز والرسالة العربية معًا.
  // An Arabic message means our own layer wrote it — an Edge Function or a
  // schema exception — and it is more specific than any generic replacement, so
  // it passes through. The order matters: the codes above win first, because a
  // raised Postgres exception carries both the code and the Arabic text.
  if (/[؀-ۿ]/.test(raw)) return raw

  return 'حدث خطأ غير متوقع — حاول مرة أخرى'
}
