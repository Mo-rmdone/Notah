import { Link } from 'react-router-dom'
import { CalendarCheck2, HandCoins, Scale, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states'
import { CategoryDonut } from '@/features/dashboard/components/CategoryDonut'
import { DailyCollectionsChart } from '@/features/dashboard/components/DailyCollectionsChart'
import { useDashboardSummary, useTodayPayments } from '@/features/dashboard/hooks/useDashboard'
import { formatEGP, formatTime } from '@/lib/format'
import type { LucideIcon } from 'lucide-react'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="الرئيسية" description="نظرة عامة على التحصيل ورأس المال" />
      <KpiCards />
      <div className="grid gap-6 xl:grid-cols-[2fr_3fr]">
        <CategoryDonut />
        <DailyCollectionsChart />
      </div>
      <TodayPaymentsTable />
    </div>
  )
}

function KpiCards() {
  const { data: summary, isPending, isError, refetch } = useDashboardSummary()

  if (isError) {
    return (
      <Card>
        <ErrorState onRetry={() => void refetch()} className="py-8" />
      </Card>
    )
  }

  const items: Array<{ label: string; value: number | null; icon: LucideIcon; hint?: string }> = [
    { label: 'رأس المال', value: summary?.total_capital ?? null, icon: Wallet },
    { label: 'إجمالي المحصّل حتى الآن', value: summary?.total_collected ?? null, icon: HandCoins },
    {
      label: 'تحصيل اليوم',
      value: summary?.collected_today ?? null,
      icon: CalendarCheck2,
      hint: summary ? `هذا الشهر: ${formatEGP(summary.collected_this_month)}` : undefined,
    },
    { label: 'المتبقي على العملاء', value: summary?.total_outstanding ?? null, icon: Scale },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground md:text-sm">{item.label}</p>
              <item.icon className="h-4 w-4 shrink-0 text-primary/60" />
            </div>
            {isPending || item.value === null ? (
              <Skeleton className="mt-2 h-8 w-24" />
            ) : (
              <p className="mt-1 truncate text-xl font-bold tabular md:text-2xl">
                {formatEGP(item.value)}
              </p>
            )}
            {item.hint ? <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TodayPaymentsTable() {
  const { data: payments, isPending, isError, refetch } = useTodayPayments()

  return (
    <Card>
      <CardHeader>
        <CardTitle>دفعات اليوم</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isPending ? (
          <TableSkeleton rows={3} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : payments.length === 0 ? (
          <EmptyState title="لا توجد دفعات اليوم بعد" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead className="hidden sm:table-cell">المحصّل</TableHead>
                <TableHead className="hidden md:table-cell">الوقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Link
                      to={`/customers/${payment.customer_id}`}
                      className="font-semibold hover:underline"
                    >
                      {payment.customer_name}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular font-semibold">
                    {formatEGP(payment.amount)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{payment.collector_name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatTime(payment.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
