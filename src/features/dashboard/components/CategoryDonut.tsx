import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TooltipContentProps, TooltipValueType } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { useCollectionsByCategory } from '@/features/dashboard/hooks/useDashboard'
import { toNumber } from '@/features/dashboard/components/chartUtils'
import { categoryLabels } from '@/lib/labels'
import { formatEGP } from '@/lib/format'
import type { Enums } from '@/types/database.types'

type Category = Enums<'product_category'>

// Fixed assignment: color follows the entity, never its rank.
const categoryColors: Record<Category, string> = {
  household: 'var(--chart-1)',
  appliances: 'var(--chart-2)',
  furniture: 'var(--chart-3)',
}

const orderedCategories: Category[] = ['household', 'appliances', 'furniture']

interface Slice {
  category: Category
  name: string
  value: number
}

function DonutTooltip({ active, payload }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null
  const slice = payload[0]
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold">{slice.name}</p>
      <p className="tabular text-muted-foreground">{formatEGP(toNumber(slice.value))}</p>
    </div>
  )
}

export function CategoryDonut() {
  const { data, isPending, isError, refetch } = useCollectionsByCategory()

  const slices: Slice[] = orderedCategories.map((category) => ({
    category,
    name: categoryLabels[category],
    value: data?.find((row) => row.category === category)?.total ?? 0,
  }))
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>التحصيل حسب نوع البضاعة</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex items-center gap-6">
            <Skeleton className="h-44 w-44 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} className="py-6" />
        ) : total === 0 ? (
          <EmptyState title="لا توجد تحصيلات بعد" className="py-6" />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <div dir="ltr" className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="100%"
                    stroke="var(--card)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {slices.map((slice) => (
                      <Cell key={slice.category} fill={categoryColors[slice.category]} />
                    ))}
                  </Pie>
                  <Tooltip content={(props) => <DonutTooltip {...props} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* القيم معروضة نصيًا بجوار الرسم — الهوية ليست باللون وحده */}
            <ul className="w-full flex-1 space-y-2">
              {slices.map((slice) => (
                <li
                  key={slice.category}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: categoryColors[slice.category] }}
                    />
                    {slice.name}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {formatEGP(slice.value)}
                    <span className="ms-1 text-xs">
                      ({total > 0 ? Math.round((slice.value / total) * 100) : 0}٪)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
