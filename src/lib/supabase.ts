import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'إعدادات Supabase ناقصة: أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف ‎.env',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
