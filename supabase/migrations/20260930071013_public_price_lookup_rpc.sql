begin;

drop view if exists public.v_public_price_comparison;

create or replace function public.get_public_price_comparison(
  p_search text default null,
  p_product_id uuid default null
)
returns table (
  product_id uuid,
  brand text,
  product_name text,
  variant text,
  package_size_value numeric,
  package_size_unit text,
  sme_id uuid,
  business_name text,
  current_price numeric,
  price_updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.product_id,
    p.brand,
    p.product_name,
    p.variant,
    p.package_size_value,
    p.package_size_unit,
    i.sme_id,
    s.business_name,
    i.current_price,
    i.price_updated_at
  from public.item i
  join public.product p on p.product_id = i.product_id
  join public.sme s on s.sme_id = i.sme_id
  where s.status = 'ACTIVE'
    and s.public_listing_enabled = true
    and i.status = 'ACTIVE'
    and i.public_visible = true
    and p.status = 'ACTIVE'
    and (p_product_id is null or i.product_id = p_product_id)
    and (
      p_search is null
      or length(btrim(p_search)) = 0
      or p.product_name ilike '%' || btrim(p_search) || '%'
      or coalesce(p.brand, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(p.variant, '') ilike '%' || btrim(p_search) || '%'
    )
  order by p.product_name, s.business_name;
$$;

revoke all on function public.get_public_price_comparison(text,uuid)
  from public, anon, authenticated;
grant execute on function public.get_public_price_comparison(text,uuid)
  to anon, authenticated;

commit;