import { useNavigate, useParams } from 'react-router-dom'
import { Download, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
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
import { Badge } from '@/components/ui/badge'
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
import { PhoneLink } from '@/components/shared/phone'
import { EmptyState, ErrorState, LoadingState, TableSkeleton } from '@/components/shared/states'
import { InvoiceDialog } from '@/features/suppliers/components/InvoiceDialog'
import { SupplierFormDialog } from '@/features/suppliers/components/SupplierFormDialog'
import { SupplierPaymentDialog } from '@/features/suppliers/components/SupplierPaymentDialog'
import {
  useDeleteSupplier,
  useDeleteSupplierInvoice,
  useDeleteSupplierPayment,
  useOpenInvoiceFile,
  useSupplier,
  useSupplierInvoices,
  useSupplierPayments,
} from '@/features/suppliers/hooks/useSuppliers'
import { categoryLabels } from '@/lib/labels'
import { formatDate, formatEGP } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

export function SupplierDetailPage() {
  const { id } = useParams()
  const { data: supplier, isPending, isError, refetch } = useSupplier(id)

  if (isPending) return <LoadingState />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return <SupplierDetail supplier={supplier} />
}

function SupplierDetail({ supplier }: { supplier: Tables<'suppliers'> }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description={categoryLabels[supplier.trade_type]}
        actions={
          <>
            <SupplierPaymentDialog supplier={supplier} />
            <SupplierFormDialog
              supplier={supplier}
              trigger={
                <Button variant="outline">
                  <Pencil />
                  تعديل
                </Button>
              }
            />
            <DeleteSupplierButton supplier={supplier} />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="إجمالي المديونية" value={supplier.total_owed} />
        <SummaryCard label="المتبقي" value={supplier.remaining_amount} highlight />
        <SummaryCard label="القسط الشهري" value={supplier.monthly_payment} />
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">أرقام الهاتف</p>
            <div className="mt-1 space-y-0.5 text-sm font-semibold">
              {supplier.phone_1 ? (
                <PhoneLink phone={supplier.phone_1} showCallIcon className="flex" />
              ) : null}
              {supplier.phone_2 ? <PhoneLink phone={supplier.phone_2} className="flex" /> : null}
              {!supplier.phone_1 && !supplier.phone_2 ? (
                <span className="text-muted-foreground">—</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <SupplierPaymentsCard supplierId={supplier.id} />
      <SupplierInvoicesCard supplierId={supplier.id} />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <Card className={cn(highlight && 'border-primary bg-accent')}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-1 text-lg font-bold tabular',
            highlight && (value === 0 ? 'text-status-paid' : 'text-primary'),
          )}
        >
          {formatEGP(value)}
        </p>
      </CardContent>
    </Card>
  )
}

function SupplierPaymentsCard({ supplierId }: { supplierId: string }) {
  const { data: payments, isPending, isError, refetch } = useSupplierPayments(supplierId)
  const deletePayment = useDeleteSupplierPayment(supplierId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل الدفعات</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isPending ? (
          <TableSkeleton rows={3} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : payments.length === 0 ? (
          <EmptyState title="لا توجد دفعات مسجلة" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead className="hidden md:table-cell">ملاحظة</TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell className="tabular font-semibold">
                    {formatEGP(payment.amount)}
                  </TableCell>
                  <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                    {payment.note || '—'}
                  </TableCell>
                  <TableCell>
                    <ConfirmDelete
                      title="حذف الدفعة؟"
                      description={`سيتم حذف دفعة ${formatEGP(payment.amount)} بتاريخ ${formatDate(payment.payment_date)} وإعادة المبلغ إلى المتبقي.`}
                      onConfirm={() => deletePayment.mutate(payment.id)}
                      ariaLabel="حذف الدفعة"
                    />
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

function SupplierInvoicesCard({ supplierId }: { supplierId: string }) {
  const { data: invoices, isPending, isError, refetch } = useSupplierInvoices(supplierId)
  const deleteInvoice = useDeleteSupplierInvoice(supplierId)
  const openFile = useOpenInvoiceFile()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>الفواتير</CardTitle>
        <InvoiceDialog supplierId={supplierId} />
      </CardHeader>
      <CardContent className="p-0">
        {isPending ? (
          <TableSkeleton rows={3} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : invoices.length === 0 ? (
          <EmptyState title="لا توجد فواتير" description="أضف فاتورة لحفظ صورتها ومبلغها" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead className="hidden sm:table-cell">التاريخ</TableHead>
                <TableHead className="hidden lg:table-cell">ملاحظة</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-semibold">{invoice.invoice_number}</TableCell>
                  <TableCell className="tabular">{formatEGP(invoice.amount)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDate(invoice.invoice_date)}
                  </TableCell>
                  <TableCell className="hidden max-w-48 truncate text-muted-foreground lg:table-cell">
                    {invoice.note || '—'}
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    {invoice.file_path ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`فتح ملف الفاتورة ${invoice.invoice_number}`}
                        disabled={openFile.isPending}
                        onClick={() => openFile.mutate(invoice.file_path as string)}
                      >
                        <Download />
                      </Button>
                    ) : null}
                    <ConfirmDelete
                      title="حذف الفاتورة؟"
                      description={`سيتم حذف الفاتورة ${invoice.invoice_number} وملفها المرفق نهائيًا.`}
                      onConfirm={() =>
                        deleteInvoice.mutate({ id: invoice.id, filePath: invoice.file_path })
                      }
                      ariaLabel="حذف الفاتورة"
                    />
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

function ConfirmDelete({
  title,
  description,
  onConfirm,
  ariaLabel,
}: {
  title: string
  description: string
  onConfirm: () => void
  ariaLabel: string
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={ariaLabel}>
          <Trash2 className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            حذف
          </AlertDialogAction>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteSupplierButton({ supplier }: { supplier: Tables<'suppliers'> }) {
  const navigate = useNavigate()
  const deleteSupplier = useDeleteSupplier()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 />
          حذف
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف التاجر؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم حذف «{supplier.name}» مع كل دفعاته وفواتيره نهائيًا. لا يمكن التراجع عن هذا
            الإجراء.
            <Badge variant="missed" className="mt-3">
              المتبقي حاليًا: {formatEGP(supplier.remaining_amount)}
            </Badge>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() =>
              deleteSupplier.mutate(supplier.id, { onSuccess: () => navigate('/suppliers') })
            }
          >
            حذف نهائي
          </AlertDialogAction>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
