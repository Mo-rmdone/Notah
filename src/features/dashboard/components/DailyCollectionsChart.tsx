import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps, TooltipValueType } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/states'
import { useDailyCollections } from '@/features/dashboard/hooks/useDashboard'
import { toNumber } from '@/features/dashboard/components/chartUtils'
import { formatCompactNumber, formatDate, formatDayMonth, formatEGP } from '@/lib/format'

function BarTooltip({
  active,
  payload,
  label,
}: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null
  return (
    <div dir="rtl" className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold">{formatDate(String(label))}</p>
      <p className="tabular text-muted-foreground">{formatEGP(toNumber(payload[0].value))}</p>
    </div>
  )
}

export function DailyCollectionsChart() {
  const { data, isPending, isError, refetch } = useDailyCollections(30)
  const total = data?.reduce((sum, row) => sum + row.total, 0) ?? 0

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>التحصيل اليومي — آخر 30 يوم</CardTitle>
        {data ? (
          <span className="tabular text-sm font-bold text-primary">{formatEGP(total)}</span>
        ) : null}
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} className="py-6" />
        ) : (
          <div dir="ltr" className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(value: string) => formatDayMonth(value)}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={(value: number) => formatCompactNumber(value)}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  content={(props) => <BarTooltip {...props} />}
                  cursor={{ fill: 'var(--muted)' }}
                />
                <Bar
                  dataKey="total"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
