import { supabase } from '@/lib/supabase'
import type { Database, Tables, TablesInsert } from '@/types/database.types'

type Fns = Database['public']['Functions']

export type DashboardSummary = Fns['dashboard_summary']['Returns'][number]
export type CategoryTotal = Fns['collections_by_category']['Returns'][number]
export type DailyTotal = Fns['daily_collections']['Returns'][number]
export type TodayPayment = Fns['today_payments']['Returns'][number]

const emptySummary: DashboardSummary = {
  total_capital: 0,
  total_collected: 0,
  collected_today: 0,
  collected_this_month: 0,
  total_outstanding: 0,
  total_owed_suppliers: 0,
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('dashboard_summary')
  if (error) throw error
  return data[0] ?? emptySummary
}

export async function getCollectionsByCategory(): Promise<CategoryTotal[]> {
  const { data, error } = await supabase.rpc('collections_by_category')
  if (error) throw error
  return data
}

export async function getDailyCollections(days = 30): Promise<DailyTotal[]> {
  const { data, error } = await supabase.rpc('daily_collections', { p_days: days })
  if (error) throw error
  return data
}

export async function getTodayPayments(): Promise<TodayPayment[]> {
  const { data, error } = await supabase.rpc('today_payments')
  if (error) throw error
  return data
}

export async function listCapitalEntries(): Promise<Tables<'capital_entries'>[]> {
  const { data, error } = await supabase
    .from('capital_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addCapitalEntry(
  payload: TablesInsert<'capital_entries'>,
): Promise<Tables<'capital_entries'>> {
  const { data, error } = await supabase
    .from('capital_entries')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCapitalEntry(id: string): Promise<void> {
  const { error } = await supabase.from('capital_entries').delete().eq('id', id)
  if (error) throw error
}
