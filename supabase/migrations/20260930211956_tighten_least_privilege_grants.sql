revoke all on table public.item_category from anon, authenticated;
grant select on table public.item_category to authenticated;

revoke all on table public.shelf_location from anon, authenticated;
grant select on table public.shelf_location to authenticated;

revoke all on table public.v_inventory_status from anon, authenticated;
grant select on table public.v_inventory_status to authenticated;

revoke all on table public.v_sales_daily from anon, authenticated;
grant select on table public.v_sales_daily to authenticated;

revoke all on table public.v_price_freshness from anon, authenticated;
grant select on table public.v_price_freshness to authenticated;

revoke all on table public.v_public_price_comparison from anon, authenticated;
grant select on table public.v_public_price_comparison to anon, authenticated;

revoke all on table public.v_public_price_position from anon, authenticated;
grant select on table public.v_public_price_position to anon, authenticated;

revoke all on table public.staff_account from authenticated;
grant select(
  account_id,sme_id,first_name,middle_name,last_name,name_suffix,
  role,is_active,created_at
) on table public.staff_account to authenticated;

revoke all on table public.sme from authenticated;
grant select(sme_id,business_name,status,public_listing_enabled) on table public.sme to authenticated;
