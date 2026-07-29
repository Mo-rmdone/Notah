-- =============================================================================
-- 00012_business_size.sql — business size classification for owner organizations
-- =============================================================================
-- Descriptive metadata for new owners during signup: helps understand the scale
-- of their installment operation (freelancer, single shop, multi-location, bulk).

create type public.business_size as enum ('individual', 'small', 'medium', 'large');

comment on type public.business_size is 'حجم نشاط البائع: فردي / صغير / متوسط / كبير';

alter table public.organizations add column business_size public.business_size;

comment on column public.organizations.business_size is 'حجم النشاط: فردي (بائع مستقل) أو صغير (محل واحد) أو متوسط (أكثر من فرع) أو كبير (سلسلة محلات)';

-- ---------------------------------------------------------------------------
-- handle_new_user — updated to read signup fields on self-signup path
-- ---------------------------------------------------------------------------
-- Self-signup (v_org_id is null) reads phone, address, business_size from metadata
-- and sets them on the new organization and profile.
-- Invited collectors (v_org_id is not null) join an existing org; their phone
-- is set separately by the manage-collector edge function.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_full_name text;
  v_address text;
  v_business_size public.business_size;
  v_phone text;
begin
  v_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(new.email, '@', 1)
  );
  v_org_id := nullif(new.raw_user_meta_data ->> 'org_id', '')::uuid;
  v_address := nullif(new.raw_user_meta_data ->> 'address', '');
  v_business_size := nullif(new.raw_user_meta_data ->> 'business_size', '')::public.business_size;
  v_phone := nullif(new.raw_user_meta_data ->> 'phone', '');

  if v_org_id is null then
    -- Self-signup: create a brand new organization
    insert into public.organizations (name, owner_id, address, business_size)
    values (
      coalesce(nullif(new.raw_user_meta_data ->> 'shop_name', ''), v_full_name),
      new.id,
      v_address,
      v_business_size
    )
    returning id into v_org_id;

    insert into public.profiles (id, org_id, full_name, phone, role)
    values (new.id, v_org_id, v_full_name, v_phone, 'owner');
  else
    -- Invited collector: join an existing organization
    insert into public.profiles (id, org_id, full_name, role)
    values (new.id, v_org_id, v_full_name, 'collector');
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
