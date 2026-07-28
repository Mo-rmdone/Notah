import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toWhatsAppNumber } from '@/lib/phone'
import { cn } from '@/lib/utils'

// شعار واتساب: lucide لا يتضمن أيقونات العلامات التجارية، وأيقونة رسائل عامة
// تجعل الزر يبدو وكأنه يفتح الرسائل النصية.
// The WhatsApp mark: lucide carries no brand icons, and a generic message
// bubble would read as "send an SMS" instead.
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn('h-4 w-4', className)}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

/**
 * رقم قابل للاتصال، ومعه واتساب حين يكون الرقم مصريًا صالحًا.
 *
 * المحصّل يقف أمام باب العميل ومعه هاتفه، فالرقم المعروض وحده ليس كافيًا —
 * الإجراءان المطلوبان دائمًا هما الاتصال والمراسلة.
 *
 * A callable number, with WhatsApp when the number is a valid Egyptian one. The
 * collector is standing at a customer's door holding a phone, so a number on
 * screen is not the point — calling and messaging are.
 */
export function PhoneLink({
  phone,
  className,
  showCallIcon = false,
}: {
  phone: string | null | undefined
  className?: string
  /** أيقونة سماعة قبل الرقم — للصفحات لا للجداول · a handset before the number, for pages not tables */
  showCallIcon?: boolean
}) {
  if (!phone) return <span className="text-muted-foreground">—</span>

  const whatsapp = toWhatsAppNumber(phone)

  // صفوف الجداول تنتقل بالضغط عليها، والاتصال أو المراسلة إجراء مقصود بذاته —
  // بلا هذا تفتح ضغطةٌ واحدة واتساب وصفحة العميل معًا.
  // Table rows navigate on click, and calling or messaging is a deliberate
  // action in its own right — without this, one tap opens WhatsApp *and* the
  // customer page behind it.
  const stopRowClick = (event: React.MouseEvent) => event.stopPropagation()

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <a
        dir="ltr"
        href={`tel:${phone}`}
        onClick={stopRowClick}
        className="tabular inline-flex items-center gap-1.5 text-primary hover:underline"
      >
        {showCallIcon ? <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
        {phone}
      </a>
      {whatsapp ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-status-paid hover:text-status-paid"
        >
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stopRowClick}
            aria-label={`مراسلة ${phone} على واتساب`}
          >
            <WhatsAppIcon />
          </a>
        </Button>
      ) : null}
    </span>
  )
}
