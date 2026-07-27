import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Pencil, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/shared/states'
import { useProfile, useProfiles, useUpdateProfile } from '@/features/auth/hooks/useProfile'
import { useCreateCollector, useOrganization, useRemoveCollector } from '@/features/auth/hooks/useTeam'
import {
  collectorSchema,
  profileUpdateSchema,
  type CollectorInput,
  type ProfileUpdateInput,
} from '@/features/auth/schemas/auth'
import type { CreatedCollector } from '@/features/auth/api/team'
import type { Tables } from '@/types/database.types'

export function TeamPage() {
  const { data: profiles, isPending, isError, refetch } = useProfiles()
  const { data: me } = useProfile()
  const { data: organization } = useOrganization()
  const [editing, setEditing] = useState<Tables<'profiles'> | null>(null)

  const isOwner = me?.role === 'owner'

  // الحد يعدّ المحصّلين النشطين فقط — نفس شرط المحفّز في 00006، فإيقاف حساب
  // يحرّر مكانًا دون حذفه.
  // The limit counts active collectors only — the same condition the 00006
  // trigger uses — so suspending an account frees a slot without deleting it.
  const activeCollectors =
    profiles?.filter((p) => p.role === 'collector' && p.active).length ?? 0

  // قبل وصول بيانات المؤسسة لا حدَّ معروفًا — و«صفر» ليس قيمة محايدة هنا: لو
  // افترضناها لعرضت الصفحة «٠ من ٠» وعطّلت زر الإضافة بحجة امتلاء الأماكن
  // طوال زمن التحميل. الحد المجهول يُعرض «—» ولا يمنع شيئًا.
  // Until the organization arrives the limit is unknown, and zero is not a
  // neutral stand-in: assuming it made the page read "0 of 0" and disabled the
  // add button as though the slots were full for the whole loading window. An
  // unknown limit renders as "—" and blocks nothing.
  const maxCollectors = organization?.max_collectors ?? null
  const slotsFull = maxCollectors !== null && activeCollectors >= maxCollectors

  return (
    <div>
      <PageHeader
        title="الفريق"
        description="إدارة حسابات المحصلين وصلاحياتهم"
        actions={isOwner ? <AddCollectorDialog disabled={slotsFull} /> : undefined}
      />

      {isOwner ? (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <span>
              المحصّلون النشطون: <b className="tabular">{activeCollectors}</b> من{' '}
              <b className="tabular">{maxCollectors ?? '—'}</b>
            </span>
            {slotsFull ? (
              <span className="text-muted-foreground">
                لإضافة محصّل آخر، أوقف حساب محصّل حالي أو احذفه.
              </span>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        {isPending ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : profiles.length === 0 ? (
          <EmptyState title="لا يوجد مستخدمون بعد" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-semibold">{profile.full_name || '—'}</TableCell>
                  <TableCell dir="ltr" className="text-end tabular">
                    {profile.phone ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={profile.role === 'owner' ? 'default' : 'secondary'}>
                      {profile.role === 'owner' ? 'مالك' : 'محصّل'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={profile.active ? 'paid' : 'missed'}>
                      {profile.active ? 'نشط' : 'موقوف'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {/* تعديل الملفات مقصور على المالك في 00008، فزر يفشل دائمًا
                        لدى المحصّل عيب لا حماية. */}
                    {/* Only owners may update profiles (00008), so showing the
                        button to a collector would be a control that always
                        fails — a defect, not a safeguard. */}
                    {isOwner ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`تعديل ${profile.full_name}`}
                          onClick={() => setEditing(profile)}
                        >
                          <Pencil />
                        </Button>
                        {profile.role === 'collector' ? (
                          <RemoveCollectorButton profile={profile} />
                        ) : null}
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {editing ? (
        <EditProfileDialog profile={editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  )
}

/**
 * إضافة محصّل: نموذج، ثم بيانات الدخول مرة واحدة.
 *
 * كلمة المرور تولَّد على الخادم وتعود في الاستجابة فقط — لا تُحفظ في أي مكان،
 * ولهذا تُعرض هنا داخل النافذة (يتحكم المالك في إغلاقها) بدل toast يختفي وحده.
 *
 * Add a collector: the form, then the credentials exactly once. The password is
 * generated server-side and exists only in that one response, so it is shown
 * inside the dialog — which the owner dismisses deliberately — rather than in a
 * toast that disappears on its own.
 */
function AddCollectorDialog({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<CreatedCollector | null>(null)
  const createCollector = useCreateCollector()

  const form = useForm<CollectorInput>({
    resolver: zodResolver(collectorSchema),
    defaultValues: { full_name: '', email: '', phone: '' },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // تُمسح عند الإغلاق حتى لا تعود كلمة مرور قديمة للظهور عند الفتح التالي.
    // Cleared on close so a previous password cannot reappear on the next open.
    if (!next) {
      setCreated(null)
      form.reset()
    }
  }

  const onSubmit = (values: CollectorInput) =>
    createCollector.mutate(values, { onSuccess: setCreated })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <UserPlus />
          إضافة محصّل
        </Button>
      </DialogTrigger>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>تم إنشاء الحساب</DialogTitle>
              <DialogDescription>
                سلّم هذه البيانات للمحصّل الآن — كلمة المرور لن تظهر مرة أخرى بعد إغلاق هذه
                النافذة.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <CopyField label="البريد الإلكتروني" value={created.email} />
              <CopyField label="كلمة المرور" value={created.password} />
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                نسخت البيانات — إغلاق
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>إضافة محصّل</DialogTitle>
              <DialogDescription>
                يسجّل المحصّل الدخول بهذا البريد. يمكنه إضافة العملاء وتسجيل الدفعات، ولا يمكنه
                تعديل أو حذف أي دفعة سابقة.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الكامل</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input
                          dir="ltr"
                          type="email"
                          autoComplete="off"
                          placeholder="collector@example.com"
                          {...field}
                        />
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
                      <FormLabel>رقم الهاتف (اختياري)</FormLabel>
                      <FormControl>
                        <Input dir="ltr" inputMode="numeric" placeholder="01xxxxxxxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createCollector.isPending}>
                    {createCollector.isPending ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    إلغاء
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`تم نسخ ${label}`)
    } catch {
      // الحافظة محجوبة خارج HTTPS أو بلا إذن — القيمة ظاهرة للنسخ اليدوي.
      // The clipboard is blocked outside HTTPS or without permission; the value
      // stays on screen to be copied by hand.
      toast.error('تعذر النسخ — انسخ القيمة يدويًا')
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <code
          dir="ltr"
          className="flex-1 select-all rounded-md border bg-muted px-3 py-2 text-sm break-all"
        >
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`نسخ ${label}`}
          onClick={() => void copy()}
        >
          <Copy />
        </Button>
      </div>
    </div>
  )
}

function RemoveCollectorButton({ profile }: { profile: Tables<'profiles'> }) {
  const removeCollector = useRemoveCollector()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`حذف حساب ${profile.full_name}`}>
          <Trash2 className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          {/* الاسم في العنوان: الصفوف متشابهة، والنافذة وحدها هي ما يؤكد أيها. */}
          {/* The name goes in the title: the rows look alike, and this dialog is
              the only thing confirming which one is about to go. */}
          <AlertDialogTitle>حذف حساب {profile.full_name}؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيفقد الدخول إلى النظام نهائيًا. الدفعات التي حصّلها تبقى في السجل، لكن اسمه لن يظهر
            عليها بعد الحذف. لإيقافه مؤقتًا مع الاحتفاظ باسمه على دفعاته، استخدم «تعديل» وغيّر
            الحالة إلى «موقوف» — وهذا يحرّر مكانه أيضًا.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => removeCollector.mutate(profile.id)}
          >
            حذف نهائي
          </AlertDialogAction>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function EditProfileDialog({
  profile,
  onClose,
}: {
  profile: Tables<'profiles'>
  onClose: () => void
}) {
  const updateProfile = useUpdateProfile()

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: profile.full_name,
      phone: profile.phone ?? '',
      role: profile.role,
      active: profile.active ? 'active' : 'suspended',
    },
  })

  const onSubmit = (values: ProfileUpdateInput) => {
    updateProfile.mutate(
      {
        id: profile.id,
        patch: {
          full_name: values.full_name,
          phone: values.phone === '' ? null : values.phone,
          role: values.role,
          active: values.active === 'active',
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم الكامل</FormLabel>
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
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl>
                    <Input dir="ltr" inputMode="numeric" placeholder="01xxxxxxxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدور</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="owner">مالك</SelectItem>
                        <SelectItem value="collector">محصّل</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="suspended">موقوف</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateProfile.isPending}>
                حفظ التعديلات
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
