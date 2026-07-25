import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addCapitalEntry,
  deleteCapitalEntry,
  getCollectionsByCategory,
  getDailyCollections,
  getDashboardSummary,
  getTodayPayments,
  listCapitalEntries,
} from '@/features/dashboard/api/dashboard'
import { arabicErrorMessage } from '@/lib/errors'
import type { TablesInsert } from '@/types/database.types'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  })
}

export function useCollectionsByCategory() {
  return useQuery({
    queryKey: ['dashboard', 'by-category'],
    queryFn: getCollectionsByCategory,
  })
}

export function useDailyCollections(days = 30) {
  return useQuery({
    queryKey: ['dashboard', 'daily', days],
    queryFn: () => getDailyCollections(days),
  })
}

export function useTodayPayments() {
  return useQuery({
    queryKey: ['dashboard', 'today-payments'],
    queryFn: getTodayPayments,
  })
}

export function useCapitalEntries() {
  return useQuery({
    queryKey: ['capital'],
    queryFn: listCapitalEntries,
  })
}

export function useAddCapitalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesInsert<'capital_entries'>) => addCapitalEntry(payload),
    onSuccess: () => {
      toast.success('تم تسجيل الحركة')
      void queryClient.invalidateQueries({ queryKey: ['capital'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

export function useDeleteCapitalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCapitalEntry(id),
    onSuccess: () => {
      toast.success('تم حذف الحركة')
      void queryClient.invalidateQueries({ queryKey: ['capital'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}
