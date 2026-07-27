import { useState } from 'react'
import { useForm, type Control, type FieldValues, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField, TextField, TextareaField } from '@/components/shared/form-fields'
import { ErrorState, LoadingState } from '@/components/shared/states'
import {
  useCreateCustomer,
  useCustomer,
  useUpdateCustomer,
} from '@/features/customers/hooks/useCustomers'
import { customerSchema, type CustomerInput } from '@/features/customers/schemas/customer'
import {
  contractDefaults,
  customerWithContractSchema,
  type CustomerWithContractInput,
} from '@/features/contracts/schemas/contract'
import { categoryOptions, legalStatusLabels, paymentWindowOptions } from '@/lib/labels'
import { todayISO } from '@/lib/format'
import type { Tables } from '@/types/database.types'

const legalStatusOptions = [
  { value: 'clean', label: legalStatusLabels.clean },
  { value: 'in_litigation', label: legalStatusLabels.in_litigation },
]

const trustReceiptOptions = [
  { value: 'yes', label: 'يوجد وصل أمانة' },
  { value: 'no', label: 'لا يوجد' },
]

const emptyCustomer: CustomerInput = {
  full_name: '',
  known_as: '',
  phone: '',
  alt_phone: '',
  national_id: '',
  address: '',
  guarantor_name: '',
  guarantor_relation: '',
  guarantor_phone: '',
  guarantor_address: '',
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
    guarantor_name: customer.guarantor_name ?? '',
    guarantor_relation: customer.guarantor_relation ?? '',
    guarantor_phone: customer.guarantor_phone ?? '',
    guarantor_address: customer.guarantor_address ?? '',
    legal_status: customer.legal_status,
  }
}

export function CustomerFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const {
    data: existing,
    isPending,
    isError,
    refetch,
  } = useCustomer(mode === 'edit' ? id : undefined)

  if (mode === 'edit') {
    if (isPending) return <LoadingState />
    if (isError) return <ErrorState onRetry={() => void refetch()} />
    return <EditCustomerForm existing={existing} />
  }
  return <CreateCustomerForm />
}

// ---------------------------------------------------------------------------
// الحقول المشتركة — عامة على نوع النموذج، فتصلح لنموذج الإنشاء والتعديل معًا.
// Shared blocks, generic over the form type so both the create form (customer +
// first contract) and the edit form (identity only) reuse them as-is.
// ---------------------------------------------------------------------------

interface FieldsProps<T extends FieldValues> {
  control: Control<T>
}

function IdentityCard<T extends FieldValues>({
  control,
  photoSlot,
}: FieldsProps<T> & { photoSlot: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>بيانات العميل</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <TextField control={control} name={'full_name' as Path<T>} label="الاسم الكامل *" />
        <TextField control={control} name={'known_as' as Path<T>} label="الشهرة *" />
        <TextField
          control={control}
          name={'phone' as Path<T>}
          label="رقم الهاتف *"
          dir="ltr"
          inputMode="numeric"
          placeholder="01xxxxxxxxx"
        />
        <TextField
          control={control}
          name={'alt_phone' as Path<T>}
          label="هاتف بديل"
          dir="ltr"
          inputMode="numeric"
          placeholder="01xxxxxxxxx"
        />
        <TextField
          control={control}
          name={'national_id' as Path<T>}
          label="الرقم القومي *"
          dir="ltr"
          inputMode="numeric"
          maxLength={14}
        />
        {photoSlot}
        <TextareaField
          control={control}
          name={'address' as Path<T>}
          label="العنوان *"
          className="sm:col-span-2"
        />
        <SelectField
          control={control}
          name={'legal_status' as Path<T>}
          label="الحالة القانونية *"
          options={legalStatusOptions}
        />
      </CardContent>
    </Card>
  )
}

function GuarantorCard<T extends FieldValues>({ control }: FieldsProps<T>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>بيانات الضامن (اختياري)</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <TextField control={control} name={'guarantor_name' as Path<T>} label="اسم الضامن" />
        <TextField control={control} name={'guarantor_relation' as Path<T>} label="صلة القرابة" />
        <TextField
          control={control}
          name={'guarantor_phone' as Path<T>}
          label="هاتف الضامن"
          dir="ltr"
          inputMode="numeric"
          placeholder="01xxxxxxxxx"
        />
        <TextField control={control} name={'guarantor_address' as Path<T>} label="عنوان الضامن" />
      </CardContent>
    </Card>
  )
}

export function ContractCard<T extends FieldValues>({
  control,
  title = 'تفاصيل العقد',
}: FieldsProps<T> & { title?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <SelectField
          control={control}
          name={'category' as Path<T>}
          label="نوع البضاعة *"
          options={categoryOptions}
        />
        <TextField
          control={control}
          name={'contract_start_date' as Path<T>}
          label="تاريخ بدء العقد *"
          type="date"
          dir="ltr"
        />
        <SelectField
          control={control}
          name={'payment_window' as Path<T>}
          label="نافذة السداد الشهرية *"
          options={paymentWindowOptions}
          description="اليوم الذي يُعتبر القسط متأخرًا بعده — يُحتسب في انتظام السداد"
        />
        <SelectField
          control={control}
          name={'trust_receipt' as Path<T>}
          label="وصل أمانة *"
          options={trustReceiptOptions}
        />
        <TextField
          control={control}
          name={'total_amount' as Path<T>}
          label="الإجمالي (ج.م) *"
          dir="ltr"
          inputMode="decimal"
        />
        <TextField
          control={control}
          name={'down_payment' as Path<T>}
          label="المقدم (ج.م) *"
          dir="ltr"
          inputMode="decimal"
        />
        <TextField
          control={control}
          name={'monthly_installment' as Path<T>}
          label="القسط الشهري (ج.م) *"
          dir="ltr"
          inputMode="decimal"
        />
        <TextField control={control} name={'note' as Path<T>} label="ملاحظة" />
        <p className="text-xs text-muted-foreground sm:col-span-2">
          المتبقي يُحسب في قاعدة البيانات: الإجمالي − المقدم − مجموع الدفعات المسجلة.
        </p>
      </CardContent>
    </Card>
  )
}

function PhotoField({
  onChange,
  hasExisting,
}: {
  onChange: (file: File | null) => void
  hasExisting: boolean
}) {
  // ليس حقلًا في النموذج — ترميز عادي، لأن FormLabel يحتاج سياق FormField.
  // Not a form field — plain markup, since FormLabel needs FormField context.
  return (
    <div className="space-y-2">
      <Label htmlFor="national-id-photo">صورة البطاقة</Label>
      <Input
        id="national-id-photo"
        type="file"
        accept="image/*"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <p className="text-xs text-muted-foreground">
        {hasExisting
          ? 'يوجد صورة محفوظة — اختر ملفًا جديدًا لاستبدالها'
          : 'تُحفظ في مخزن خاص لمحلك ولا تُعرض إلا برابط مؤقت'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------

function CreateCustomerForm() {
  const navigate = useNavigate()
  const createCustomer = useCreateCustomer()
  const [photo, setPhoto] = useState<File | null>(null)

  const form = useForm<CustomerWithContractInput>({
    resolver: zodResolver(customerWithContractSchema),
    defaultValues: {
      ...emptyCustomer,
      ...contractDefaults,
      contract_start_date: todayISO(),
    },
  })

  const onSubmit = (values: CustomerWithContractInput) => {
    const { category, contract_start_date, payment_window, total_amount, down_payment, monthly_installment, trust_receipt, note, ...customer } = values

    createCustomer.mutate(
      {
        input: customer,
        contract: {
          category,
          contract_start_date,
          payment_window,
          total_amount,
          down_payment,
          monthly_installment,
          trust_receipt,
          note,
        },
        photo,
      },
      { onSuccess: (created) => navigate(`/customers/${created.id}`) },
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="إضافة عميل جديد"
        description="سجّل بيانات العميل والضامن وعقده الأول. يمكنك إضافة عقود أخرى لاحقًا من صفحته."
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <IdentityCard
            control={form.control}
            photoSlot={<PhotoField onChange={setPhoto} hasExisting={false} />}
          />
          <ContractCard control={form.control} title="العقد الأول" />
          <GuarantorCard control={form.control} />
          <div className="flex gap-3">
            <Button type="submit" disabled={createCustomer.isPending}>
              إضافة العميل
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

function EditCustomerForm({ existing }: { existing: Tables<'customers'> }) {
  const navigate = useNavigate()
  const updateCustomer = useUpdateCustomer()
  const [photo, setPhoto] = useState<File | null>(null)

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: rowToDefaults(existing),
  })

  const onSubmit = (input: CustomerInput) => {
    updateCustomer.mutate(
      { id: existing.id, input, photo, previousPhotoPath: existing.national_id_photo },
      { onSuccess: (customer) => navigate(`/customers/${customer.id}`) },
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`تعديل: ${existing.full_name}`}
        description="العقود والمبالغ تُدار من صفحة العميل، لأن العميل قد يملك أكثر من عقد."
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <IdentityCard
            control={form.control}
            photoSlot={
              <PhotoField onChange={setPhoto} hasExisting={!!existing.national_id_photo} />
            }
          />
          <GuarantorCard control={form.control} />
          <div className="flex gap-3">
            <Button type="submit" disabled={updateCustomer.isPending}>
              حفظ التعديلات
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
