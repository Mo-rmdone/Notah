/**
 * يحوّل الرقم المصري إلى الصيغة التي يقبلها wa.me: كود الدولة بلا «+» وبلا صفر
 * بادئ — أي 01012345678 تصبح 201012345678.
 *
 * يعيد null لأي شكل غير معروف، فيُعرض الرقم بلا زر واتساب بدل رابط يفتح محادثة
 * مع رقم خاطئ.
 *
 * Converts an Egyptian number into the form wa.me accepts: country code, no
 * "+", no leading zero — 01012345678 becomes 201012345678. Returns null for
 * anything unrecognized, so the number renders without a WhatsApp button rather
 * than with a link that opens a chat with the wrong person.
 */
export function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')

  // محلي · local: 01xxxxxxxxx
  if (/^01\d{9}$/.test(digits)) return `20${digits.slice(1)}`

  // مكتوب دوليًا بالفعل · already international: 201xxxxxxxxx
  if (/^201\d{9}$/.test(digits)) return digits

  return null
}
