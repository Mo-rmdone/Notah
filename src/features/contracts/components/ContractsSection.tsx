import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, ArchiveRestore, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { AddPaymentDialog } from '@/features/payments/components/AddPaymentDialog'
import {
  useCreateContract,
  useCustomerContracts,
  useSetContractArchived,
} from '@/features/contracts/hooks/useContracts'
import {
  contractDefaults,
  contractSchema,
  type ContractInput,
} from '@/features/contracts/schemas/contract'
import type { ContractRow } from '@/features/contracts/api/contracts'
import { categoryLabels, categoryOptions, paymentWindowLabels, paymentWindowOptions } from '@/lib/labels'
import { formatDate, formatEGP, todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'

const trustReceiptOptions = [
  { value: 'yes', label: 'يوجد وصل أمانة' },
  { value: 'no', label: 'لا يوجد' },
]

export function ContractsSection({
  customerId,
  customerName,
  isOwner,
  customerArchived,
}: {
  customerId: string
  customerName: string
  isOwner: boolean
  customerArchived: boolean
}) {
  const { data: contracts, isPending, isError, refetch } = useCustomerContracts(customerId)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>العقود</CardTitle>
        {isOwner && !customerArchived ? <NewContractDialog customerId={customerId} /> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {isPending ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} className="py-6" />
        ) : contracts.length === 0 ? (
          <EmptyState
            title="لا توجد عقود"
            description="أضف عقدًا لتسجيل صفقة تقسيط لهذا العميل."
          />
        ) : (
          contracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              customerId={customerId}
              customerName={customerName}
              isOwner={isOwner}
              customerArchived={customerArchived}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function ContractCard({
  contract,
  customerId,
  customerName,
  isOwner,
  customerArchived,
}: {
  contract: ContractRow
  customerId: string
  customerName: string
  isOwner: boolean
  customerArchived: boolean
}) {
  const setArchived = useSetContractArchived(customerId)
  const settled = contract.remaining_amount === 0
  const closed = !!contract.archived_at
  const paid = contract.total_amount - contract.down_payment - contract.remaining_amount
  const payable = contract.total_amount - contract.down_payment
  const progress = payable > 0 ? Math.min(100, Math.round((paid / payable) * 100)) : 100

  return (
    <div className={cn('rounded-lg border p-4', closed && 'bg-muted/40')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{categoryLabels[contract.category]}</Badge>
          <Badge variant={contract.trust_receipt ? 'paid' : 'partial'}>
            {contract.trust_receipt ? 'وصل أمانة' : 'بدون وصل'}
          </Badge>
          {settled ? <Badge variant="paid">مسدَّد بالكامل</Badge> : null}
          {closed ? <Badge variant="outline">مغلق</Badge> : null}
        </div>
        <div className="flex gap-2">
          {!closed && !customerArchived ? (
            <AddPaymentDialog
              customerId={customerId}
              customerName={customerName}
              contracts={[contract]}
              defaultContractId={contract.id}
              variant="outline"
              size="sm"
            />
          ) : null}
          {isOwner ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setArchived.mutate({ id: contract.id, archived: !closed })}
            >
              {closed ? <ArchiveRestore /> : <Archive />}
              {closed ? 'إعادة فتح' : 'إغلاق'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
        <Figure label="الإجمالي" value={formatEGP(contract.total_amount)} />
        <Figure label="المقدم" value={formatEGP(contract.down_payment)} />
        <Figure
          label="المتبقي"
          value={formatEGP(contract.remaining_amount)}
          className={settled ? 'text-status-paid' : 'text-primary'}
        />
        <Figure label="القسط الشهري" value={formatEGP(contract.monthly_installment)} />
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', settled ? 'bg-status-paid' : 'bg-primary')}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        بدأ {formatDate(contract.contract_start_date)} · نافذة السداد{' '}
        {paymentWindowLabels[contract.payment_window]}
        {contract.note ? ` · ${contract.note}` : ''}
      </p>
    </div>
  )
}

function Figure({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 font-bold tabular', className)}>{value}</p>
    </div>
  )
}

function NewContractDialog({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false)
  const createContract = useCreateContract(customerId)

  const form = useForm<ContractInput>({
    resolver: zodResolver(contractSchema),
    defaultValues: { ...contractDefaults, contract_start_date: todayISO() },
  })

  const onSubmit = (input: ContractInput) => {
    createContract.mutate(input, {
      onSuccess: () => {
        setOpen(false)
        form.reset({ ...contractDefaults, contract_start_date: todayISO() })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          عقد جديد
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة عقد جديد</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
            <SelectField
              control={form.control}
              name="category"
              label="نوع البضاعة *"
              options={categoryOptions}
            />
            <TextField
              control={form.control}
              name="contract_start_date"
              label="تاريخ بدء العقد *"
              type="date"
              dir="ltr"
            />
            <SelectField
              control={form.control}
              name="payment_window"
              label="نافذة السداد *"
              options={paymentWindowOptions}
            />
            <SelectField
              control={form.control}
              name="trust_receipt"
              label="وصل أمانة *"
              options={trustReceiptOptions}
            />
            <TextField
              control={form.control}
              name="total_amount"
              label="الإجمالي (ج.م) *"
              dir="ltr"
              inputMode="decimal"
            />
            <TextField
              control={form.control}
              name="down_payment"
              label="المقدم (ج.م) *"
              dir="ltr"
              inputMode="decimal"
            />
            <TextField
              control={form.control}
              name="monthly_installment"
              label="القسط الشهري (ج.م) *"
              dir="ltr"
              inputMode="decimal"
            />
            <TextField control={form.control} name="note" label="ملاحظة" />
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={createContract.isPending}>
                إضافة العقد
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
