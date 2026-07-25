import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database.types'
import type { LoginInput } from '@/features/auth/schemas/auth'

export async function signIn(input: LoginInput): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword(input)
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId: string): Promise<Tables<'profiles'>> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function listProfiles(): Promise<Tables<'profiles'>[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function updateProfile(
  id: string,
  patch: TablesUpdate<'profiles'>,
): Promise<Tables<'profiles'>> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
