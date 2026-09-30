begin;

drop function if exists public.set_item_price(uuid, numeric);
create function public.set_item_price(
  p_item_id uuid,
  p_new_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_item public.item;
  v_account_id uuid:=private.current_staff_account_id();
  v_sme_id uuid:=private.current_sme_id();
  v_role public.staff_role:=private.current_staff_role();
begin
  if v_account_id is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;
  if v_role not in('OWNER','MANAGER') then raise exception 'Only Owner or Manager may change prices'; end if;
  if p_new_price is null or p_new_price<0 then raise exception 'Price must be zero or greater'; end if;

  select * into v_item from public.item
  where item_id=p_item_id and sme_id=v_sme_id and status<>'ARCHIVED' for update;
  if not found then raise exception 'Item not found in current SME'; end if;

  if v_item.current_price<>p_new_price then
    insert into public.price_change_log(sme_id,item_id,account_id,old_price,new_price)
    values(v_sme_id,v_item.item_id,v_account_id,v_item.current_price,p_new_price);

    update public.item set current_price=p_new_price,price_updated_at=now()
    where item_id=p_item_id and sme_id=v_sme_id
    returning * into v_item;
  end if;

  return jsonb_build_object(
    'item_id',v_item.item_id,'sme_id',v_item.sme_id,'product_id',v_item.product_id,
    'category_id',v_item.category_id,'current_price',v_item.current_price,
    'stock_qty',v_item.stock_qty,'reorder_level',v_item.reorder_level,
    'shelf_location',v_item.shelf_location,'qr_code',v_item.qr_code,
    'photo_path',v_item.photo_path,'status',v_item.status,
    'public_visible',v_item.public_visible,'price_updated_at',v_item.price_updated_at,
    'created_at',v_item.created_at,'updated_at',v_item.updated_at
  );
end;
$$;

drop function if exists public.record_stock_movement(
  uuid,public.stock_movement_type,integer,public.correction_direction,text
);
create function public.record_stock_movement(
  p_item_id uuid,p_movement_type public.stock_movement_type,p_quantity integer,
  p_correction_direction public.correction_direction,p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_item public.item;
  v_movement public.stock_movement;
  v_account_id uuid:=private.current_staff_account_id();
  v_sme_id uuid:=private.current_sme_id();
  v_role public.staff_role:=private.current_staff_role();
  v_delta integer;
  v_new_stock integer;
begin
  if v_account_id is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Quantity must be greater than zero'; end if;
  if v_role='STAFF' and p_movement_type<>'SALE' then raise exception 'Staff may perform sale deductions only'; end if;
  if p_movement_type='CORRECTION' and p_correction_direction is null then raise exception 'Correction direction is required'; end if;
  if p_movement_type<>'CORRECTION' and p_correction_direction is not null then raise exception 'Correction direction is only valid for corrections'; end if;
  if p_movement_type<>'SALE' and (p_reason is null or length(btrim(p_reason))=0) then raise exception 'Reason is required for non-sale stock movements'; end if;

  select * into v_item from public.item
  where item_id=p_item_id and sme_id=v_sme_id and status<>'ARCHIVED' for update;
  if not found then raise exception 'Item not found in current SME'; end if;

  v_delta:=case
    when p_movement_type='RESTOCK' then p_quantity
    when p_movement_type in('SALE','LOSS','SPOILAGE') then -p_quantity
    when p_movement_type='CORRECTION' and p_correction_direction='INCREASE' then p_quantity
    when p_movement_type='CORRECTION' and p_correction_direction='DECREASE' then -p_quantity
  end;
  v_new_stock:=v_item.stock_qty+v_delta;
  if v_new_stock<0 then raise exception 'Insufficient stock: current %, requested deduction %',v_item.stock_qty,p_quantity; end if;

  insert into public.stock_movement(
    sme_id,item_id,account_id,movement_type,quantity,correction_direction,
    unit_price_snapshot,unit_cost_snapshot,reason
  ) values(
    v_sme_id,v_item.item_id,v_account_id,p_movement_type,p_quantity,
    case when p_movement_type='CORRECTION' then p_correction_direction end,
    case when p_movement_type='SALE' then v_item.current_price end,
    case when p_movement_type='SALE' then v_item.cost end,
    case when p_movement_type='SALE' then null else btrim(p_reason) end
  ) returning * into v_movement;

  update public.item set stock_qty=v_new_stock
  where item_id=p_item_id and sme_id=v_sme_id;

  return jsonb_build_object(
    'movement_id',v_movement.movement_id,'sme_id',v_movement.sme_id,
    'item_id',v_movement.item_id,'account_id',v_movement.account_id,
    'movement_type',v_movement.movement_type,'quantity',v_movement.quantity,
    'correction_direction',v_movement.correction_direction,
    'unit_price_snapshot',v_movement.unit_price_snapshot,'reason',v_movement.reason,
    'date_time',v_movement.date_time,'new_stock_qty',v_new_stock
  );
end;
$$;

revoke execute on function public.set_item_price(uuid,numeric) from public,anon;
grant execute on function public.set_item_price(uuid,numeric) to authenticated;
revoke execute on function public.record_stock_movement(
  uuid,public.stock_movement_type,integer,public.correction_direction,text
) from public,anon;
grant execute on function public.record_stock_movement(
  uuid,public.stock_movement_type,integer,public.correction_direction,text
) to authenticated;

commit;