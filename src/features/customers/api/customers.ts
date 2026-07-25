import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database.types'
import type { CustomerFilters, CustomerInput } from '@/features/customers/schemas/customer'

const BUCKET = 'national-ids'

function toRowFields(input: CustomerInput) {
  return {
    full_name: input.full_name.trim(),
    known_as: input.known_as.trim(),
    phone: input.phone,
    alt_phone: input.alt_phone || null,
    national_id: input.national_id,
    address: input.address.trim(),
    category: input.category,
    total_amount: Number(input.total_amount),
    down_payment: Number(input.down_payment),
    monthly_installment: Number(input.monthly_installment),
    guarantor_name: input.guarantor_name.trim() || null,
    guarantor_relation: input.guarantor_relation.trim() || null,
    guarantor_phone: input.guarantor_phone || null,
    guarantor_address: input.guarantor_address.trim() || null,
    trust_receipt: input.trust_receipt === 'yes',
    legal_status: input.legal_status,
  }
}

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

export async function listCustomers(filters: CustomerFilters): Promise<Tables<'customers'>[]> {
  let query = supabase.from('customers').select('*').order('created_at', { ascending: false })

  query = filters.archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)

  if (filters.category !== 'all') query = query.eq('category', filters.category)
  if (filters.legalStatus !== 'all') query = query.eq('legal_status', filters.legalStatus)

  const search = filters.search.trim().replace(/[,()]/g, '')
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,known_as.ilike.%${search}%,phone.ilike.%${search}%,national_id.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getCustomer(id: string): Promise<Tables<'customers'>> {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createCustomer(
  input: CustomerInput,
  photo: File | null,
): Promise<Tables<'customers'>> {
  const id = crypto.randomUUID()
  const photoPath = photo ? await uploadNationalIdPhoto(id, photo) : null

  const { data: userData } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('customers')
    .insert({
      id,
      ...toRowFields(input),
      national_id_photo: photoPath,
      created_by: userData.user?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    if (photoPath) {
      // Best-effort cleanup so failed inserts don't leave orphan photos.
      void supabase.storage.from(BUCKET).remove([photoPath])
    }
    throw error
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
