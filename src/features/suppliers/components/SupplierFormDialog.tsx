import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateSupplier, useUpdateSupplier } from '@/features/suppliers/hooks/useSuppliers'
import { supplierSchema, type SupplierInput } from '@/features/suppliers/schemas/supplier'
import { categoryOptions } from '@/lib/labels'
import type { Tables } from '@/types/database.types'

export function SupplierFormDialog({
  supplier,
  trigger,
}: {
  supplier?: Tables<'suppliers'>
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const isEdit = !!supplier

  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          trade_type: supplier.trade_type,
          phone_1: supplier.phone_1 ?? '',
          phone_2: supplier.phone_2 ?? '',
          total_owed: String(supplier.total_owed),
          monthly_payment: String(supplier.monthly_payment),
        }
      : {
          name: '',
          trade_type: 'household',
          phone_1: '',
          phone_2: '',
          total_owed: '',
          monthly_payment: '',
        },
  })

  const onSubmit = (input: SupplierInput) => {
    const onSuccess = () => setOpen(false)
    if (isEdit) {
      updateSupplier.mutate({ id: supplier.id, input }, { onSuccess })
    } else {
      createSupplier.mutate(input, {
        onSuccess: () => {
          onSuccess()
          form.reset()
        },
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل بيانات التاجر' : 'إضافة تاجر جديد'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم التاجر *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trade_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع التجارة *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone_1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>هاتف 1</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>هاتف 2</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_owed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>إجمالي المديونية (ج.م) *</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="decimal" {...field} />
                    </FormControl>
                    {isEdit ? (
                      <FormDescription>
                        المتبقي يُعاد حسابه: الإجمالي − مجموع الدفعات
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthly_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القسط الشهري (ج.م) *</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={createSupplier.isPending || updateSupplier.isPending}
              >
                {isEdit ? 'حفظ التعديلات' : 'إضافة التاجر'}
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
