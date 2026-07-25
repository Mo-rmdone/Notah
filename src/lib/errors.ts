// Maps raised DB errors (see migrations) and common Postgres failures
// to user-facing Arabic messages for toasts.

const knownErrors: Array<{ match: string; message: string }> = [
  { match: 'PAYMENT_EXCEEDS_REMAINING', message: 'الدفعة أكبر من المبلغ المتبقي على الحساب' },
  { match: 'INVALID_TOTALS', message: 'المبلغ الإجمالي أقل من مجموع المدفوعات المسجلة' },
  { match: 'PAYMENT_CUSTOMER_IMMUTABLE', message: 'لا يمكن نقل الدفعة لعميل آخر' },
  { match: 'PAYMENT_SUPPLIER_IMMUTABLE', message: 'لا يمكن نقل الدفعة لتاجر آخر' },
  { match: 'customers_national_id_check', message: 'الرقم القومي يجب أن يكون 14 رقمًا' },
  { match: 'customers_phone_check', message: 'رقم الهاتف يجب أن يكون بصيغة 01xxxxxxxxx' },
  { match: 'duplicate key', message: 'هذا السجل موجود بالفعل' },
  { match: 'row-level security', message: 'ليست لديك صلاحية لتنفيذ هذه العملية' },
  { match: 'Invalid login credentials', message: 'بيانات الدخول غير صحيحة' },
  { match: 'Failed to fetch', message: 'تعذر الاتصال بالخادم — تحقق من اتصالك بالإنترنت' },
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
  return 'حدث خطأ غير متوقع — حاول مرة أخرى'
}
