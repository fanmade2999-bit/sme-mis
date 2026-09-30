begin;

revoke select (cost, cost_updated_at, cost_updated_by_account_id)
  on public.item
  from authenticated;

commit;