begin;

create or replace function public.create_catalog_item(
  p_brand text,
  p_product_name text,
  p_variant text default null,
  p_package_size_value numeric default null,
  p_package_size_unit text default null,
  p_barcode text default null,
  p_canonical_key text default null,
  p_category_id uuid default null,
  p_current_price numeric default null,
  p_cost numeric default null,
  p_reorder_level integer default 0,
  p_shelf_location text default null,
  p_qr_code text default null,
  p_photo_path text default null,
  p_public_visible boolean default true,
  p_initial_stock integer default 0
)
returns public.item
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.staff_role := private.current_staff_role();
  v_sme_id uuid := private.current_sme_id();
  v_product_id uuid;
  v_item public.item;
begin
  if v_sme_id is null or v_role is null then
    raise exception 'Authenticated active staff account required';
  end if;
  if v_role not in ('OWNER','MANAGER') then
    raise exception 'Only Owner or Manager may create catalog items';
  end if;
  if p_product_name is null or length(btrim(p_product_name)) = 0 then
    raise exception 'Product name is required';
  end if;
  if p_current_price is null or p_current_price < 0 then
    raise exception 'Price must be zero or greater';
  end if;
  if p_cost is not null and v_role <> 'OWNER' then
    raise exception 'Only Owner may set item cost';
  end if;
  if p_cost is not null and p_cost < 0 then
    raise exception 'Cost must be null or zero or greater';
  end if;
  if p_reorder_level is null or p_reorder_level < 0 then
    raise exception 'Reorder level must be zero or greater';
  end if;
  if p_initial_stock is null or p_initial_stock < 0 then
    raise exception 'Initial stock must be zero or greater';
  end if;
  if p_canonical_key is null or length(btrim(p_canonical_key)) = 0 then
    raise exception 'Canonical key is required';
  end if;
  if p_category_id is null or not exists (
    select 1 from public.category
    where category_id = p_category_id and sme_id = v_sme_id
  ) then
    raise exception 'Category does not belong to current SME';
  end if;

  v_product_id := public.ensure_product(
    p_brand,p_product_name,p_variant,p_package_size_value,
    p_package_size_unit,p_barcode,p_canonical_key
  );

  v_item := public.create_item(
    v_product_id,p_category_id,p_current_price,p_cost,p_reorder_level,
    p_shelf_location,p_qr_code,p_photo_path,p_public_visible,p_initial_stock
  );

  return v_item;
end;
$$;

revoke execute on function public.create_catalog_item(
  text,text,text,numeric,text,text,text,uuid,numeric,numeric,integer,text,text,text,boolean,integer
) from public, anon;
grant execute on function public.create_catalog_item(
  text,text,text,numeric,text,text,text,uuid,numeric,numeric,integer,text,text,text,boolean,integer
) to authenticated;

revoke execute on function public.ensure_product(
  text,text,text,numeric,text,text,text
) from authenticated;

commit;