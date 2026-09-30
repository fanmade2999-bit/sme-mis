begin;

create table if not exists public.item_category (
  item_id uuid not null,
  category_id uuid not null,
  sme_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (item_id, category_id),
  constraint fk_item_category_item_same_sme
    foreign key (sme_id, item_id) references public.item (sme_id, item_id) on delete cascade,
  constraint fk_item_category_category_same_sme
    foreign key (sme_id, category_id) references public.category (sme_id, category_id) on delete cascade
);

create index if not exists idx_item_category_sme_category
  on public.item_category (sme_id, category_id, item_id);

insert into public.item_category (item_id, category_id, sme_id)
select item_id, category_id, sme_id from public.item
on conflict (item_id, category_id) do nothing;

create table if not exists public.shelf_location (
  location_id uuid primary key default gen_random_uuid(),
  sme_id uuid not null references public.sme(sme_id) on delete cascade,
  location_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_shelf_location_sme_id unique (sme_id, location_id),
  constraint ck_shelf_location_name_nonblank check (length(btrim(location_name)) > 0)
);

create unique index if not exists uq_shelf_location_sme_name_ci
  on public.shelf_location (sme_id, lower(btrim(location_name)));

alter table public.item add column if not exists shelf_location_id uuid;

alter table public.item drop constraint if exists fk_item_shelf_location_same_sme;
alter table public.item add constraint fk_item_shelf_location_same_sme
  foreign key (sme_id, shelf_location_id)
  references public.shelf_location (sme_id, location_id);

create index if not exists idx_item_sme_location
  on public.item (sme_id, shelf_location_id);

insert into public.shelf_location (sme_id, location_name)
select distinct sme_id, btrim(shelf_location)
from public.item
where shelf_location is not null and length(btrim(shelf_location)) > 0
on conflict do nothing;

update public.item i
set shelf_location_id = sl.location_id
from public.shelf_location sl
where sl.sme_id = i.sme_id
  and lower(btrim(sl.location_name)) = lower(btrim(i.shelf_location))
  and i.shelf_location is not null;

alter table public.item_category enable row level security;
alter table public.shelf_location enable row level security;

drop policy if exists item_category_select_same_sme on public.item_category;
create policy item_category_select_same_sme on public.item_category
for select to authenticated using (sme_id = private.current_sme_id());

drop policy if exists shelf_location_select_same_sme on public.shelf_location;
create policy shelf_location_select_same_sme on public.shelf_location
for select to authenticated using (sme_id = private.current_sme_id() and is_active = true);

grant select on public.item_category to authenticated;
grant select on public.shelf_location to authenticated;

drop function if exists public.create_shelf_location(text);
create function public.create_shelf_location(p_location_name text)
returns public.shelf_location
language plpgsql security definer set search_path=''
as $$
declare
  v_sme_id uuid := private.current_sme_id();
  v_role public.staff_role := private.current_staff_role();
  v_location public.shelf_location;
begin
  if v_sme_id is null or v_role is null then raise exception 'Authenticated active staff account required'; end if;
  if v_role not in ('OWNER','MANAGER') then raise exception 'Only Owner or Manager may create shelf locations'; end if;
  if p_location_name is null or length(btrim(p_location_name)) = 0 then raise exception 'Shelf/location name is required'; end if;
  insert into public.shelf_location(sme_id, location_name)
  values(v_sme_id, btrim(p_location_name))
  on conflict (sme_id, lower(btrim(location_name))) do update
    set is_active = true, updated_at = now()
  returning * into v_location;
  return v_location;
end;
$$;

revoke execute on function public.create_shelf_location(text) from public, anon;
grant execute on function public.create_shelf_location(text) to authenticated;

-- Recreate the catalog creation RPC with optional multi-category and shelf-location inputs.
drop function if exists public.create_catalog_item(
  text,text,text,numeric,text,text,text,uuid,numeric,numeric,integer,text,text,text,boolean,integer
);

create function public.create_catalog_item(
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
  p_initial_stock integer default 0,
  p_category_ids uuid[] default null,
  p_shelf_location_id uuid default null
)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_role public.staff_role := private.current_staff_role();
  v_sme_id uuid := private.current_sme_id();
  v_product_id uuid;
  v_item public.item;
  v_category_ids uuid[];
  v_location_name text;
begin
  if v_sme_id is null or v_role is null then raise exception 'Authenticated active staff account required'; end if;
  if v_role not in ('OWNER','MANAGER') then raise exception 'Only Owner or Manager may create catalog items'; end if;
  if p_product_name is null or length(btrim(p_product_name)) = 0 then raise exception 'Product name is required'; end if;
  if p_current_price is null or p_current_price < 0 then raise exception 'Price must be zero or greater'; end if;
  if p_cost is not null and v_role <> 'OWNER' then raise exception 'Only Owner may set item cost'; end if;
  if p_cost is not null and p_cost < 0 then raise exception 'Cost must be null or zero or greater'; end if;
  if p_reorder_level is null or p_reorder_level < 0 then raise exception 'Reorder level must be zero or greater'; end if;
  if p_initial_stock is null or p_initial_stock < 0 then raise exception 'Initial stock must be zero or greater'; end if;
  if p_canonical_key is null or length(btrim(p_canonical_key)) = 0 then raise exception 'Canonical key is required'; end if;

  v_category_ids := coalesce(
    p_category_ids,
    case when p_category_id is null then null::uuid[] else array[p_category_id] end
  );

  if v_category_ids is null or coalesce(cardinality(v_category_ids), 0) = 0 then raise exception 'Select at least one category'; end if;
  if exists (select 1 from unnest(v_category_ids) c where c is null) then raise exception 'Category selection contains an invalid value'; end if;
  if (select count(distinct c) from unnest(v_category_ids) c) <> cardinality(v_category_ids) then raise exception 'Duplicate categories are not allowed'; end if;
  if (select count(*) from public.category c where c.sme_id = v_sme_id and c.category_id = any(v_category_ids)) <> cardinality(v_category_ids) then
    raise exception 'One or more categories do not belong to current SME';
  end if;

  if p_shelf_location_id is not null then
    select location_name into v_location_name
    from public.shelf_location
    where location_id = p_shelf_location_id and sme_id = v_sme_id and is_active = true;
    if v_location_name is null then raise exception 'Shelf/location does not belong to current SME'; end if;
  elsif p_shelf_location is not null and length(btrim(p_shelf_location)) > 0 then
    v_location_name := btrim(p_shelf_location);
  end if;

  v_product_id := public.ensure_product(
    p_brand,p_product_name,p_variant,p_package_size_value,
    p_package_size_unit,p_barcode,p_canonical_key
  );

  v_item := public.create_item(
    v_product_id,v_category_ids[1],p_current_price,p_cost,p_reorder_level,
    v_location_name,p_qr_code,p_photo_path,p_public_visible,p_initial_stock
  );

  if p_shelf_location_id is not null then
    update public.item
    set shelf_location_id = p_shelf_location_id, shelf_location = v_location_name
    where item_id = v_item.item_id and sme_id = v_sme_id
    returning * into v_item;
  end if;

  insert into public.item_category(item_id, category_id, sme_id)
  select v_item.item_id, c, v_sme_id
  from unnest(v_category_ids) c
  on conflict (item_id, category_id) do nothing;

  return jsonb_build_object(
    'item_id',v_item.item_id,'sme_id',v_item.sme_id,'product_id',v_item.product_id,
    'category_id',v_item.category_id,'category_ids',v_category_ids,
    'current_price',v_item.current_price,'stock_qty',v_item.stock_qty,
    'reorder_level',v_item.reorder_level,'shelf_location',v_item.shelf_location,
    'shelf_location_id',v_item.shelf_location_id,'qr_code',v_item.qr_code,
    'photo_path',v_item.photo_path,'status',v_item.status,
    'public_visible',v_item.public_visible,'price_updated_at',v_item.price_updated_at,
    'created_at',v_item.created_at,'updated_at',v_item.updated_at
  );
exception when unique_violation then
  raise exception 'This SME already has an item for that product or QR code';
end;
$$;

revoke execute on function public.create_catalog_item(
  text,text,text,numeric,text,text,text,uuid,numeric,numeric,integer,text,text,text,boolean,integer,uuid[],uuid
) from public, anon;
grant execute on function public.create_catalog_item(
  text,text,text,numeric,text,text,text,uuid,numeric,numeric,integer,text,text,text,boolean,integer,uuid[],uuid
) to authenticated;

commit;
