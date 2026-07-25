import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True when both env vars hold real project values. App renders a setup screen
 * instead of crashing when they are missing or still the sample placeholders —
 * otherwise every request fails as a generic network error, which reads as
 * "you are offline" rather than "you never configured a backend".
 *
 * Never throw at module scope here: the bundler inlines the env values, and an
 * unconditional throw lets the minifier dead-code-eliminate the whole app.
 */
function isPlaceholder(value: string): boolean {
  return /placeholder|your-project-ref|your-anon-public-key/i.test(value)
}

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !isPlaceholder(supabaseUrl) &&
  !isPlaceholder(supabaseAnonKey)

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
