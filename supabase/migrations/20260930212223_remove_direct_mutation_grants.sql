revoke all on table public.category from authenticated;
grant select on table public.category to authenticated;

revoke all on table public.item from authenticated;
grant select(
  item_id,sme_id,product_id,category_id,current_price,stock_qty,reorder_level,
  shelf_location,shelf_location_id,qr_code,photo_path,status,public_visible,
  price_updated_at,created_at,updated_at
) on table public.item to authenticated;

revoke all on table public.price_change_log from authenticated;
grant select(
  log_id,sme_id,item_id,account_id,old_price,new_price,changed_at
) on table public.price_change_log to authenticated;

revoke all on table public.stock_movement from authenticated;
grant select(
  movement_id,sme_id,item_id,account_id,movement_type,quantity,
  correction_direction,unit_price_snapshot,reason,date_time
) on table public.stock_movement to authenticated;
