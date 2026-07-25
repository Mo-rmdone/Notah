import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Archive, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states'
import { useProfile } from '@/features/auth/hooks/useProfile'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import {
  customerFilterDefaults,
  type CustomerFilters,
} from '@/features/customers/schemas/customer'
import { categoryLabels, categoryOptions, legalStatusLabels } from '@/lib/labels'
import { formatEGP } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebounce'
import { cn } from '@/lib/utils'

export function CustomersPage() {
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const isOwner = profile?.role === 'owner'

  const [filters, setFilters] = useState<CustomerFilters>({ ...customerFilterDefaults })
  const debouncedSearch = useDebouncedValue(filters.search)
  const { data: customers, isPending, isError, refetch } = useCustomers({
    ...filters,
    search: debouncedSearch,
  })

  return (
    <div>
      <PageHeader
        title="العملاء"
        description="بحث ومتابعة حسابات عملاء الأقساط"
        actions={
          isOwner ? (
            <Button asChild>
              <Link to="/customers/new">
                <Plus />
                إضافة عميل
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_200px_200px_auto]">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو الشهرة أو الهاتف أو الرقم القومي…"
            className="ps-9"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Select
          value={filters.category}
          onValueChange={(value) =>
            setFilters((f) => ({ ...f, category: value as CustomerFilters['category'] }))
          }
        >
          <SelectTrigger aria-label="نوع البضاعة">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.legalStatus}
          onValueChange={(value) =>
            setFilters((f) => ({ ...f, legalStatus: value as CustomerFilters['legalStatus'] }))
          }
        >
          <SelectTrigger aria-label="الحالة القانونية">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="clean">{legalStatusLabels.clean}</SelectItem>
            <SelectItem value="in_litigation">{legalStatusLabels.in_litigation}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={filters.archived ? 'secondary' : 'outline'}
          onClick={() => setFilters((f) => ({ ...f, archived: !f.archived }))}
        >
          <Archive />
          {filters.archived ? 'عرض النشطين' : 'الأرشيف'}
        </Button>
      </div>

      <Card>
        {isPending ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : customers.length === 0 ? (
          <EmptyState
            title={filters.archived ? 'الأرشيف فارغ' : 'لا يوجد عملاء مطابقون'}
            description={
              filters.archived
                ? 'لم يتم أرشفة أي عميل بعد'
                : 'جرّب تعديل البحث أو أضف عميلًا جديدًا'
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead className="hidden sm:table-cell">الهاتف</TableHead>
                <TableHead className="hidden lg:table-cell">الرقم القومي</TableHead>
                <TableHead className="hidden md:table-cell">النوع</TableHead>
                <TableHead>المتبقي</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <TableCell>
                    <Link
                      to={`/customers/${customer.id}`}
                      className="font-semibold hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {customer.full_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">({customer.known_as})</p>
                  </TableCell>
                  <TableCell dir="ltr" className="hidden text-end tabular sm:table-cell">
                    {customer.phone}
                  </TableCell>
                  <TableCell dir="ltr" className="hidden text-end tabular lg:table-cell">
                    {customer.national_id}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary">{categoryLabels[customer.category]}</Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'tabular font-semibold',
                      customer.remaining_amount === 0 && 'text-status-paid',
                    )}
                  >
                    {formatEGP(customer.remaining_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.legal_status === 'clean' ? 'paid' : 'missed'}>
                      {legalStatusLabels[customer.legal_status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
