import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createCustomer,
  getCustomer,
  getNationalIdPhotoUrl,
  listCustomers,
  setCustomerArchived,
  updateCustomer,
} from '@/features/customers/api/customers'
import type { CustomerFilters, CustomerInput } from '@/features/customers/schemas/customer'
import { arabicErrorMessage } from '@/lib/errors'

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => listCustomers(filters),
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id as string),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, photo }: { input: CustomerInput; photo: File | null }) =>
      createCustomer(input, photo),
    onSuccess: () => {
      toast.success('تم إضافة العميل')
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
      photo,
      previousPhotoPath,
    }: {
      id: string
      input: CustomerInput
      photo: File | null
      previousPhotoPath: string | null
    }) => updateCustomer(id, input, photo, previousPhotoPath),
    onSuccess: (customer) => {
      toast.success('تم حفظ بيانات العميل')
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      void queryClient.invalidateQueries({ queryKey: ['customer', customer.id] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

export function useSetCustomerArchived() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      setCustomerArchived(id, archived),
    onSuccess: (_data, { id, archived }) => {
      toast.success(archived ? 'تم أرشفة العميل' : 'تم استعادة العميل')
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      void queryClient.invalidateQueries({ queryKey: ['customer', id] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

export function useNationalIdPhoto(path: string | null) {
  return useQuery({
    queryKey: ['national-id-photo', path],
    queryFn: () => getNationalIdPhotoUrl(path as string),
    enabled: !!path,
    staleTime: 8 * 60 * 1000, // signed URL lives 10 minutes
  })
}
