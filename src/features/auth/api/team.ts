import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'
import type { CollectorInput } from '@/features/auth/schemas/auth'

export interface CreatedCollector {
  user_id: string
  email: string
  /** تُعرض مرة واحدة ولا تُحفظ · shown once, never stored */
  password: string
}

/**
 * تنادي دالة الحافة وتُظهر رسالتها العربية.
 *
 * FunctionsHttpError يخفي جسم الرد خلف كائن Response، فبدون قراءته صراحةً تصل
 * كل الأخطاء إلى المستخدم كـ «حالة غير ناجحة» بلا سبب.
 *
 * Calls the Edge Function and surfaces its Arabic message. FunctionsHttpError
 * keeps the response body behind a Response object, so without reading it every
 * failure would reach the user as a bare "non-2xx status" with no reason.
 */
async function invokeManageCollector<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('manage-collector', { body })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = (await error.context.json().catch(() => null)) as {
        message?: string
      } | null
      if (payload?.message) throw new Error(payload.message)
    }
    throw error
  }

  return data as T
}

/** سياسة 00008 تُرجع مؤسسة المتصل وحدها، فلا حاجة لتمرير معرّف. */
export async function getOrganization(): Promise<Tables<'organizations'>> {
  const { data, error } = await supabase.from('organizations').select('*').single()
  if (error) throw error
  return data
}

export async function createCollector(input: CollectorInput): Promise<CreatedCollector> {
  return invokeManageCollector<CreatedCollector>({
    action: 'create',
    email: input.email,
    full_name: input.full_name,
    phone: input.phone,
  })
}

export async function removeCollector(userId: string): Promise<void> {
  await invokeManageCollector({ action: 'remove', user_id: userId })
}
