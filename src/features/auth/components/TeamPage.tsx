import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useProfiles, useUpdateProfile } from '@/features/auth/hooks/useProfile'
import { profileUpdateSchema, type ProfileUpdateInput } from '@/features/auth/schemas/auth'
import type { Tables } from '@/types/database.types'

export function TeamPage() {
  const { data: profiles, isPending, isError, refetch } = useProfiles()
  const [editing, setEditing] = useState<Tables<'profiles'> | null>(null)

  return (
    <div>
      <PageHeader
        title="الفريق"
        description="إدارة حسابات المحصلين وصلاحياتهم"
      />

      <Card className="mb-6 border-primary/30 bg-accent">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-accent-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            لإضافة محصّل جديد: أنشئ له حسابًا من لوحة Supabase (Authentication ← Add user)،
            وسيظهر هنا تلقائيًا بدور «محصّل» لتعديل بياناته وصلاحياته.
          </p>
        </CardContent>
      </Card>

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
                <TableHead className="w-16" />
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
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`تعديل ${profile.full_name}`}
                      onClick={() => setEditing(profile)}
                    >
                      <Pencil />
                    </Button>
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
