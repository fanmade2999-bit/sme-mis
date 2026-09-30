begin;

drop function if exists public.get_public_price_comparison(text, uuid);

grant select (sme_id, business_name, status, public_listing_enabled)
  on public.sme to anon;

grant select (product_id, brand, product_name, variant, package_size_value, package_size_unit, status)
  on public.product to anon;

grant select (item_id, sme_id, product_id, current_price, status, public_visible, price_updated_at)
  on public.item to anon;

drop view if exists public.v_public_price_comparison;

create view public.v_public_price_comparison
with (security_invoker = true)
as
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
  and p.status = 'ACTIVE';

grant select on public.v_public_price_comparison to anon, authenticated;

commit;