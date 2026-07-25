import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getProfile, listProfiles, updateProfile } from '@/features/auth/api/auth'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { arabicErrorMessage } from '@/lib/errors'
import type { TablesUpdate } from '@/types/database.types'

export function useProfile() {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId as string),
    enabled: !!userId,
  })
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: listProfiles,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'profiles'> }) =>
      updateProfile(id, patch),
    onSuccess: () => {
      toast.success('تم حفظ بيانات المستخدم')
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}
