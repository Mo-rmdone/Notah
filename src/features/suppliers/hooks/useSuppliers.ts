import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addSupplierInvoice,
  addSupplierPayment,
  createSupplier,
  deleteSupplier,
  deleteSupplierInvoice,
  deleteSupplierPayment,
  getInvoiceFileUrl,
  getSupplier,
  listSupplierInvoices,
  listSupplierPayments,
  listSuppliers,
  updateSupplier,
} from '@/features/suppliers/api/suppliers'
import type { InvoiceInput, SupplierInput } from '@/features/suppliers/schemas/supplier'
import { arabicErrorMessage } from '@/lib/errors'

export function useSuppliers() {
  return useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id as string),
    enabled: !!id,
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SupplierInput) => createSupplier(input),
    onSuccess: () => {
      toast.success('تم إضافة التاجر')
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierInput }) => updateSupplier(id, input),
    onSuccess: (supplier) => {
      toast.success('تم حفظ بيانات التاجر')
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      void queryClient.invalidateQueries({ queryKey: ['supplier', supplier.id] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      toast.success('تم حذف التاجر')
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

function invalidateSupplier(queryClient: ReturnType<typeof useQueryClient>, supplierId: string) {
  void queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] })
  void queryClient.invalidateQueries({ queryKey: ['supplier-payments', supplierId] })
  void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useSupplierPayments(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-payments', supplierId],
    queryFn: () => listSupplierPayments(supplierId),
  })
}

export function useAddSupplierPayment(supplierId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { amount: number; payment_date: string; note: string | null }) =>
      addSupplierPayment({ supplier_id: supplierId, ...input }),
    onSuccess: () => toast.success('تم تسجيل الدفعة'),
    onError: (error) => toast.error(arabicErrorMessage(error)),
    onSettled: () => invalidateSupplier(queryClient, supplierId),
  })
}

export function useDeleteSupplierPayment(supplierId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSupplierPayment(id),
    onSuccess: () => toast.success('تم حذف الدفعة واستعادة المبلغ للرصيد'),
    onError: (error) => toast.error(arabicErrorMessage(error)),
    onSettled: () => invalidateSupplier(queryClient, supplierId),
  })
}

export function useSupplierInvoices(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-invoices', supplierId],
    queryFn: () => listSupplierInvoices(supplierId),
  })
}

export function useAddSupplierInvoice(supplierId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, file }: { input: InvoiceInput; file: File | null }) =>
      addSupplierInvoice(supplierId, input, file),
    onSuccess: () => {
      toast.success('تم إضافة الفاتورة')
      void queryClient.invalidateQueries({ queryKey: ['supplier-invoices', supplierId] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

export function useDeleteSupplierInvoice(supplierId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, filePath }: { id: string; filePath: string | null }) =>
      deleteSupplierInvoice(id, filePath),
    onSuccess: () => {
      toast.success('تم حذف الفاتورة')
      void queryClient.invalidateQueries({ queryKey: ['supplier-invoices', supplierId] })
    },
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}

/** Signed URLs are minted on demand — the invoices bucket is private. */
export function useOpenInvoiceFile() {
  return useMutation({
    mutationFn: (path: string) => getInvoiceFileUrl(path),
    onSuccess: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
    onError: (error) => toast.error(arabicErrorMessage(error)),
  })
}
