import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database.types'
import type { ContractInput } from '@/features/contracts/schemas/contract'

export type ContractRow = Tables<'contracts'>

// org_id يضبطه محفّز في قاعدة البيانات ولا يُرسل من المتصفح إطلاقًا.
// org_id is set by a database trigger and is deliberately never sent from the
// browser — the server overwrites whatever a client supplies.
function toRowFields(input: ContractInput) {
  return {
    category: input.category,
    contract_start_date: input.contract_start_date,
    payment_window: input.payment_window,
    total_amount: Number(input.total_amount),
    down_payment: Number(input.down_payment),
    monthly_installment: Number(input.monthly_installment),
    trust_receipt: input.trust_receipt === 'yes',
    note: input.note.trim() || null,
  }
}

export async function listContractsForCustomer(customerId: string): Promise<ContractRow[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createContract(
  customerId: string,
  input: ContractInput,
): Promise<ContractRow> {
  const { data: userData } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      customer_id: customerId,
      ...toRowFields(input),
      created_by: userData.user?.id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateContract(id: string, input: ContractInput): Promise<ContractRow> {
  const { data, error } = await supabase
    .from('contracts')
    .update(toRowFields(input))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setContractArchived(id: string, archived: boolean): Promise<void> {
  const patch: TablesUpdate<'contracts'> = {
    archived_at: archived ? new Date().toISOString() : null,
  }
  const { error } = await supabase.from('contracts').update(patch).eq('id', id)
  if (error) throw error
}
