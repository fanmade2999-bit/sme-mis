begin;

-- The client-provided canonical key is retained in the RPC signature for
-- compatibility, but the database now derives the authoritative identity from
-- product attributes so callers cannot manufacture alternate identities.

create or replace function public.ensure_product(
  p_brand text,
  p_product_name text,
  p_variant text,
  p_package_size_value numeric,
  p_package_size_unit text,
  p_barcode text,
  p_canonical_key text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id uuid;
  v_role public.staff_role;
  v_barcode text := nullif(btrim(p_barcode), '');
  v_canonical text := lower(concat_ws('|',
    nullif(btrim(p_brand), ''),
    nullif(btrim(p_product_name), ''),
    nullif(btrim(p_variant), ''),
    case
      when p_package_size_value is null then null
      else (p_package_size_value::double precision)::text
    end,
    nullif(btrim(p_package_size_unit), '')
  ));
  v_existing_barcode text;
  v_existing_status public.product_status;
  v_existing_canonical text;
begin
  v_role := private.current_staff_role();

  if v_role not in ('OWNER', 'MANAGER') then
    raise exception 'Only Owner or Manager may create/select product identities';
  end if;

  if p_product_name is null or length(btrim(p_product_name)) = 0 then
    raise exception 'Product name is required';
  end if;

  if length(v_canonical) = 0 then
    raise exception 'Canonical product identity is required';
  end if;

  -- Canonical identity is authoritative. Barcode is an exact identifier
  -- attached to that identity; it can be added later but cannot redirect
  -- a request to another product.
  select product_id, barcode, status, canonical_key
    into v_id, v_existing_barcode, v_existing_status, v_existing_canonical
  from public.product
  where canonical_key = v_canonical;

  if v_id is not null then
    if v_existing_status <> 'ACTIVE' then
      raise exception 'Product identity already exists but is inactive';
    end if;

    if v_barcode is null then
      return v_id;
    end if;

    if v_existing_barcode is not null and v_existing_barcode <> v_barcode then
      raise exception 'Canonical product identity already has a different barcode';
    end if;

    if exists (
      select 1
      from public.product
      where barcode = v_barcode
        and product_id <> v_id
    ) then
      raise exception 'Barcode is already assigned to another product identity';
    end if;

    if v_existing_barcode is null then
      update public.product
      set barcode = v_barcode,
          updated_at = now()
      where product_id = v_id;
    end if;

    return v_id;
  end if;

  -- With no canonical match, a barcode may identify an existing product only
  -- when the caller's canonical identity is exactly the same identity.
  select product_id, status, canonical_key
    into v_id, v_existing_status, v_existing_canonical
  from public.product
  where barcode = v_barcode;

  if v_id is not null then
    if v_existing_status <> 'ACTIVE' then
      raise exception 'Barcode already belongs to an inactive product identity';
    end if;

    if v_existing_canonical <> v_canonical then
      raise exception 'Barcode is assigned to a different product identity';
    end if;

    return v_id;
  end if;

  insert into public.product (
    brand, product_name, variant, package_size_value, package_size_unit,
    barcode, canonical_key
  ) values (
    nullif(btrim(p_brand), ''),
    btrim(p_product_name),
    nullif(btrim(p_variant), ''),
    p_package_size_value,
    nullif(btrim(p_package_size_unit), ''),
    v_barcode,
    v_canonical
  )
  on conflict (canonical_key) do nothing
  returning product_id into v_id;

  if v_id is null then
    -- Another request won a canonical-key race. Re-read the authoritative row.
    select product_id, status, barcode
      into v_id, v_existing_status, v_existing_barcode
    from public.product
    where canonical_key = v_canonical;

    if v_id is null then
      raise exception 'Unable to create or locate product identity';
    end if;

    if v_existing_status <> 'ACTIVE' then
      raise exception 'Product identity already exists but is inactive';
    end if;

    if v_barcode is not null then
      if exists (
        select 1
        from public.product
        where barcode = v_barcode
          and product_id <> v_id
      ) then
        raise exception 'Barcode is already assigned to another product identity';
      end if;

      if v_existing_barcode is not null and v_existing_barcode <> v_barcode then
        raise exception 'Canonical product identity already has a different barcode';
      end if;

      if v_existing_barcode is null then
        update public.product
        set barcode = v_barcode,
            updated_at = now()
        where product_id = v_id;
      end if;
    end if;
  end if;

  return v_id;
exception
  when unique_violation then
    raise exception 'Product identity or barcode already exists';
end;
$function$;

do $$
begin
  if exists (
    select 1
    from public.product
    group by lower(concat_ws('|',
      nullif(btrim(brand), ''),
      nullif(btrim(product_name), ''),
      nullif(btrim(variant), ''),
      case
        when package_size_value is null then null
        else (package_size_value::double precision)::text
      end,
      nullif(btrim(package_size_unit), '')
    ))
    having count(*) > 1
  ) then
    raise exception 'Cannot normalize product canonical keys: derived identities would collide';
  end if;
end
$$;

update public.product p
set canonical_key = lower(concat_ws('|',
  nullif(btrim(p.brand), ''),
  nullif(btrim(p.product_name), ''),
  nullif(btrim(p.variant), ''),
  case
    when p.package_size_value is null then null
    else (p.package_size_value::double precision)::text
  end,
  nullif(btrim(p.package_size_unit), '')
)),
    updated_at = now()
where p.canonical_key <> lower(concat_ws('|',
  nullif(btrim(p.brand), ''),
  nullif(btrim(p.product_name), ''),
  nullif(btrim(p.variant), ''),
  case
    when p.package_size_value is null then null
    else (p.package_size_value::double precision)::text
  end,
  nullif(btrim(p.package_size_unit), '')
));

create or replace function public.revoke_staff_account(p_account_id uuid)
returns public.staff_account
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_account public.staff_account;
  v_actor uuid := private.current_staff_account_id();
  v_sme_id uuid := private.current_sme_id();
begin
  if private.current_staff_role() is distinct from 'OWNER' then
    raise exception 'Only Owner may revoke staff accounts';
  end if;
  if v_actor is null or v_sme_id is null then
    raise exception 'Authenticated active staff account required';
  end if;
  if p_account_id = v_actor then
    raise exception 'Owner cannot revoke their own account';
  end if;

  update public.staff_account
     set is_active = false,
         revoked_at = now(),
         revoked_by_account_id = v_actor
   where account_id = p_account_id
     and sme_id = v_sme_id
     and is_active = true
     and role <> 'OWNER'
  returning * into v_account;

  if not found then
    raise exception 'Active non-owner staff account not found in current SME';
  end if;

  return v_account;
end;
$function$;

commit;
