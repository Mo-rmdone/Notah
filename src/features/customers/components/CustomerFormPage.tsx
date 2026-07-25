import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorState, LoadingState } from '@/components/shared/states'
import {
  useCreateCustomer,
  useCustomer,
  useUpdateCustomer,
} from '@/features/customers/hooks/useCustomers'
import { customerSchema, type CustomerInput } from '@/features/customers/schemas/customer'
import { categoryOptions, legalStatusLabels } from '@/lib/labels'
import type { Tables } from '@/types/database.types'

const emptyDefaults: CustomerInput = {
  full_name: '',
  known_as: '',
  phone: '',
  alt_phone: '',
  national_id: '',
  address: '',
  category: 'household',
  total_amount: '',
  down_payment: '0',
  monthly_installment: '',
  guarantor_name: '',
  guarantor_relation: '',
  guarantor_phone: '',
  guarantor_address: '',
  trust_receipt: 'yes',
  legal_status: 'clean',
}

function rowToDefaults(customer: Tables<'customers'>): CustomerInput {
  return {
    full_name: customer.full_name,
    known_as: customer.known_as,
    phone: customer.phone,
    alt_phone: customer.alt_phone ?? '',
    national_id: customer.national_id,
    address: customer.address,
    category: customer.category,
    total_amount: String(customer.total_amount),
    down_payment: String(customer.down_payment),
    monthly_installment: String(customer.monthly_installment),
    guarantor_name: customer.guarantor_name ?? '',
    guarantor_relation: customer.guarantor_relation ?? '',
    guarantor_phone: customer.guarantor_phone ?? '',
    guarantor_address: customer.guarantor_address ?? '',
    trust_receipt: customer.trust_receipt ? 'yes' : 'no',
    legal_status: customer.legal_status,
  }
}

export function CustomerFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const { data: existing, isPending, isError, refetch } = useCustomer(mode === 'edit' ? id : undefined)

  if (mode === 'edit') {
    if (isPending) return <LoadingState />
    if (isError) return <ErrorState onRetry={() => void refetch()} />
    return <CustomerForm existing={existing} />
  }
  return <CustomerForm existing={null} />
}

function CustomerForm({ existing }: { existing: Tables<'customers'> | null }) {
  const navigate = useNavigate()
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const [photo, setPhoto] = useState<File | null>(null)
  const isEdit = existing !== null
  const saving = createCustomer.isPending || updateCustomer.isPending

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: existing ? rowToDefaults(existing) : emptyDefaults,
  })

  const onSubmit = (input: CustomerInput) => {
    if (isEdit) {
      updateCustomer.mutate(
        { id: existing.id, input, photo, previousPhotoPath: existing.national_id_photo },
        { onSuccess: (customer) => navigate(`/customers/${customer.id}`) },
      )
    } else {
      createCustomer.mutate(
        { input, photo },
        { onSuccess: (customer) => navigate(`/customers/${customer.id}`) },
      )
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEdit ? `تعديل: ${existing.full_name}` : 'إضافة عميل جديد'}
        description={isEdit ? undefined : 'سجّل بيانات العميل والضامن وتفاصيل البيع بالتقسيط'}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle>بيانات العميل</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="known_as"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الشهرة *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف *</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="numeric" placeholder="01xxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alt_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>هاتف بديل</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="numeric" placeholder="01xxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="national_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم القومي *</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="numeric" maxLength={14} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel htmlFor="national-id-photo">صورة البطاقة</FormLabel>
                <Input
                  id="national-id-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
                <FormDescription>
                  {isEdit && existing.national_id_photo
                    ? 'يوجد صورة محفوظة — اختر ملفًا جديدًا لاستبدالها'
                    : 'تُحفظ في مخزن خاص ولا تُعرض إلا برابط مؤقت'}
                </FormDescription>
              </FormItem>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>العنوان *</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>تفاصيل البيع</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع البضاعة *</FormLabel>
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
              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الإجمالي (ج.م) *</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="down_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المقدم (ج.م) *</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthly_installment"
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
              <FormField
                control={form.control}
                name="trust_receipt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وصل أمانة *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">يوجد وصل أمانة</SelectItem>
                        <SelectItem value="no">لا يوجد</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legal_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة القانونية *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="clean">{legalStatusLabels.clean}</SelectItem>
                        <SelectItem value="in_litigation">
                          {legalStatusLabels.in_litigation}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isEdit ? (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  المتبقي يُعاد حسابه تلقائيًا: الإجمالي − المقدم − مجموع الدفعات المسجلة.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>بيانات الضامن (اختياري)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="guarantor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الضامن</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guarantor_relation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>صلة القرابة</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guarantor_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>هاتف الضامن</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="numeric" placeholder="01xxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guarantor_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الضامن</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {isEdit ? 'حفظ التعديلات' : 'إضافة العميل'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
