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
import { Textarea } from '@/components/ui/textarea'
import { useProfile } from '@/features/auth/hooks/useProfile'
import { useAddPayment } from '@/features/payments/hooks/usePayments'
import { createPaymentSchema, type PaymentInput } from '@/features/payments/schemas/payment'
import { formatEGP, todayISO } from '@/lib/format'
import type { Tables } from '@/types/database.types'

export function AddPaymentDialog({ customer }: { customer: Tables<'customers'> }) {
  const [open, setOpen] = useState(false)
  const { data: profile } = useProfile()
  const addPayment = useAddPayment(customer.id)

  const schema = useMemo(
    () => createPaymentSchema(customer.remaining_amount),
    [customer.remaining_amount],
  )

  const suggestedAmount = Math.min(customer.monthly_installment, customer.remaining_amount)

  const form = useForm<PaymentInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: suggestedAmount > 0 ? String(suggestedAmount) : '',
      payment_date: todayISO(),
      note: '',
    },
  })

  const settled = customer.remaining_amount === 0

  const onSubmit = (input: PaymentInput) => {
    addPayment.mutate({
      amount: Number(input.amount),
      payment_date: input.payment_date,
      note: input.note.trim() || null,
    })
    // Optimistic entry: close immediately; rollback + toast happen on failure.
    setOpen(false)
    form.reset({
      amount: '',
      payment_date: todayISO(),
      note: '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={settled}>
          <HandCoins />
          {settled ? 'تم سداد الحساب' : 'تسجيل دفعة'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة — {customer.full_name}</DialogTitle>
          <DialogDescription>
            المتبقي الحالي: <span className="tabular font-bold">{formatEGP(customer.remaining_amount)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
            <FormItem>
              <FormLabel>المحصّل</FormLabel>
              <Input value={profile?.full_name ?? ''} disabled />
            </FormItem>
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
