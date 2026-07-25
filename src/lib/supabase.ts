import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True when both env vars were present at build time. App renders a setup
 * screen instead of crashing when they are missing. Never throw at module
 * scope here: the bundler inlines the env values, and an unconditional throw
 * lets the minifier dead-code-eliminate the entire app behind it.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
