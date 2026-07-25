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
import type { Tables } from '@/types/database.types'

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
  amount: number
  payment_date: string
  note: string | null
}

export function useAddPayment(customerId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: profile } = useProfile()

  return useMutation({
    mutationFn: (input: AddPaymentInput) =>
      addCustomerPayment({
        customer_id: customerId,
        collected_by: session?.user.id ?? '',
        ...input,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['customer-payments', customerId] })
      await queryClient.cancelQueries({ queryKey: ['customer', customerId] })

      const previousPayments = queryClient.getQueryData<CustomerPaymentRow[]>([
        'customer-payments',
        customerId,
      ])
      const previousCustomer = queryClient.getQueryData<Tables<'customers'>>([
        'customer',
        customerId,
      ])

      const optimisticPayment: CustomerPaymentRow = {
        id: `optimistic-${Date.now()}`,
        customer_id: customerId,
        amount: input.amount,
        payment_date: input.payment_date,
        collected_by: session?.user.id ?? null,
        note: input.note,
        created_at: new Date().toISOString(),
        collector: { full_name: profile?.full_name ?? '' },
      }

      queryClient.setQueryData<CustomerPaymentRow[]>(
        ['customer-payments', customerId],
        (old) => [optimisticPayment, ...(old ?? [])],
      )
      if (previousCustomer) {
        // Display-only estimate; the server value replaces it on settle.
        const estimated = Math.round((previousCustomer.remaining_amount - input.amount) * 100) / 100
        queryClient.setQueryData<Tables<'customers'>>(['customer', customerId], {
          ...previousCustomer,
          remaining_amount: estimated,
        })
      }

      return { previousPayments, previousCustomer }
    },
    onError: (error, _input, context) => {
      if (context?.previousPayments) {
        queryClient.setQueryData(['customer-payments', customerId], context.previousPayments)
      }
      if (context?.previousCustomer) {
        queryClient.setQueryData(['customer', customerId], context.previousCustomer)
      }
      toast.error(arabicErrorMessage(error))
    },
    onSuccess: () => {
      toast.success('تم تسجيل الدفعة')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer-payments', customerId] })
      void queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      void queryClient.invalidateQueries({ queryKey: ['customer-performance', customerId] })
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
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
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer-payments', customerId] })
      void queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      void queryClient.invalidateQueries({ queryKey: ['customer-performance', customerId] })
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
