import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/states'
import { useCustomerPerformance } from '@/features/payments/hooks/usePayments'
import { formatEGP, formatMonth } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PerformanceMonth } from '@/features/payments/api/payments'

const statusStyles: Record<string, { stub: string; dot: string; label: string }> = {
  paid: { stub: 'bg-status-paid-bg text-status-paid', dot: 'bg-status-paid', label: 'مدفوع' },
  partial: {
    stub: 'bg-status-partial-bg text-status-partial',
    dot: 'bg-status-partial',
    label: 'جزئي',
  },
  missed: {
    stub: 'bg-status-missed-bg text-status-missed',
    dot: 'bg-status-missed',
    label: 'متأخر',
  },
  na: { stub: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground/40', label: '—' },
}

/**
 * دفتر الكوبونات — آخر 5 شهور، كل شهر «كعب إيصال» ملوّن بحالته:
 * أخضر = قسط كامل، أصفر = جزئي، أحمر = لم يدفع.
 */
export function PerformanceWidget({ customerId }: { customerId: string }) {
  const { data: months, isPending, isError, refetch } = useCustomerPerformance(customerId)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>انتظام السداد — آخر 5 شهور</CardTitle>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {(['paid', 'partial', 'missed'] as const).map((status) => (
            <span key={status} className="flex items-center gap-1">
              <span className={cn('inline-block h-2 w-2 rounded-full', statusStyles[status].dot)} />
              {statusStyles[status].label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-24 flex-1" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} className="py-6" />
        ) : (
          <div className="flex overflow-hidden rounded-lg border border-dashed">
            {months.map((month, index) => (
              <MonthStub key={month.month_start} month={month} isLast={index === months.length - 1} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MonthStub({ month, isLast }: { month: PerformanceMonth; isLast: boolean }) {
  const style = statusStyles[month.status] ?? statusStyles.na
  return (
    <div
      className={cn(
        'flex-1 px-1 py-3 text-center',
        !isLast && 'border-e border-dashed border-border',
        style.stub,
      )}
      title={formatMonth(month.month_start)}
    >
      <p className="truncate text-[11px] font-semibold opacity-80">
        {formatMonth(month.month_start)}
      </p>
      <p className="mt-1 truncate text-sm font-bold tabular">
        {month.status === 'na' && month.paid === 0 ? '—' : formatEGP(month.paid)}
      </p>
      <p className="mt-0.5 truncate text-[10px] opacity-70">
        {month.status === 'na' ? '' : `المطلوب ${formatEGP(month.expected)}`}
      </p>
    </div>
  )
}
