import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states'
import { SupplierFormDialog } from '@/features/suppliers/components/SupplierFormDialog'
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers'
import { categoryLabels } from '@/lib/labels'
import { formatEGP } from '@/lib/format'
import { cn } from '@/lib/utils'

export function SuppliersPage() {
  const navigate = useNavigate()
  const { data: suppliers, isPending, isError, refetch } = useSuppliers()

  return (
    <div>
      <PageHeader
        title="التجار"
        description="متابعة مديونيات الموردين وأقساطهم الشهرية"
        actions={
          <SupplierFormDialog
            trigger={
              <Button>
                <Plus />
                إضافة تاجر
              </Button>
            }
          />
        }
      />

      <Card>
        {isPending ? (
          <TableSkeleton rows={4} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : suppliers.length === 0 ? (
          <EmptyState
            title="لا يوجد تجار مسجلون"
            description="أضف أول تاجر لتتبع مديونيته وفواتيره"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاجر</TableHead>
                <TableHead className="hidden sm:table-cell">نوع التجارة</TableHead>
                <TableHead className="hidden md:table-cell">الهاتف</TableHead>
                <TableHead>المتبقي</TableHead>
                <TableHead className="hidden lg:table-cell">القسط الشهري</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/suppliers/${supplier.id}`)}
                >
                  <TableCell>
                    <Link
                      to={`/suppliers/${supplier.id}`}
                      className="font-semibold hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{categoryLabels[supplier.trade_type]}</Badge>
                  </TableCell>
                  <TableCell dir="ltr" className="hidden text-end tabular md:table-cell">
                    {supplier.phone_1 ?? '—'}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'tabular font-semibold',
                      supplier.remaining_amount === 0 && 'text-status-paid',
                    )}
                  >
                    {formatEGP(supplier.remaining_amount)}
                  </TableCell>
                  <TableCell className="hidden tabular lg:table-cell">
                    {formatEGP(supplier.monthly_payment)}
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
