import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, Pencil } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PhoneLink } from '@/components/shared/phone'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { useProfile } from '@/features/auth/hooks/useProfile'
import {
  useCustomer,
  useNationalIdPhoto,
  useSetCustomerArchived,
} from '@/features/customers/hooks/useCustomers'
import { AddPaymentDialog } from '@/features/payments/components/AddPaymentDialog'
import { PaymentHistory } from '@/features/payments/components/PaymentHistory'
import { PerformanceWidget } from '@/features/payments/components/PerformanceWidget'
import { ContractsSection } from '@/features/contracts/components/ContractsSection'
import { useCustomerContracts } from '@/features/contracts/hooks/useContracts'
import { legalStatusLabels } from '@/lib/labels'
import { formatDate, formatEGP, sumMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

export function CustomerDetailPage() {
  const { id } = useParams()
  const { data: customer, isPending, isError, refetch } = useCustomer(id)

  if (isPending) return <LoadingState />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return <CustomerDetail customer={customer} />
}

function CustomerDetail({ customer }: { customer: Tables<'customers'> }) {
  const { data: profile } = useProfile()
  const { data: contracts } = useCustomerContracts(customer.id)
  const isOwner = profile?.role === 'owner'

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.full_name}
        description={`(${customer.known_as})`}
        actions={
          <>
            {!customer.archived_at ? (
              <AddPaymentDialog
                customerId={customer.id}
                customerName={customer.full_name}
                contracts={contracts ?? []}
              />
            ) : null}
            {isOwner ? (
              <>
                <Button variant="outline" asChild>
                  <Link to={`/customers/${customer.id}/edit`}>
                    <Pencil />
                    تعديل
                  </Link>
                </Button>
                <ArchiveButton customer={customer} />
              </>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant={customer.legal_status === 'clean' ? 'paid' : 'missed'}>
          {legalStatusLabels[customer.legal_status]}
        </Badge>
        {customer.archived_at ? <Badge variant="outline">مؤرشف</Badge> : null}
      </div>

      <FinancialSummary contracts={contracts ?? []} />

      <ContractsSection
        customerId={customer.id}
        customerName={customer.full_name}
        isOwner={isOwner}
        customerArchived={!!customer.archived_at}
      />

      <PerformanceWidget customerId={customer.id} />

      <PaymentHistory customerId={customer.id} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>بيانات العميل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="رقم الهاتف">
              <PhoneLink phone={customer.phone} showCallIcon />
            </InfoRow>
            {customer.alt_phone ? (
              <InfoRow label="هاتف بديل">
                <PhoneLink phone={customer.alt_phone} />
              </InfoRow>
            ) : null}
            <InfoRow label="الرقم القومي">
              <span dir="ltr" className="tabular">
                {customer.national_id}
              </span>
            </InfoRow>
            <InfoRow label="العنوان">{customer.address}</InfoRow>
            <InfoRow label="تاريخ التسجيل">{formatDate(customer.created_at)}</InfoRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بيانات الضامن</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customer.guarantor_name ? (
              <>
                <InfoRow label="الاسم">{customer.guarantor_name}</InfoRow>
                {customer.guarantor_relation ? (
                  <InfoRow label="صلة القرابة">{customer.guarantor_relation}</InfoRow>
                ) : null}
                {customer.guarantor_phone ? (
                  <InfoRow label="الهاتف">
                    <PhoneLink phone={customer.guarantor_phone} />
                  </InfoRow>
                ) : null}
                {customer.guarantor_address ? (
                  <InfoRow label="العنوان">{customer.guarantor_address}</InfoRow>
                ) : null}
              </>
            ) : (
              <p className="py-4 text-center text-muted-foreground">لا يوجد ضامن مسجل</p>
            )}
          </CardContent>
        </Card>
      </div>

      <NationalIdPhotoCard path={customer.national_id_photo} />
    </div>
  )
}

/**
 * الإجمالي عبر كل عقود العميل. الجمع هنا للعرض فقط — كل رقم مفرد محسوب أصلًا في
 * قاعدة البيانات، ولا يُتخذ قرار بناءً على هذا التجميع.
 * Totals across all of a customer's contracts. The addition is display-only:
 * every individual figure was computed by Postgres, and nothing decides state
 * from this aggregate.
 */
function FinancialSummary({ contracts }: { contracts: Tables<'contracts'>[] }) {
  const open = contracts.filter((c) => !c.archived_at)
  const remaining = sumMoney(open.map((c) => c.remaining_amount))
  const items = [
    { label: 'إجمالي العقود', value: sumMoney(contracts.map((c) => c.total_amount)) },
    { label: 'إجمالي المقدم', value: sumMoney(contracts.map((c) => c.down_payment)) },
    { label: 'المتبقي', value: remaining, highlight: true },
    {
      label: 'القسط الشهري',
      value: sumMoney(open.map((c) => c.monthly_installment)),
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className={cn(item.highlight && 'border-primary bg-accent')}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p
              className={cn(
                'mt-1 text-lg font-bold tabular',
                item.highlight && (remaining === 0 ? 'text-status-paid' : 'text-primary'),
              )}
            >
              {formatEGP(item.value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-start font-semibold">{children}</span>
    </div>
  )
}

function NationalIdPhotoCard({ path }: { path: string | null }) {
  const { data: url, isPending, isError, refetch } = useNationalIdPhoto(path)

  return (
    <Card>
      <CardHeader>
        <CardTitle>صورة البطاقة</CardTitle>
      </CardHeader>
      <CardContent>
        {!path ? (
          <p className="py-4 text-center text-sm text-muted-foreground">لا توجد صورة مرفوعة</p>
        ) : isPending ? (
          <Skeleton className="h-48 w-full max-w-md" />
        ) : isError ? (
          <ErrorState
            title="تعذر تحميل الصورة"
            onRetry={() => void refetch()}
            className="py-6"
          />
        ) : (
          <a href={url} target="_blank" rel="noreferrer">
            <img
              src={url}
              alt="صورة البطاقة الشخصية"
              className="max-h-72 w-auto max-w-full rounded-md border"
            />
          </a>
        )}
      </CardContent>
    </Card>
  )
}

function ArchiveButton({ customer }: { customer: Tables<'customers'> }) {
  const navigate = useNavigate()
  const setArchived = useSetCustomerArchived()
  const isArchived = !!customer.archived_at

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={isArchived ? 'secondary' : 'destructive'}>
          {isArchived ? <ArchiveRestore /> : <Archive />}
          {isArchived ? 'استعادة' : 'أرشفة'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isArchived ? 'استعادة العميل؟' : 'أرشفة العميل؟'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArchived
              ? 'سيعود العميل للظهور في قائمة العملاء النشطين.'
              : 'الأرشفة تخفي العميل من القوائم دون حذف بياناته أو دفعاته، ويمكن استعادته في أي وقت.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() =>
              setArchived.mutate(
                { id: customer.id, archived: !isArchived },
                { onSuccess: () => navigate('/customers') },
              )
            }
          >
            تأكيد
          </AlertDialogAction>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
