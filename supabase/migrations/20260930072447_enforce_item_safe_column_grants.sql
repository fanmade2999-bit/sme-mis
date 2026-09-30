begin;

revoke select on public.item from authenticated;

grant select (
  item_id,
  sme_id,
  product_id,
  category_id,
  current_price,
  stock_qty,
  reorder_level,
  shelf_location,
  qr_code,
  photo_path,
  status,
  public_visible,
  price_updated_at,
  created_at,
  updated_at
) on public.item to authenticated;

commit;