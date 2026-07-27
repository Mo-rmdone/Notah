// =============================================================================
// manage-collector — إنشاء حسابات المحصّلين وحذفها
// =============================================================================
// إنشاء مستخدم أو حذفه يتطلب مفتاح service_role، وهو مفتاح يتجاوز كل سياسات
// الأمان. لذلك لا يجوز أن يصل إلى المتصفح إطلاقًا، والعملية تجري هنا على الخادم.
//
// Creating or deleting an auth user requires the service_role key, which
// bypasses every RLS policy. It must never reach the browser, so both actions
// run here instead. The caller's JWT is verified on every request and the
// caller must be an active owner; the target must be a collector in that same
// organization.
//
// النشر · deploy:  supabase functions deploy manage-collector
// المفاتيح تُحقن تلقائيًا من المنصة — لا أسرار تُدار يدويًا.
// The SUPABASE_* env vars are injected by the platform; no secrets to manage.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** خطأ برسالة عربية جاهزة للعرض · an error carrying a ready-to-display message */
function fail(status: number, code: string, message: string): Response {
  return json(status, { code, message })
}

// حروف بلا التباس بصري (بلا O/0/I/l/1): كلمة المرور تُملى على المحصّل غالبًا
// عبر واتساب أو شفهيًا، والخلط بين الصفر وحرف O يعني اتصال دعم.
// No visually ambiguous characters: this password gets relayed over WhatsApp or
// read aloud, and confusing 0 with O turns into a support call.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generatePassword(length = 12): string {
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join('')
}

interface Caller {
  id: string
  org_id: string
}

/**
 * يتحقق من الرمز ويعيد المتصل فقط إذا كان مالكًا نشطًا.
 * Verifies the JWT and returns the caller only if they are an active owner.
 */
async function authorizeOwner(
  admin: SupabaseClient,
  req: Request,
): Promise<Caller | Response> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return fail(401, 'UNAUTHENTICATED', 'الجلسة منتهية — سجّل الدخول مرة أخرى')

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) {
    return fail(401, 'UNAUTHENTICATED', 'الجلسة منتهية — سجّل الدخول مرة أخرى')
  }

  // يُقرأ بمفتاح الخدمة لا بجلسة المتصل: نتحقق من الدور صراحةً هنا بدل الاعتماد
  // على RLS، حتى يكون شرط الصلاحية مقروءًا في مكان واحد.
  // Read with the service key rather than the caller's session: the role check
  // is explicit here instead of implied by RLS, so the rule lives in one place.
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id, role, active')
    .eq('id', data.user.id)
    .single()

  if (!profile || profile.role !== 'owner' || !profile.active) {
    return fail(403, 'NOT_OWNER', 'هذه العملية متاحة لمالك المحل فقط')
  }

  return { id: data.user.id, org_id: profile.org_id }
}

async function createCollector(
  admin: SupabaseClient,
  caller: Caller,
  payload: Record<string, unknown>,
): Promise<Response> {
  const email = String(payload.email ?? '').trim().toLowerCase()
  const fullName = String(payload.full_name ?? '').trim()
  const phone = String(payload.phone ?? '').trim()

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return fail(400, 'INVALID_INPUT', 'البريد الإلكتروني غير صحيح')
  }
  if (!fullName) {
    return fail(400, 'INVALID_INPUT', 'اسم المحصّل مطلوب')
  }
  if (phone && !/^01\d{9}$/.test(phone)) {
    return fail(400, 'INVALID_INPUT', 'رقم الهاتف بصيغة 01xxxxxxxxx')
  }

  // فحص مسبق للحد لتقديم رسالة واضحة. المحفّز في قاعدة البيانات هو الضمان
  // الحقيقي — لو تجاوزه طلبان متزامنان فسيفشل الإدراج داخل نفس المعاملة ولن
  // يبقى مستخدم يتيم.
  // Pre-checked here only to return a clear message. The database trigger is
  // the real guarantee: if two concurrent requests slip past this check, the
  // profile insert fails inside the same transaction as the auth user, so no
  // orphaned account can survive.
  const [{ data: org }, { count }] = await Promise.all([
    admin.from('organizations').select('max_collectors').eq('id', caller.org_id).single(),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', caller.org_id)
      .eq('role', 'collector')
      .eq('active', true),
  ])

  const limit = org?.max_collectors ?? 0
  if ((count ?? 0) >= limit) {
    return fail(
      409,
      'COLLECTOR_LIMIT_REACHED',
      `تم بلوغ الحد الأقصى (${limit} محصّلين). أوقف حساب محصّل حالي لتحرير مكان.`,
    )
  }

  const password = generatePassword()

  // org_id في البيانات الوصفية هو ما يجعل handle_new_user ينضم بالمستخدم إلى
  // مؤسسة المالك بدور «محصّل» بدل إنشاء مؤسسة جديدة — انظر 00006.
  // org_id in the metadata is what makes handle_new_user attach this user to
  // the owner's organization as a collector instead of creating a brand new
  // organization for them — see 00006.
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, org_id: caller.org_id },
  })

  if (error || !created.user) {
    const raw = error?.message ?? ''
    if (/already been registered|already exists|duplicate/i.test(raw)) {
      return fail(409, 'EMAIL_TAKEN', 'هذا البريد الإلكتروني مستخدم بالفعل')
    }
    if (/COLLECTOR_LIMIT_REACHED/.test(raw)) {
      return fail(409, 'COLLECTOR_LIMIT_REACHED', 'تم بلوغ الحد الأقصى لعدد المحصّلين')
    }
    console.error('createUser failed:', raw)
    return fail(500, 'CREATE_FAILED', 'تعذر إنشاء الحساب — حاول مرة أخرى')
  }

  // handle_new_user ينشئ الصف بالاسم والدور فقط، فالهاتف يُضاف بعدها.
  // handle_new_user creates the row with name and role only; phone follows.
  if (phone) {
    await admin.from('profiles').update({ phone }).eq('id', created.user.id)
  }

  // كلمة المرور تُعاد مرة واحدة ولا تُسجَّل في أي مكان.
  // Returned exactly once and never logged anywhere.
  return json(200, { user_id: created.user.id, email, password })
}

async function removeCollector(
  admin: SupabaseClient,
  caller: Caller,
  payload: Record<string, unknown>,
): Promise<Response> {
  const userId = String(payload.user_id ?? '')
  if (!userId) return fail(400, 'INVALID_INPUT', 'لم يُحدَّد المستخدم')

  if (userId === caller.id) {
    return fail(400, 'CANNOT_REMOVE_SELF', 'لا يمكنك حذف حسابك أنت')
  }

  const { data: target } = await admin
    .from('profiles')
    .select('org_id, role, full_name')
    .eq('id', userId)
    .single()

  // الشرطان معًا: العضوية في نفس المؤسسة، والدور. غياب أحدهما يعني أن مالكًا
  // يستطيع حذف فريق محل آخر أو حذف مالك شريك.
  // Both conditions matter: same organization AND role. Dropping either would
  // let an owner delete another shop's team, or delete a co-owner.
  if (!target || target.org_id !== caller.org_id) {
    return fail(404, 'NOT_IN_ORG', 'هذا المستخدم ليس ضمن فريق محلك')
  }
  if (target.role !== 'collector') {
    return fail(403, 'CANNOT_REMOVE_OWNER', 'لا يمكن حذف حساب مالك من هنا')
  }

  // حذف مستخدم المصادقة يحذف صف profiles تتابعيًا، وتصبح دفعاته السابقة بلا
  // اسم محصّل (collected_by ... on delete set null) — الدفعات نفسها تبقى.
  // Deleting the auth user cascades to the profile row, and their past payments
  // lose the collector name (collected_by ... on delete set null). The payment
  // records themselves are untouched.
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    console.error('deleteUser failed:', error.message)
    return fail(500, 'DELETE_FAILED', 'تعذر حذف الحساب — حاول مرة أخرى')
  }

  return json(200, { user_id: userId })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'طلب غير مدعوم')

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    console.error('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return fail(500, 'MISCONFIGURED', 'الخدمة غير مهيأة — راجع إعدادات المشروع')
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const caller = await authorizeOwner(admin, req)
  if (caller instanceof Response) return caller

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return fail(400, 'INVALID_INPUT', 'صيغة الطلب غير صحيحة')
  }

  switch (payload.action) {
    case 'create':
      return await createCollector(admin, caller, payload)
    case 'remove':
      return await removeCollector(admin, caller, payload)
    default:
      return fail(400, 'INVALID_INPUT', 'إجراء غير معروف')
  }
})
