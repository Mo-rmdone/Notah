import { supabase } from '@/lib/supabase'
import type { Database, Tables } from '@/types/database.types'

export interface CustomerPaymentRow extends Tables<'customer_payments'> {
  collector: { full_name: string } | null
}

export type PerformanceMonth =
  Database['public']['Functions']['customer_performance']['Returns'][number]

export async function listCustomerPayments(customerId: string): Promise<CustomerPaymentRow[]> {
  const { data, error } = await supabase
    .from('customer_payments')
    .select('*, collector:profiles!customer_payments_collected_by_fkey(full_name)')
    .eq('customer_id', customerId)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<CustomerPaymentRow[]>()
  if (error) throw error
  return data
}

export interface AddPaymentPayload {
  customer_id: string
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

export async function getCustomerPerformance(customerId: string): Promise<PerformanceMonth[]> {
  const { data, error } = await supabase.rpc('customer_performance', {
    p_customer_id: customerId,
  })
  if (error) throw error
  return data
}
