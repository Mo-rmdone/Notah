import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database.types'
import type { LoginInput, RegisterInput } from '@/features/auth/schemas/auth'

export async function signIn(input: LoginInput): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword(input)
  if (error) throw error
}

export async function signUp(
  input: RegisterInput,
): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name,
        phone: input.phone,
        address: input.address,
        business_size: input.business_size,
      },
    },
  })
  if (error) throw error
  return { needsEmailConfirmation: !data.session }
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
