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
import { useAddSupplierPayment } from '@/features/suppliers/hooks/useSuppliers'
import {
  createSupplierPaymentSchema,
  type SupplierPaymentInput,
} from '@/features/suppliers/schemas/supplier'
import { formatEGP, todayISO } from '@/lib/format'
import type { Tables } from '@/types/database.types'

export function SupplierPaymentDialog({ supplier }: { supplier: Tables<'suppliers'> }) {
  const [open, setOpen] = useState(false)
  const addPayment = useAddSupplierPayment(supplier.id)

  const schema = useMemo(
    () => createSupplierPaymentSchema(supplier.remaining_amount),
    [supplier.remaining_amount],
  )

  const suggested = Math.min(supplier.monthly_payment, supplier.remaining_amount)

  const form = useForm<SupplierPaymentInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: suggested > 0 ? String(suggested) : '',
      payment_date: todayISO(),
      note: '',
    },
  })

  const settled = supplier.remaining_amount === 0

  const onSubmit = (input: SupplierPaymentInput) => {
    addPayment.mutate(
      {
        amount: Number(input.amount),
        payment_date: input.payment_date,
        note: input.note.trim() || null,
      },
      {
        onSuccess: () => {
          setOpen(false)
          form.reset({ amount: '', payment_date: todayISO(), note: '' })
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={settled}>
          <HandCoins />
          {settled ? 'تم سداد المديونية' : 'تسجيل دفعة'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة — {supplier.name}</DialogTitle>
          <DialogDescription>
            المتبقي الحالي:{' '}
            <span className="tabular font-bold">{formatEGP(supplier.remaining_amount)}</span>
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
              <Button type="submit" disabled={addPayment.isPending}>
                تسجيل الدفعة
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
