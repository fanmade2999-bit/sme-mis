begin;

create or replace function public.create_item(
  p_product_id uuid,
  p_category_id uuid,
  p_current_price numeric,
  p_cost numeric default null,
  p_reorder_level integer default 0,
  p_shelf_location text default null,
  p_qr_code text default null,
  p_photo_path text default null,
  p_public_visible boolean default true
)
returns public.item
language plpgsql
security definer
set search_path=''
as $$
declare
  v_sme_id uuid:=private.current_sme_id();
  v_role public.staff_role:=private.current_staff_role();
  v_item public.item;
begin
  if v_sme_id is null or v_role is null then raise exception 'Authenticated active staff account required'; end if;
  if v_role not in('OWNER','MANAGER') then raise exception 'Only Owner or Manager may create items'; end if;
  if p_current_price is null or p_current_price<0 then raise exception 'Price must be zero or greater'; end if;
  if p_cost is not null and v_role<>'OWNER' then raise exception 'Only Owner may set item cost'; end if;
  if p_cost is not null and p_cost<0 then raise exception 'Cost must be null or zero or greater'; end if;
  if p_reorder_level is null or p_reorder_level<0 then raise exception 'Reorder level must be zero or greater'; end if;
  if not exists(select 1 from public.product where product_id=p_product_id and status='ACTIVE') then raise exception 'Active product identity not found'; end if;
  if not exists(select 1 from public.category where category_id=p_category_id and sme_id=v_sme_id) then raise exception 'Category does not belong to current SME'; end if;

  insert into public.item(
    sme_id,product_id,category_id,current_price,cost,stock_qty,reorder_level,
    shelf_location,qr_code,photo_path,status,public_visible,cost_updated_at,cost_updated_by_account_id
  ) values(
    v_sme_id,p_product_id,p_category_id,p_current_price,p_cost,0,p_reorder_level,
    nullif(btrim(p_shelf_location),''),nullif(btrim(p_qr_code),''),
    nullif(btrim(p_photo_path),''),'ACTIVE',coalesce(p_public_visible,true),
    case when p_cost is null then null else now() end,
    case when p_cost is null then null else private.current_staff_account_id() end
  ) returning * into v_item;
  return v_item;
exception when unique_violation then
  raise exception 'This SME already has an item for that product or QR code';
end;
$$;

commit;