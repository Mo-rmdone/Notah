import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAddSupplierInvoice } from '@/features/suppliers/hooks/useSuppliers'
import { invoiceSchema, type InvoiceInput } from '@/features/suppliers/schemas/supplier'
import { todayISO } from '@/lib/format'

export function InvoiceDialog({ supplierId }: { supplierId: string }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const addInvoice = useAddSupplierInvoice(supplierId)

  const form = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_number: '',
      amount: '',
      invoice_date: todayISO(),
      note: '',
    },
  })

  const onSubmit = (input: InvoiceInput) => {
    addInvoice.mutate(
      { input, file },
      {
        onSuccess: () => {
          setOpen(false)
          setFile(null)
          form.reset({ invoice_number: '', amount: '', invoice_date: todayISO(), note: '' })
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          إضافة فاتورة
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة فاتورة</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="invoice_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الفاتورة *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ (ج.م) *</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الفاتورة *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormItem>
              <FormLabel htmlFor="invoice-file">ملف الفاتورة</FormLabel>
              <Input
                id="invoice-file"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <FormDescription>يُحفظ في مخزن خاص، ويُفتح برابط مؤقت عند الطلب</FormDescription>
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
              <Button type="submit" disabled={addInvoice.isPending}>
                حفظ الفاتورة
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
