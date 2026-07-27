import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProfile } from '@/features/auth/hooks/useProfile'
import { useAddPayment } from '@/features/payments/hooks/usePayments'
import { createPaymentSchema, type PaymentInput } from '@/features/payments/schemas/payment'
import type { ContractRow } from '@/features/contracts/api/contracts'
import { categoryLabels } from '@/lib/labels'
import { formatEGP, todayISO } from '@/lib/format'

interface Props {
  customerId: string
  customerName: string
  contracts: ContractRow[]
  /** يفتح الحوار على عقد بعينه بدل تركه على الأول. */
  defaultContractId?: string
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm'
}

export function AddPaymentDialog({
  customerId,
  customerName,
  contracts,
  defaultContractId,
  variant = 'default',
  size = 'default',
}: Props) {
  const [open, setOpen] = useState(false)
  const { data: profile } = useProfile()
  const addPayment = useAddPayment(customerId)

  // العقود المفتوحة فقط: العقد المسدَّد بالكامل أو المؤرشف لا يقبل دفعات، والمحفّز
  // في قاعدة البيانات يرفضها بأي حال.
  // Only open contracts can take a payment; the database trigger would reject
  // the rest anyway, so there is no point offering them.
  const payable = useMemo(
    () => contracts.filter((c) => !c.archived_at && c.remaining_amount > 0),
    [contracts],
  )

  const [contractId, setContractId] = useState(
    () => defaultContractId ?? payable[0]?.id ?? '',
  )
  const selected = payable.find((c) => c.id === contractId) ?? payable[0]

  const schema = useMemo(
    () => createPaymentSchema(selected?.remaining_amount ?? 0),
    [selected?.remaining_amount],
  )

  const suggested = selected
    ? Math.min(selected.monthly_installment, selected.remaining_amount)
    : 0

  const form = useForm<PaymentInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: suggested > 0 ? String(suggested) : '',
      payment_date: todayISO(),
      note: '',
    },
  })

  const nothingPayable = payable.length === 0

  const onSubmit = (input: PaymentInput) => {
    if (!selected) return
    addPayment.mutate({
      contract_id: selected.id,
      amount: Number(input.amount),
      payment_date: input.payment_date,
      note: input.note.trim() || null,
    })
    // Optimistic entry: close immediately; rollback + toast happen on failure.
    setOpen(false)
    form.reset({ amount: '', payment_date: todayISO(), note: '' })
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      const target = payable.find((c) => c.id === (defaultContractId ?? contractId)) ?? payable[0]
      if (target) {
        setContractId(target.id)
        form.reset({
          amount: String(Math.min(target.monthly_installment, target.remaining_amount)),
          payment_date: todayISO(),
          note: '',
        })
      }
    }
  }

  function handleContractChange(id: string) {
    setContractId(id)
    const target = payable.find((c) => c.id === id)
    if (target) {
      form.setValue('amount', String(Math.min(target.monthly_installment, target.remaining_amount)))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={nothingPayable} variant={variant} size={size}>
          <HandCoins />
          {nothingPayable ? 'لا توجد عقود مستحقة' : 'تسجيل دفعة'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة — {customerName}</DialogTitle>
          <DialogDescription>
            المتبقي على هذا العقد:{' '}
            <span className="tabular font-bold">{formatEGP(selected?.remaining_amount ?? 0)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {payable.length > 1 ? (
              // ليس حقلًا في النموذج — العقد يُختار خارج مخطط الدفعة.
              <div className="space-y-2">
                <Label htmlFor="contract-select">العقد</Label>
                <Select value={contractId} onValueChange={handleContractChange}>
                  <SelectTrigger id="contract-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {payable.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {categoryLabels[c.category]} — متبقٍ {formatEGP(c.remaining_amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ (ج.م) *</FormLabel>
                  <FormControl>
                    <Input dir="ltr" inputMode="decimal" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الدفعة *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Not a form field — plain markup, since FormLabel needs FormField context. */}
            <div className="space-y-2">
              <Label htmlFor="collector-name">المحصّل</Label>
              <Input id="collector-name" value={profile?.full_name ?? ''} disabled />
            </div>
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظة</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="اختياري" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">تسجيل الدفعة</Button>
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
