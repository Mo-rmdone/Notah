import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addCustomerPayment,
  deleteCustomerPayment,
  getCustomerPerformance,
  listCustomerPayments,
  type CustomerPaymentRow,
} from '@/features/payments/api/payments'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useProfile } from '@/features/auth/hooks/useProfile'
import { arabicErrorMessage } from '@/lib/errors'
import type { ContractRow } from '@/features/contracts/api/contracts'

export function useCustomerPayments(customerId: string) {
  return useQuery({
    queryKey: ['customer-payments', customerId],
    queryFn: () => listCustomerPayments(customerId),
  })
}

export function useCustomerPerformance(customerId: string) {
  return useQuery({
    queryKey: ['customer-performance', customerId],
    queryFn: () => getCustomerPerformance(customerId),
  })
}

interface AddPaymentInput {
  contract_id: string
  amount: number
  payment_date: string
  note: string | null
}

function invalidateAfterPayment(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ['customer-payments', customerId] })
  void queryClient.invalidateQueries({ queryKey: ['contracts', customerId] })
  void queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
  void queryClient.invalidateQueries({ queryKey: ['customer-performance', customerId] })
  void queryClient.invalidateQueries({ queryKey: ['customers'] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useAddPayment(customerId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: profile } = useProfile()

  return useMutation({
    mutationFn: (input: AddPaymentInput) =>
      addCustomerPayment({
        collected_by: session?.user.id ?? '',
        ...input,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['customer-payments', customerId] })
      await queryClient.cancelQueries({ queryKey: ['contracts', customerId] })

      const previousPayments = queryClient.getQueryData<CustomerPaymentRow[]>([
        'customer-payments',
        customerId,
      ])
      const previousContracts = queryClient.getQueryData<ContractRow[]>(['contracts', customerId])
      const contract = previousContracts?.find((c) => c.id === input.contract_id)

      const optimisticPayment: CustomerPaymentRow = {
        id: `optimistic-${Date.now()}`,
        org_id: contract?.org_id ?? '',
        contract_id: input.contract_id,
        amount: input.amount,
        payment_date: input.payment_date,
        collected_by: session?.user.id ?? null,
        note: input.note,
        created_at: new Date().toISOString(),
        collector: { full_name: profile?.full_name ?? '' },
        contract: contract ? { id: contract.id, category: contract.category } : null,
      }

      queryClient.setQueryData<CustomerPaymentRow[]>(['customer-payments', customerId], (old) => [
        optimisticPayment,
        ...(old ?? []),
      ])

      if (previousContracts) {
        // Display-only estimate; the server value replaces it on settle.
        queryClient.setQueryData<ContractRow[]>(
          ['contracts', customerId],
          previousContracts.map((c) =>
            c.id === input.contract_id
              ? {
                  ...c,
                  remaining_amount: Math.round((c.remaining_amount - input.amount) * 100) / 100,
                }
              : c,
          ),
        )
      }

      return { previousPayments, previousContracts }
    },
    onError: (error, _input, context) => {
      if (context?.previousPayments) {
        queryClient.setQueryData(['customer-payments', customerId], context.previousPayments)
      }
      if (context?.previousContracts) {
        queryClient.setQueryData(['contracts', customerId], context.previousContracts)
      }
      toast.error(arabicErrorMessage(error))
    },
    onSuccess: () => {
      toast.success('تم تسجيل الدفعة')
    },
    onSettled: () => invalidateAfterPayment(queryClient, customerId),
  })
}

export function useDeletePayment(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => deleteCustomerPayment(paymentId),
    onSuccess: () => {
      toast.success('تم حذف الدفعة واستعادة المبلغ للرصيد')
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
    onSettled: () => invalidateAfterPayment(queryClient, customerId),
  })
}
