begin;

create index idx_item_archive_actor on public.item (sme_id, archived_by_account_id);
create index idx_item_category on public.item (sme_id, category_id);
create index idx_item_cost_actor on public.item (sme_id, cost_updated_by_account_id);
create index idx_price_log_actor on public.price_change_log (sme_id, account_id);
create index idx_staff_created_by on public.staff_account (sme_id, created_by_account_id);
create index idx_staff_revoked_by on public.staff_account (sme_id, revoked_by_account_id);
create index idx_stock_movement_actor on public.stock_movement (sme_id, account_id);

commit;