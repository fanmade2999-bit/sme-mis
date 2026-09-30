begin;

drop function if exists public.bootstrap_sme_owner(text);

create or replace function public.bootstrap_sme_owner(p_business_name text, p_full_name text)
returns public.staff_account language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid:=auth.uid(); v_sme_id uuid; v_account public.staff_account;
begin
  if v_user_id is null then raise exception 'Authenticated user required'; end if;
  if p_business_name is null or length(btrim(p_business_name))=0 then raise exception 'Business name is required'; end if;
  if p_full_name is null or length(btrim(p_full_name))=0 then raise exception 'Owner name is required'; end if;
  if exists(select 1 from public.staff_account where auth_user_id=v_user_id) then
    raise exception 'This authenticated user already has an SME account';
  end if;
  insert into public.sme(business_name) values(btrim(p_business_name)) returning sme_id into v_sme_id;
  insert into public.staff_account(sme_id,auth_user_id,full_name,role)
  values(v_sme_id,v_user_id,btrim(p_full_name),'OWNER') returning * into v_account;
  return v_account;
end;
$$;

revoke execute on function public.bootstrap_sme_owner(text,text) from public,anon;
grant execute on function public.bootstrap_sme_owner(text,text) to authenticated;

revoke select on public.stock_movement from authenticated;
grant select (
  movement_id,sme_id,item_id,account_id,movement_type,quantity,
  correction_direction,unit_price_snapshot,reason,date_time
) on public.stock_movement to authenticated;

create or replace function public.revoke_staff_account(p_account_id uuid)
returns public.staff_account language plpgsql security definer
set search_path = ''
as $$
declare
  v_account public.staff_account;
  v_actor uuid:=private.current_staff_account_id();
  v_sme_id uuid:=private.current_sme_id();
begin
  if private.current_staff_role()<>'OWNER' then raise exception 'Only Owner may revoke staff accounts'; end if;
  if v_actor is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;
  if p_account_id=v_actor then raise exception 'Owner cannot revoke their own account'; end if;
  update public.staff_account
  set is_active=false,revoked_at=now(),revoked_by_account_id=v_actor
  where account_id=p_account_id and sme_id=v_sme_id and is_active=true
  returning * into v_account;
  if not found then raise exception 'Active staff account not found in current SME'; end if;
  return v_account;
end;
$$;

create or replace function public.change_staff_role(p_account_id uuid,p_new_role public.staff_role)
returns public.staff_account language plpgsql security definer
set search_path = ''
as $$
declare v_account public.staff_account; v_sme_id uuid:=private.current_sme_id();
begin
  if private.current_staff_role()<>'OWNER' then raise exception 'Only Owner may change staff roles'; end if;
  if p_new_role='OWNER' then raise exception 'Owner role cannot be assigned through staff role management'; end if;
  update public.staff_account
  set role=p_new_role
  where account_id=p_account_id and sme_id=v_sme_id and is_active=true and role<>'OWNER'
  returning * into v_account;
  if not found then raise exception 'Active non-owner staff account not found in current SME'; end if;
  return v_account;
end;
$$;

revoke execute on function public.revoke_staff_account(uuid) from public,anon;
revoke execute on function public.change_staff_role(uuid,public.staff_role) from public,anon;
grant execute on function public.revoke_staff_account(uuid) to authenticated;
grant execute on function public.change_staff_role(uuid,public.staff_role) to authenticated;

create or replace view public.v_inventory_status with (security_invoker=true) as
select
  i.item_id,i.sme_id,i.product_id,i.category_id,p.product_name,p.brand,p.variant,
  i.current_price,i.stock_qty,i.reorder_level,
  (i.stock_qty<=i.reorder_level) as is_low_stock,
  (i.stock_qty*i.current_price)::numeric(14,2) as inventory_retail_value,
  i.price_updated_at,i.status
from public.item i
join public.product p on p.product_id=i.product_id
where i.status<>'ARCHIVED' and p.status='ACTIVE';

create or replace view public.v_sales_daily with (security_invoker=true) as
select
  date_trunc('day',sm.date_time)::date as sales_date,
  sm.sme_id,sm.item_id,i.product_id,i.category_id,
  sum(sm.quantity)::bigint as sold_qty,
  sum(sm.quantity*sm.unit_price_snapshot)::numeric(14,2) as sales_value
from public.stock_movement sm
join public.item i on i.item_id=sm.item_id and i.sme_id=sm.sme_id
where sm.movement_type='SALE' and sm.unit_price_snapshot is not null
group by 1,2,3,4,5;

create or replace view public.v_price_freshness with (security_invoker=true) as
select
  i.item_id,i.sme_id,i.product_id,p.product_name,p.brand,i.current_price,
  i.price_updated_at,
  extract(epoch from(now()-i.price_updated_at))/86400.0 as days_since_price_update,
  (now()-i.price_updated_at>interval '30 days') as is_stale
from public.item i join public.product p on p.product_id=i.product_id
where i.status='ACTIVE' and p.status='ACTIVE';

create or replace view public.v_public_price_position with (security_invoker=true) as
select
  v.product_id,v.brand,v.product_name,v.variant,v.package_size_value,v.package_size_unit,
  v.sme_id,v.business_name,v.current_price,
  min(v2.current_price) as public_min_price,
  avg(v2.current_price)::numeric(12,2) as public_avg_price,
  max(v2.current_price) as public_max_price,
  rank() over(partition by v.product_id order by v.current_price asc) as price_rank,
  count(*) over(partition by v.product_id) as public_listing_count
from public.v_public_price_comparison v
join public.v_public_price_comparison v2 on v2.product_id=v.product_id
group by v.product_id,v.brand,v.product_name,v.variant,v.package_size_value,
  v.package_size_unit,v.sme_id,v.business_name,v.current_price;

create or replace function public.get_owner_profit_summary(
  p_from timestamptz default null,p_to timestamptz default null
)
returns table(
  sales_date date,item_id uuid,product_id uuid,product_name text,
  sold_qty bigint,sales_value numeric,cost_coverage numeric,gross_profit numeric
)
language sql stable security definer
set search_path=''
as $$
  select
    date_trunc('day',sm.date_time)::date,sm.item_id,i.product_id,p.product_name,
    sum(sm.quantity)::bigint,
    sum(sm.quantity*sm.unit_price_snapshot)::numeric(14,2),
    round(
      100.0*sum(case when sm.unit_cost_snapshot is not null then sm.quantity else 0 end)
      /nullif(sum(sm.quantity),0),2
    )::numeric(6,2),
    sum(case when sm.unit_cost_snapshot is not null
      then sm.quantity*(sm.unit_price_snapshot-sm.unit_cost_snapshot)
      else 0 end)::numeric(14,2)
  from public.stock_movement sm
  join public.item i on i.item_id=sm.item_id and i.sme_id=sm.sme_id
  join public.product p on p.product_id=i.product_id
  where sm.sme_id=private.current_sme_id()
    and private.current_staff_role()='OWNER'
    and sm.movement_type='SALE'
    and sm.unit_price_snapshot is not null
    and (p_from is null or sm.date_time>=p_from)
    and (p_to is null or sm.date_time<p_to)
  group by 1,2,3,4 order by 1 desc,4;
$$;

grant select on public.v_inventory_status to authenticated;
grant select on public.v_sales_daily to authenticated;
grant select on public.v_price_freshness to authenticated;
grant select on public.v_public_price_position to authenticated;

revoke execute on function public.get_owner_profit_summary(timestamptz,timestamptz) from public,anon;
grant execute on function public.get_owner_profit_summary(timestamptz,timestamptz) to authenticated;

commit;