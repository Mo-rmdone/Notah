import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2 } from 'lucide-react'
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
import { Card, CardContent } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  useAddCapitalEntry,
  useCapitalEntries,
  useDashboardSummary,
  useDeleteCapitalEntry,
} from '@/features/dashboard/hooks/useDashboard'
import { capitalEntrySchema, type CapitalEntryInput } from '@/features/dashboard/schemas/capital'
import { capitalEntryLabels } from '@/lib/labels'
import { formatDate, formatEGP, todayISO } from '@/lib/format'
import type { Tables } from '@/types/database.types'

export function CapitalPage() {
  const { data: summary, isPending: summaryPending } = useDashboardSummary()
  const { data: entries, isPending, isError, refetch } = useCapitalEntries()

  return (
    <div>
      <PageHeader
        title="رأس المال"
        description="سجل الإيداعات والمسحوبات — رقم رأس المال في الرئيسية محسوب من هذه الحركات"
        actions={<AddCapitalEntryDialog />}
      />

      <Card className="mb-6 border-primary bg-accent">
        <CardContent className="p-5">
          <p className="text-sm text-accent-foreground">رأس المال الحالي</p>
          {summaryPending ? (
            <Skeleton className="mt-2 h-9 w-40" />
          ) : (
            <p className="mt-1 text-3xl font-bold tabular text-primary">
              {formatEGP(summary?.total_capital ?? 0)}
            </p>
          )}
          {summary ? (
            <p className="mt-2 text-xs text-muted-foreground">
              مستحق للتجار: <span className="tabular">{formatEGP(summary.total_owed_suppliers)}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        {isPending ? (
          <TableSkeleton rows={5} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState
            title="لا توجد حركات مسجلة"
            description="سجّل أول إيداع لرأس المال من زر «تسجيل حركة»"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead className="hidden md:table-cell">ملاحظة</TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.entry_date)}</TableCell>
                  <TableCell>
                    <Badge variant={entry.entry_type === 'deposit' ? 'paid' : 'partial'}>
                      {entry.entry_type === 'deposit' ? (
                        <ArrowDownLeft className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {capitalEntryLabels[entry.entry_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular font-semibold">
                    {entry.entry_type === 'withdrawal' ? '− ' : '+ '}
                    {formatEGP(entry.amount)}
                  </TableCell>
                  <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                    {entry.note || '—'}
                  </TableCell>
                  <TableCell>
                    <DeleteEntryButton entry={entry} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}

function AddCapitalEntryDialog() {
  const [open, setOpen] = useState(false)
  const { session } = useAuth()
  const addEntry = useAddCapitalEntry()

  const form = useForm<CapitalEntryInput>({
    resolver: zodResolver(capitalEntrySchema),
    defaultValues: {
      amount: '',
      entry_type: 'deposit',
      entry_date: todayISO(),
      note: '',
    },
  })

  const onSubmit = (input: CapitalEntryInput) => {
    addEntry.mutate(
      {
        amount: Number(input.amount),
        entry_type: input.entry_type,
        entry_date: input.entry_date,
        note: input.note.trim() || null,
        created_by: session?.user.id ?? null,
      },
      {
        onSuccess: () => {
          setOpen(false)
          form.reset({ amount: '', entry_type: 'deposit', entry_date: todayISO(), note: '' })
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          تسجيل حركة
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل حركة رأس مال</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="entry_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الحركة *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="deposit">{capitalEntryLabels.deposit}</SelectItem>
                      <SelectItem value="withdrawal">{capitalEntryLabels.withdrawal}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              name="entry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>التاريخ *</FormLabel>
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
              <Button type="submit" disabled={addEntry.isPending}>
                حفظ الحركة
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

function DeleteEntryButton({ entry }: { entry: Tables<'capital_entries'> }) {
  const deleteEntry = useDeleteCapitalEntry()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="حذف الحركة">
          <Trash2 className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف الحركة؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم حذف {capitalEntryLabels[entry.entry_type]} بمبلغ {formatEGP(entry.amount)} بتاريخ{' '}
            {formatDate(entry.entry_date)}، وسيتغير رقم رأس المال تبعًا لذلك.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => deleteEntry.mutate(entry.id)}
          >
            حذف
          </AlertDialogAction>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
