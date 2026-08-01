import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export type InstallmentRow = Tables<'installments'>

export async function listContractInstallments(contractId: string): Promise<InstallmentRow[]> {
  const { data, error } = await supabase
    .from('installments')
    .select('*')
    .eq('contract_id', contractId)
    .order('seq_no', { ascending: true })
  if (error) throw error
  return data
}
