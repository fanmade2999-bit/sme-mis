begin;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_sme_updated_at before update on public.sme
for each row execute function private.touch_updated_at();
create trigger trg_staff_updated_at before update on public.staff_account
for each row execute function private.touch_updated_at();
create trigger trg_product_updated_at before update on public.product
for each row execute function private.touch_updated_at();
create trigger trg_category_updated_at before update on public.category
for each row execute function private.touch_updated_at();
create trigger trg_item_updated_at before update on public.item
for each row execute function private.touch_updated_at();

create or replace function private.current_staff_account_id()
returns uuid language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select sa.account_id from public.staff_account sa
  where sa.auth_user_id = auth.uid() and sa.is_active = true limit 1;
$$;

create or replace function private.current_sme_id()
returns uuid language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select sa.sme_id from public.staff_account sa
  where sa.auth_user_id = auth.uid() and sa.is_active = true limit 1;
$$;

create or replace function private.current_staff_role()
returns public.staff_role language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select sa.role from public.staff_account sa
  where sa.auth_user_id = auth.uid() and sa.is_active = true limit 1;
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.current_staff_account_id() from public, anon;
revoke all on function private.current_sme_id() from public, anon;
revoke all on function private.current_staff_role() from public, anon;
grant execute on function private.current_staff_account_id() to authenticated;
grant execute on function private.current_sme_id() to authenticated;
grant execute on function private.current_staff_role() to authenticated;

create or replace function public.ensure_product(
  p_brand text,p_product_name text,p_variant text,p_package_size_value numeric,
  p_package_size_unit text,p_barcode text,p_canonical_key text
)
returns uuid language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare v_id uuid; v_role public.staff_role;
begin
  v_role := private.current_staff_role();
  if v_role not in ('OWNER','MANAGER') then raise exception 'Only Owner or Manager may create/select product identities'; end if;
  if p_product_name is null or length(btrim(p_product_name))=0 then raise exception 'Product name is required'; end if;
  if p_canonical_key is null or length(btrim(p_canonical_key))=0 then raise exception 'Canonical key is required'; end if;

  if p_barcode is not null then
    select product_id into v_id from public.product
    where barcode=btrim(p_barcode) and status='ACTIVE';
    if v_id is not null then return v_id; end if;
  end if;

  select product_id into v_id from public.product
  where canonical_key=lower(btrim(p_canonical_key)) and status='ACTIVE';
  if v_id is not null then return v_id; end if;

  insert into public.product(
    brand,product_name,variant,package_size_value,package_size_unit,barcode,canonical_key
  ) values(
    nullif(btrim(p_brand),''),btrim(p_product_name),nullif(btrim(p_variant),''),
    p_package_size_value,nullif(btrim(p_package_size_unit),''),
    nullif(btrim(p_barcode),''),lower(btrim(p_canonical_key))
  )
  on conflict(canonical_key) do nothing
  returning product_id into v_id;

  if v_id is null then
    select product_id into v_id from public.product
    where canonical_key=lower(btrim(p_canonical_key));
  end if;
  return v_id;
end;
$$;

create or replace function public.set_item_price(p_item_id uuid,p_new_price numeric)
returns public.item language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare v_item public.item; v_account_id uuid; v_sme_id uuid; v_role public.staff_role;
begin
  v_account_id:=private.current_staff_account_id();
  v_sme_id:=private.current_sme_id();
  v_role:=private.current_staff_role();
  if v_account_id is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;
  if v_role not in ('OWNER','MANAGER') then raise exception 'Only Owner or Manager may change prices'; end if;
  if p_new_price is null or p_new_price<0 then raise exception 'Price must be zero or greater'; end if;

  select * into v_item from public.item
  where item_id=p_item_id and sme_id=v_sme_id and status<>'ARCHIVED' for update;
  if not found then raise exception 'Item not found in current SME'; end if;
  if v_item.current_price=p_new_price then return v_item; end if;

  insert into public.price_change_log(sme_id,item_id,account_id,old_price,new_price)
  values(v_sme_id,v_item.item_id,v_account_id,v_item.current_price,p_new_price);

  update public.item set current_price=p_new_price,price_updated_at=now()
  where item_id=p_item_id and sme_id=v_sme_id returning * into v_item;
  return v_item;
end;
$$;

create or replace function public.set_item_cost(p_item_id uuid,p_new_cost numeric)
returns public.item language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare v_item public.item; v_account_id uuid; v_sme_id uuid;
begin
  v_account_id:=private.current_staff_account_id();
  v_sme_id:=private.current_sme_id();
  if private.current_staff_role()<>'OWNER' then raise exception 'Only Owner may maintain cost'; end if;
  if v_account_id is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;
  if p_new_cost is not null and p_new_cost<0 then raise exception 'Cost must be null or zero or greater'; end if;

  select * into v_item from public.item
  where item_id=p_item_id and sme_id=v_sme_id and status<>'ARCHIVED' for update;
  if not found then raise exception 'Item not found in current SME'; end if;

  update public.item
  set cost=p_new_cost,
      cost_updated_at=case when p_new_cost is null then null else now() end,
      cost_updated_by_account_id=case when p_new_cost is null then null else v_account_id end
  where item_id=p_item_id and sme_id=v_sme_id returning * into v_item;
  return v_item;
end;
$$;

create or replace function public.record_stock_movement(
  p_item_id uuid,p_movement_type public.stock_movement_type,p_quantity integer,
  p_correction_direction public.correction_direction,p_reason text
)
returns public.stock_movement language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_item public.item; v_movement public.stock_movement; v_account_id uuid;
  v_sme_id uuid; v_role public.staff_role; v_delta integer; v_new_stock integer;
begin
  v_account_id:=private.current_staff_account_id();
  v_sme_id:=private.current_sme_id();
  v_role:=private.current_staff_role();
  if v_account_id is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Quantity must be greater than zero'; end if;
  if v_role='STAFF' and p_movement_type<>'SALE' then raise exception 'Staff may perform sale deductions only'; end if;
  if v_role not in ('OWNER','MANAGER','STAFF') then raise exception 'Invalid staff role'; end if;
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
  return v_movement;
end;
$$;

create or replace function public.archive_item(p_item_id uuid)
returns public.item language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare v_item public.item; v_account_id uuid; v_sme_id uuid;
begin
  v_account_id:=private.current_staff_account_id();
  v_sme_id:=private.current_sme_id();
  if private.current_staff_role()<>'OWNER' then raise exception 'Only Owner may archive items'; end if;
  if v_account_id is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;

  update public.item set status='ARCHIVED',archived_at=now(),archived_by_account_id=v_account_id
  where item_id=p_item_id and sme_id=v_sme_id and status<>'ARCHIVED'
  returning * into v_item;
  if not found then raise exception 'Item not found in current SME or already archived'; end if;
  return v_item;
end;
$$;

create or replace view public.v_public_price_comparison
with(security_invoker=true)
as
select i.product_id,p.brand,p.product_name,p.variant,p.package_size_value,p.package_size_unit,
       i.sme_id,s.business_name,i.current_price,i.price_updated_at
from public.item i
join public.product p on p.product_id=i.product_id
join public.sme s on s.sme_id=i.sme_id
where s.status='ACTIVE' and s.public_listing_enabled=true
  and i.status='ACTIVE' and i.public_visible=true and p.status='ACTIVE';

alter table public.sme enable row level security;
alter table public.staff_account enable row level security;
alter table public.product enable row level security;
alter table public.category enable row level security;
alter table public.item enable row level security;
alter table public.price_change_log enable row level security;
alter table public.stock_movement enable row level security;

create policy sme_authenticated_select on public.sme
for select to authenticated using(sme_id=private.current_sme_id());
create policy sme_public_select on public.sme
for select to anon using(status='ACTIVE' and public_listing_enabled=true);
create policy sme_owner_update on public.sme
for update to authenticated
using(sme_id=private.current_sme_id() and private.current_staff_role()='OWNER')
with check(sme_id=private.current_sme_id());

create policy staff_select_same_sme on public.staff_account
for select to authenticated using(sme_id=private.current_sme_id());

create policy product_public_read on public.product
for select to anon,authenticated using(status='ACTIVE');

create policy category_select_same_sme on public.category
for select to authenticated using(sme_id=private.current_sme_id());
create policy category_insert_management on public.category
for insert to authenticated
with check(sme_id=private.current_sme_id() and private.current_staff_role() in('OWNER','MANAGER'));
create policy category_update_management on public.category
for update to authenticated
using(sme_id=private.current_sme_id() and private.current_staff_role() in('OWNER','MANAGER'))
with check(sme_id=private.current_sme_id());

create policy item_authenticated_select on public.item
for select to authenticated using(sme_id=private.current_sme_id());
create policy item_public_select on public.item
for select to anon using(
  status='ACTIVE' and public_visible=true
  and exists(select 1 from public.sme s where s.sme_id=item.sme_id and s.status='ACTIVE' and s.public_listing_enabled=true)
  and exists(select 1 from public.product p where p.product_id=item.product_id and p.status='ACTIVE')
);
create policy item_management_insert on public.item
for insert to authenticated
with check(sme_id=private.current_sme_id() and private.current_staff_role() in('OWNER','MANAGER') and status in('UNFINISHED','ACTIVE'));
create policy item_management_update on public.item
for update to authenticated
using(sme_id=private.current_sme_id() and private.current_staff_role() in('OWNER','MANAGER') and status<>'ARCHIVED')
with check(sme_id=private.current_sme_id() and status<>'ARCHIVED');

create policy price_log_select_same_sme on public.price_change_log
for select to authenticated using(sme_id=private.current_sme_id());
create policy stock_movement_select_same_sme on public.stock_movement
for select to authenticated using(sme_id=private.current_sme_id());

revoke all on public.sme from anon,authenticated;
revoke all on public.staff_account from anon,authenticated;
revoke all on public.product from anon,authenticated;
revoke all on public.category from anon,authenticated;
revoke all on public.item from anon,authenticated;
revoke all on public.price_change_log from anon,authenticated;
revoke all on public.stock_movement from anon,authenticated;
revoke all on public.v_public_price_comparison from anon,authenticated;

grant select on public.sme to authenticated;
grant update(business_name,status,public_listing_enabled) on public.sme to authenticated;
grant select(account_id,sme_id,full_name,role,is_active,created_by_account_id,created_at,updated_at,revoked_at,revoked_by_account_id)
on public.staff_account to authenticated;
grant select on public.product to anon,authenticated;
grant select on public.category to authenticated;
grant insert(sme_id,category_name) on public.category to authenticated;
grant update(category_name) on public.category to authenticated;
grant select on public.item to authenticated;
grant insert(sme_id,product_id,category_id,current_price,cost,stock_qty,reorder_level,shelf_location,qr_code,photo_path,status,public_visible)
on public.item to authenticated;
grant update(product_id,category_id,reorder_level,shelf_location,qr_code,photo_path,public_visible)
on public.item to authenticated;
grant select on public.price_change_log to authenticated;
grant select on public.stock_movement to authenticated;

grant select(sme_id,business_name,status,public_listing_enabled) on public.sme to anon;
grant select(product_id,brand,product_name,variant,package_size_value,package_size_unit,barcode,canonical_key,status)
on public.product to anon;
grant select(item_id,sme_id,product_id,category_id,current_price,stock_qty,reorder_level,shelf_location,qr_code,photo_path,status,public_visible,price_updated_at,created_at,updated_at)
on public.item to anon;
grant select on public.v_public_price_comparison to anon,authenticated;

revoke execute on function public.ensure_product(text,text,text,numeric,text,text,text) from public,anon;
revoke execute on function public.set_item_price(uuid,numeric) from public,anon;
revoke execute on function public.set_item_cost(uuid,numeric) from public,anon;
revoke execute on function public.record_stock_movement(uuid,public.stock_movement_type,integer,public.correction_direction,text) from public,anon;
revoke execute on function public.archive_item(uuid) from public,anon;
grant execute on function public.ensure_product(text,text,text,numeric,text,text,text) to authenticated;
grant execute on function public.set_item_price(uuid,numeric) to authenticated;
grant execute on function public.set_item_cost(uuid,numeric) to authenticated;
grant execute on function public.record_stock_movement(uuid,public.stock_movement_type,integer,public.correction_direction,text) to authenticated;
grant execute on function public.archive_item(uuid) to authenticated;

commit;