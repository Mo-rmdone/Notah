import { supabase } from '@/lib/supabase'
import type { Database, Tables } from '@/types/database.types'

export interface CustomerPaymentRow extends Tables<'customer_payments'> {
  collector: { full_name: string } | null
  contract: { id: string; category: Database['public']['Enums']['product_category'] } | null
}

const PAYMENT_SELECT =
  '*, collector:profiles!customer_payments_collected_by_fkey(full_name), contract:contracts!inner(id, category, customer_id)'

/**
 * كل دفعات العميل عبر جميع عقوده. الدفعة صارت مرتبطة بالعقد، فالوصول للعميل يمر
 * بربط داخلي مع contracts.
 * Every payment across all of a customer's contracts. Payments now hang off the
 * contract, so reaching the customer goes through an inner join.
 */
export async function listCustomerPayments(customerId: string): Promise<CustomerPaymentRow[]> {
  const { data, error } = await supabase
    .from('customer_payments')
    .select(PAYMENT_SELECT)
    .eq('contract.customer_id', customerId)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<CustomerPaymentRow[]>()
  if (error) throw error
  return data
}

export interface AddPaymentPayload {
  contract_id: string
  amount: number
  payment_date: string
  note: string | null
  collected_by: string
}

export async function addCustomerPayment(
  payload: AddPaymentPayload,
): Promise<Tables<'customer_payments'>> {
  const { data, error } = await supabase
    .from('customer_payments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCustomerPayment(id: string): Promise<void> {
  const { error } = await supabase.from('customer_payments').delete().eq('id', id)
  if (error) throw error
}
