import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database.types'
import type { CustomerFilters, CustomerInput } from '@/features/customers/schemas/customer'
import type { ContractInput } from '@/features/contracts/schemas/contract'

const BUCKET = 'national-ids'

/** العميل ومعه عقوده — القوائم تحتاج الاثنين معًا لعرض المتبقي الإجمالي. */
export interface CustomerWithContracts extends Tables<'customers'> {
  contracts: Tables<'contracts'>[]
}

function toRowFields(input: CustomerInput) {
  return {
    full_name: input.full_name.trim(),
    known_as: input.known_as.trim(),
    phone: input.phone,
    alt_phone: input.alt_phone || null,
    national_id: input.national_id,
    address: input.address.trim(),
    guarantor_name: input.guarantor_name.trim() || null,
    guarantor_relation: input.guarantor_relation.trim() || null,
    guarantor_phone: input.guarantor_phone || null,
    guarantor_address: input.guarantor_address.trim() || null,
    legal_status: input.legal_status,
  }
}

// الملفات تُخزَّن تحت مجلد المؤسسة، وسياسات التخزين تقارن الجزء الأول من المسار
// بمؤسسة المستخدم. أي مسار بلا هذه البادئة سيُرفض.
// Objects live under the organization's folder; the storage policies compare the
// first path segment to the caller's own org, so a path without this prefix is
// rejected outright.
// المسار يبدأ بمعرّف العميل، وسياسة التخزين تتحقق أن هذا العميل يخص مؤسسة
// المستخدم (00011). لذلك يجب أن يكون صف العميل موجودًا قبل الرفع.
// The path starts with the customer id, and the storage policy checks that this
// customer belongs to the caller's org (00011). The customer row must therefore
// exist before the upload — see createCustomer's ordering.
async function uploadNationalIdPhoto(customerId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${customerId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function listCustomers(filters: CustomerFilters): Promise<CustomerWithContracts[]> {
  // فلترة النوع تتم على العقود، فنحتاج ربطًا داخليًا حتى يُستبعد من لا عقد له
  // بذلك النوع. بدون الفلتر نستخدم ربطًا خارجيًا كي يظهر العميل بلا عقود أيضًا.
  // Category lives on the contract, so filtering by it needs an inner join;
  // without the filter we use a plain embed so a customer with no contract yet
  // still appears in the list.
  const embed = filters.category === 'all' ? 'contracts(*)' : 'contracts!inner(*)'

  let query = supabase
    .from('customers')
    .select(`*, ${embed}`)
    .order('created_at', { ascending: false })

  query = filters.archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)

  if (filters.category !== 'all') query = query.eq('contracts.category', filters.category)
  if (filters.legalStatus !== 'all') query = query.eq('legal_status', filters.legalStatus)

  const search = filters.search.trim().replace(/[,()]/g, '')
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,known_as.ilike.%${search}%,phone.ilike.%${search}%,national_id.ilike.%${search}%`,
    )
  }

  const { data, error } = await query.returns<CustomerWithContracts[]>()
  if (error) throw error
  return data
}

export async function getCustomer(id: string): Promise<Tables<'customers'>> {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

/**
 * ينشئ العميل وعقده الأول معًا. لو فشل إنشاء العقد، يُحذف العميل حتى لا يبقى
 * سجل بلا أي صفقة — Postgres لا يوفر معاملة عبر طلبين، فالتنظيف يدوي هنا.
 *
 * Creates the customer and their first contract together. If the contract fails,
 * the customer row is removed so the list never shows a person with no deal.
 * PostgREST cannot span one transaction across two requests, so the compensation
 * is explicit rather than transactional.
 */
export async function createCustomer(
  input: CustomerInput,
  contract: ContractInput,
  photo: File | null,
): Promise<Tables<'customers'>> {
  const id = crypto.randomUUID()
  const { data: userData } = await supabase.auth.getUser()
  const createdBy = userData.user?.id ?? null

  // العميل أولًا، ثم الصورة: سياسة التخزين تشترط وجود صف العميل، كما أن هذا
  // الترتيب لا يترك صورة يتيمة لو فشل الإدراج.
  // Customer first, photo second: the storage policy requires the customer row
  // to exist, and this ordering also cannot strand an orphan photo if the insert
  // fails.
  const { data, error } = await supabase
    .from('customers')
    .insert({
      id,
      ...toRowFields(input),
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw error

  const { error: contractError } = await supabase.from('contracts').insert({
    customer_id: id,
    category: contract.category,
    contract_start_date: contract.contract_start_date,
    payment_window: contract.payment_window,
    total_amount: Number(contract.total_amount),
    down_payment: Number(contract.down_payment),
    monthly_installment: Number(contract.monthly_installment),
    trust_receipt: contract.trust_receipt === 'yes',
    note: contract.note.trim() || null,
    created_by: createdBy,
  })

  if (contractError) {
    await supabase.from('customers').delete().eq('id', id)
    throw contractError
  }

  // الصورة اختيارية: فشل رفعها لا يُبطل العميل والعقد، ويمكن رفعها لاحقًا من
  // شاشة التعديل.
  // The photo is optional, so a failed upload does not undo the customer and
  // contract that already succeeded — it can be re-attached from the edit screen.
  if (photo) {
    const photoPath = await uploadNationalIdPhoto(id, photo)
    const { data: withPhoto, error: photoError } = await supabase
      .from('customers')
      .update({ national_id_photo: photoPath })
      .eq('id', id)
      .select()
      .single()
    if (photoError) {
      void supabase.storage.from(BUCKET).remove([photoPath])
      throw photoError
    }
    return withPhoto
  }

  return data
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
  photo: File | null,
  previousPhotoPath: string | null,
): Promise<Tables<'customers'>> {
  const photoPath = photo ? await uploadNationalIdPhoto(id, photo) : previousPhotoPath

  const { data, error } = await supabase
    .from('customers')
    .update({ ...toRowFields(input), national_id_photo: photoPath })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (photo && photoPath) {
      void supabase.storage.from(BUCKET).remove([photoPath])
    }
    throw error
  }

  if (photo && previousPhotoPath && previousPhotoPath !== photoPath) {
    void supabase.storage.from(BUCKET).remove([previousPhotoPath])
  }
  return data
}

export async function setCustomerArchived(id: string, archived: boolean): Promise<void> {
  const patch: TablesUpdate<'customers'> = {
    archived_at: archived ? new Date().toISOString() : null,
  }
  const { error } = await supabase.from('customers').update(patch).eq('id', id)
  if (error) throw error
}

export async function getNationalIdPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600)
  if (error) throw error
  return data.signedUrl
}
