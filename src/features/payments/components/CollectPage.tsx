import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { AddPaymentDialog } from '@/features/payments/components/AddPaymentDialog'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import { legalStatusLabels } from '@/lib/labels'
import { formatEGP } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebounce'
import { cn } from '@/lib/utils'

export function CollectPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const hasSearch = debouncedSearch.trim().length > 0

  const { data: customers, isPending, isError, refetch } = useCustomers({
    search: debouncedSearch,
    category: 'all',
    legalStatus: 'all',
    archived: false,
  })

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="تسجيل دفعة" description="ابحث عن العميل ثم سجّل الدفعة مباشرة" />

      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="اسم العميل أو الشهرة أو الهاتف أو الرقم القومي…"
          className="h-12 ps-9 text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {!hasSearch ? (
        <EmptyState
          title="ابدأ بالبحث عن العميل"
          description="اكتب جزءًا من الاسم أو رقم الهاتف لعرض النتائج"
        />
      ) : isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : customers.length === 0 ? (
        <EmptyState title="لا توجد نتائج مطابقة" description="تأكد من كتابة الاسم أو الرقم صحيحًا" />
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link
                    to={`/customers/${customer.id}`}
                    className="font-bold hover:underline"
                  >
                    {customer.full_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    ({customer.known_as}) —{' '}
                    <span dir="ltr" className="tabular">
                      {customer.phone}
                    </span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'tabular font-bold',
                        customer.remaining_amount === 0 ? 'text-status-paid' : 'text-primary',
                      )}
                    >
                      المتبقي: {formatEGP(customer.remaining_amount)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      القسط: {formatEGP(customer.monthly_installment)}
                    </span>
                    {customer.legal_status === 'in_litigation' ? (
                      <Badge variant="missed">{legalStatusLabels.in_litigation}</Badge>
                    ) : null}
                  </div>
                </div>
                <AddPaymentDialog customer={customer} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
