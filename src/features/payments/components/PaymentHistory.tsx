import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useCustomerPayments, useDeletePayment } from '@/features/payments/hooks/usePayments'
import { formatDate, formatEGP } from '@/lib/format'
import type { CustomerPaymentRow } from '@/features/payments/api/payments'

export function PaymentHistory({ customerId }: { customerId: string }) {
  const { data: payments, isPending, isError, refetch } = useCustomerPayments(customerId)
  const { data: profile } = useProfile()
  const isOwner = profile?.role === 'owner'

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل الدفعات</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isPending ? (
          <TableSkeleton rows={4} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : payments.length === 0 ? (
          <EmptyState title="لا توجد دفعات مسجلة" description="سجّل أول دفعة من زر «تسجيل دفعة»" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead className="hidden sm:table-cell">المحصّل</TableHead>
                <TableHead className="hidden md:table-cell">ملاحظة</TableHead>
                {isOwner ? <TableHead className="w-14" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell className="tabular font-semibold">
                    {formatEGP(payment.amount)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {payment.collector?.full_name || '—'}
                  </TableCell>
                  <TableCell className="hidden max-w-48 truncate text-muted-foreground md:table-cell">
                    {payment.note || '—'}
                  </TableCell>
                  {isOwner ? (
                    <TableCell>
                      {payment.id.startsWith('optimistic-') ? null : (
                        <DeletePaymentButton payment={payment} customerId={customerId} />
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function DeletePaymentButton({
  payment,
  customerId,
}: {
  payment: CustomerPaymentRow
  customerId: string
}) {
  const deletePayment = useDeletePayment(customerId)

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="حذف الدفعة">
          <Trash2 className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف الدفعة؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم حذف دفعة {formatEGP(payment.amount)} بتاريخ {formatDate(payment.payment_date)}{' '}
            وإعادة المبلغ إلى المتبقي على العميل.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => deletePayment.mutate(payment.id)}
          >
            حذف
          </AlertDialogAction>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
