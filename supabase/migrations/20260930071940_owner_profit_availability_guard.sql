begin;

create or replace function public.get_owner_profit_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  sales_date date,
  item_id uuid,
  product_id uuid,
  product_name text,
  sold_qty bigint,
  sales_value numeric,
  cost_coverage numeric,
  gross_profit numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    date_trunc('day', sm.date_time)::date,
    sm.item_id,
    i.product_id,
    p.product_name,
    sum(sm.quantity)::bigint,
    sum(sm.quantity * sm.unit_price_snapshot)::numeric(14,2),
    round(
      100.0 * sum(case when sm.unit_cost_snapshot is not null then sm.quantity else 0 end)
      / nullif(sum(sm.quantity), 0), 2
    )::numeric(6,2),
    case
      when count(*) filter (where sm.unit_cost_snapshot is null) = 0
      then sum(sm.quantity * (sm.unit_price_snapshot - sm.unit_cost_snapshot))::numeric(14,2)
      else null
    end
  from public.stock_movement sm
  join public.item i on i.item_id = sm.item_id and i.sme_id = sm.sme_id
  join public.product p on p.product_id = i.product_id
  where sm.sme_id = private.current_sme_id()
    and private.current_staff_role() = 'OWNER'
    and sm.movement_type = 'SALE'
    and sm.unit_price_snapshot is not null
    and (p_from is null or sm.date_time >= p_from)
    and (p_to is null or sm.date_time < p_to)
  group by 1,2,3,4
  order by 1 desc,4;
$$;

commit;