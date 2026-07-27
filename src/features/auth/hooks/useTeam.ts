import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createCollector,
  getOrganization,
  removeCollector,
  type CreatedCollector,
} from '@/features/auth/api/team'
import { arabicErrorMessage } from '@/lib/errors'
import type { CollectorInput } from '@/features/auth/schemas/auth'

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: getOrganization,
  })
}

export function useCreateCollector() {
  const queryClient = useQueryClient()
  return useMutation<CreatedCollector, Error, CollectorInput>({
    mutationFn: createCollector,
    onSuccess: () => {
      // بلا toast يحمل كلمة المرور: النافذة تعرضها مرة واحدة تحت سيطرة المالك،
      // بينما الـ toast يختفي وحده وقد يظهر في تسجيل الشاشة.
      // Deliberately no toast carrying the password: the dialog shows it once
      // under the owner's control, whereas a toast dismisses itself and can be
      // caught by a screen recording.
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

export function useRemoveCollector() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: removeCollector,
    onSuccess: () => {
      toast.success('تم حذف الحساب')
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}
