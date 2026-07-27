import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createContract,
  listContractsForCustomer,
  setContractArchived,
  updateContract,
} from '@/features/contracts/api/contracts'
import type { ContractInput } from '@/features/contracts/schemas/contract'
import { arabicErrorMessage } from '@/lib/errors'

export function useCustomerContracts(customerId: string | undefined) {
  return useQuery({
    queryKey: ['contracts', customerId],
    queryFn: () => listContractsForCustomer(customerId as string),
    enabled: !!customerId,
  })
}

/** أي تغيير في العقود يؤثر على قوائم العملاء ولوحة المؤشرات معًا. */
function invalidateContractViews(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ['contracts', customerId] })
  void queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
  void queryClient.invalidateQueries({ queryKey: ['customers'] })
  void queryClient.invalidateQueries({ queryKey: ['customer-performance', customerId] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useCreateContract(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContractInput) => createContract(customerId, input),
    onSuccess: () => {
      toast.success('تم إضافة العقد')
      invalidateContractViews(queryClient, customerId)
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

export function useUpdateContract(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContractInput }) => updateContract(id, input),
    onSuccess: () => {
      toast.success('تم حفظ بيانات العقد')
      invalidateContractViews(queryClient, customerId)
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

export function useSetContractArchived(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      setContractArchived(id, archived),
    onSuccess: (_data, { archived }) => {
      toast.success(archived ? 'تم إغلاق العقد' : 'تم إعادة فتح العقد')
      invalidateContractViews(queryClient, customerId)
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}
