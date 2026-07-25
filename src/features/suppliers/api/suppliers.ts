import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'
import type { InvoiceInput, SupplierInput } from '@/features/suppliers/schemas/supplier'

const BUCKET = 'supplier-invoices'

function toSupplierFields(input: SupplierInput) {
  return {
    name: input.name.trim(),
    trade_type: input.trade_type,
    phone_1: input.phone_1 || null,
    phone_2: input.phone_2 || null,
    total_owed: Number(input.total_owed),
    monthly_payment: Number(input.monthly_payment),
  }
}

export async function listSuppliers(): Promise<Tables<'suppliers'>[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getSupplier(id: string): Promise<Tables<'suppliers'>> {
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createSupplier(input: SupplierInput): Promise<Tables<'suppliers'>> {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...toSupplierFields(input), created_by: userData.user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSupplier(
  id: string,
  input: SupplierInput,
): Promise<Tables<'suppliers'>> {
  const { data, error } = await supabase
    .from('suppliers')
    .update(toSupplierFields(input))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// دفعات التجار
// ---------------------------------------------------------------------------

export async function listSupplierPayments(
  supplierId: string,
): Promise<Tables<'supplier_payments'>[]> {
  const { data, error } = await supabase
    .from('supplier_payments')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export interface AddSupplierPaymentPayload {
  supplier_id: string
  amount: number
  payment_date: string
  note: string | null
}

export async function addSupplierPayment(
  payload: AddSupplierPaymentPayload,
): Promise<Tables<'supplier_payments'>> {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('supplier_payments')
    .insert({ ...payload, created_by: userData.user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSupplierPayment(id: string): Promise<void> {
  const { error } = await supabase.from('supplier_payments').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// فواتير التجار
// ---------------------------------------------------------------------------

export async function listSupplierInvoices(
  supplierId: string,
): Promise<Tables<'supplier_invoices'>[]> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('invoice_date', { ascending: false })
  if (error) throw error
  return data
}

export async function addSupplierInvoice(
  supplierId: string,
  input: InvoiceInput,
  file: File | null,
): Promise<Tables<'supplier_invoices'>> {
  let filePath: string | null = null

  if (file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    filePath = `${supplierId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) throw uploadError
  }

  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('supplier_invoices')
    .insert({
      supplier_id: supplierId,
      invoice_number: input.invoice_number.trim(),
      amount: Number(input.amount),
      invoice_date: input.invoice_date,
      note: input.note.trim() || null,
      file_path: filePath,
      created_by: userData.user?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    if (filePath) void supabase.storage.from(BUCKET).remove([filePath])
    throw error
  }
  return data
}

export async function deleteSupplierInvoice(
  id: string,
  filePath: string | null,
): Promise<void> {
  const { error } = await supabase.from('supplier_invoices').delete().eq('id', id)
  if (error) throw error
  if (filePath) void supabase.storage.from(BUCKET).remove([filePath])
}

export async function getInvoiceFileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600)
  if (error) throw error
  return data.signedUrl
}
