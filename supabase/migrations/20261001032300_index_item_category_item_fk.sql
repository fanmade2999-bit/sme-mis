begin;

create index if not exists idx_item_category_sme_item
  on public.item_category (sme_id, item_id);

commit;
