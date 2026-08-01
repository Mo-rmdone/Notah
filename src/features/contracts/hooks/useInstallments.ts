import { useQuery } from '@tanstack/react-query'
import { listContractInstallments } from '@/features/contracts/api/installments'

export function useContractInstallments(contractId: string) {
  return useQuery({
    queryKey: ['installments', contractId],
    queryFn: () => listContractInstallments(contractId),
  })
}
