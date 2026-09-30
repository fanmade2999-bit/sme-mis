-- SME MIS current database baseline
-- Matches the live Supabase project state after:
-- 20260930065314 initial_operational_schema
-- 20260930065356 security_transactions_and_public_read_model
-- 20260930065430 performance_fk_indexes
-- 202609300700xx auth_bootstrap_and_public_view_hardening
--
-- This file is a fresh-environment baseline. Do not apply it to the already
-- initialized production project; future changes should be incremental migrations.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.sme_status as enum ('ACTIVE', 'INACTIVE');
create type public.staff_role as enum ('OWNER', 'MANAGER', 'STAFF');
create type public.product_status as enum ('ACTIVE', 'INACTIVE');
create type public.item_status as enum ('UNFINISHED', 'ACTIVE', 'ARCHIVED');
create type public.stock_movement_type as enum ('SALE', 'RESTOCK', 'LOSS', 'SPOILAGE', 'CORRECTION');
create type public.correction_direction as enum ('INCREASE', 'DECREASE');

create table public.sme (
  sme_id uuid primary key default gen_random_uuid(),
  business_name text not null,
  date_registered timestamptz not null default now(),
  status public.sme_status not null default 'ACTIVE',
  public_listing_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_sme_business_name_nonblank check (length(btrim(business_name)) > 0)
);

create table public.staff_account (
  account_id uuid primary key default gen_random_uuid(),
  sme_id uuid not null references public.sme(sme_id),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  role public.staff_role not null,
  is_active boolean not null default true,
  created_by_account_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_account_id uuid,
  constraint uq_staff_auth_user unique (auth_user_id),
  constraint uq_staff_sme_account unique (sme_id, account_id),
  constraint fk_staff_created_by_same_sme foreign key (sme_id, created_by_account_id)
    references public.staff_account (sme_id, account_id),
  constraint fk_staff_revoked_by_same_sme foreign key (sme_id, revoked_by_account_id)
    references public.staff_account (sme_id, account_id),
  constraint ck_staff_full_name_nonblank check (length(btrim(full_name)) > 0),
  constraint ck_staff_revocation_state check (
    (is_active = true and revoked_at is null and revoked_by_account_id is null)
    or
    (is_active = false and revoked_at is not null and revoked_by_account_id is not null)
  )
);

create table public.product (
  product_id uuid primary key default gen_random_uuid(),
  brand text,
  product_name text not null,
  variant text,
  package_size_value numeric(14,4),
  package_size_unit text,
  barcode text,
  canonical_key text not null,
  status public.product_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_product_canonical_key unique (canonical_key),
  constraint ck_product_name_nonblank check (length(btrim(product_name)) > 0),
  constraint ck_product_canonical_nonblank check (length(btrim(canonical_key)) > 0),
  constraint ck_product_size_positive check (package_size_value is null or package_size_value > 0),
  constraint ck_product_size_unit_pair check (
    (package_size_value is null and package_size_unit is null)
    or
    (package_size_value is not null and package_size_unit is not null and length(btrim(package_size_unit)) > 0)
  )
);

create table public.category (
  category_id uuid primary key default gen_random_uuid(),
  sme_id uuid not null references public.sme(sme_id),
  category_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_category_sme_id unique (sme_id, category_id),
  constraint ck_category_name_nonblank check (length(btrim(category_name)) > 0)
);

create table public.item (
  item_id uuid primary key default gen_random_uuid(),
  sme_id uuid not null references public.sme(sme_id),
  product_id uuid not null references public.product(product_id),
  category_id uuid not null,
  current_price numeric(12,2) not null,
  cost numeric(12,2),
  stock_qty integer not null default 0,
  reorder_level integer not null default 0,
  shelf_location text,
  qr_code text,
  photo_path text,
  status public.item_status not null default 'UNFINISHED',
  public_visible boolean not null default true,
  price_updated_at timestamptz not null default now(),
  cost_updated_at timestamptz,
  cost_updated_by_account_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by_account_id uuid,
  constraint uq_item_sme_product unique (sme_id, product_id),
  constraint uq_item_sme_item unique (sme_id, item_id),
  constraint ck_item_price_nonnegative check (current_price >= 0),
  constraint ck_item_cost_nonnegative check (cost is null or cost >= 0),
  constraint ck_item_stock_nonnegative check (stock_qty >= 0),
  constraint ck_item_reorder_nonnegative check (reorder_level >= 0),
  constraint fk_item_category_same_sme foreign key (sme_id, category_id)
    references public.category (sme_id, category_id),
  constraint fk_item_cost_actor_same_sme foreign key (sme_id, cost_updated_by_account_id)
    references public.staff_account (sme_id, account_id),
  constraint fk_item_archive_actor_same_sme foreign key (sme_id, archived_by_account_id)
    references public.staff_account (sme_id, account_id),
  constraint ck_item_archive_state check (
    (status = 'ARCHIVED' and archived_at is not null and archived_by_account_id is not null)
    or
    (status <> 'ARCHIVED' and archived_at is null and archived_by_account_id is null)
  ),
  constraint ck_item_cost_audit_state check (
    (cost is null and cost_updated_at is null and cost_updated_by_account_id is null)
    or
    (cost is not null and cost_updated_at is not null and cost_updated_by_account_id is not null)
  )
);

create table public.price_change_log (
  log_id uuid primary key default gen_random_uuid(),
  sme_id uuid not null,
  item_id uuid not null,
  account_id uuid not null,
  old_price numeric(12,2) not null,
  new_price numeric(12,2) not null,
  changed_at timestamptz not null default now(),
  constraint fk_price_log_item_same_sme foreign key (sme_id, item_id)
    references public.item (sme_id, item_id),
  constraint fk_price_log_actor_same_sme foreign key (sme_id, account_id)
    references public.staff_account (sme_id, account_id),
  constraint ck_price_log_old_nonnegative check (old_price >= 0),
  constraint ck_price_log_new_nonnegative check (new_price >= 0),
  constraint ck_price_log_changed check (old_price <> new_price)
);

create table public.stock_movement (
  movement_id uuid primary key default gen_random_uuid(),
  sme_id uuid not null,
  item_id uuid not null,
  account_id uuid not null,
  movement_type public.stock_movement_type not null,
  quantity integer not null,
  correction_direction public.correction_direction,
  unit_price_snapshot numeric(12,2),
  unit_cost_snapshot numeric(12,2),
  reason text,
  date_time timestamptz not null default now(),
  constraint fk_stock_movement_item_same_sme foreign key (sme_id, item_id)
    references public.item (sme_id, item_id),
  constraint fk_stock_movement_actor_same_sme foreign key (sme_id, account_id)
    references public.staff_account (sme_id, account_id),
  constraint ck_stock_quantity_positive check (quantity > 0),
  constraint ck_stock_correction_direction check (
    (movement_type = 'CORRECTION' and correction_direction is not null)
    or
    (movement_type <> 'CORRECTION' and correction_direction is null)
  ),
  constraint ck_stock_sale_snapshots check (
    (movement_type = 'SALE' and unit_price_snapshot is not null)
    or
    (movement_type <> 'SALE' and unit_price_snapshot is null and unit_cost_snapshot is null)
  ),
  constraint ck_stock_snapshot_values check (
    (unit_price_snapshot is null or unit_price_snapshot >= 0)
    and (unit_cost_snapshot is null or unit_cost_snapshot >= 0)
  ),
  constraint ck_stock_reason check (
    movement_type = 'SALE'
    or (reason is not null and length(btrim(reason)) > 0)
  )
);

create unique index uq_category_sme_name_ci
  on public.category (sme_id, lower(btrim(category_name)));
create unique index uq_item_qr_per_sme
  on public.item (sme_id, qr_code) where qr_code is not null;
create unique index uq_product_barcode_present
  on public.product (barcode) where barcode is not null;

create index idx_staff_sme_active on public.staff_account (sme_id, is_active);
create index idx_item_sme_status on public.item (sme_id, status);
create index idx_item_product_status_public on public.item (product_id, status, public_visible);
create index idx_price_log_sme_item_time on public.price_change_log (sme_id, item_id, changed_at desc);
create index idx_stock_movement_sme_item_time on public.stock_movement (sme_id, item_id, date_time desc);
create index idx_item_archive_actor on public.item (sme_id, archived_by_account_id);
create index idx_item_category on public.item (sme_id, category_id);
create index idx_item_cost_actor on public.item (sme_id, cost_updated_by_account_id);
create index idx_price_log_actor on public.price_change_log (sme_id, account_id);
create index idx_staff_created_by on public.staff_account (sme_id, created_by_account_id);
create index idx_staff_revoked_by on public.staff_account (sme_id, revoked_by_account_id);
create index idx_stock_movement_actor on public.stock_movement (sme_id, account_id);

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
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select sa.account_id from public.staff_account sa
  where sa.auth_user_id = auth.uid() and sa.is_active = true limit 1;
$$;

create or replace function private.current_sme_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select sa.sme_id from public.staff_account sa
  where sa.auth_user_id = auth.uid() and sa.is_active = true limit 1;
$$;

create or replace function private.current_staff_role()
returns public.staff_role
language sql stable security definer
set search_path = ''
as $$
  select sa.role from public.staff_account sa
  where sa.auth_user_id = auth.uid() and sa.is_active = true limit 1;
$$;

create or replace function public.bootstrap_sme_owner(p_business_name text, p_full_name text)
returns public.staff_account
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sme_id uuid;
  v_account public.staff_account;
begin
  if v_user_id is null then raise exception 'Authenticated user required'; end if;
  if p_business_name is null or length(btrim(p_business_name)) = 0 then raise exception 'Business name is required'; end if;
  if p_full_name is null or length(btrim(p_full_name)) = 0 then raise exception 'Owner name is required'; end if;
  if exists (select 1 from public.staff_account where auth_user_id = v_user_id) then
    raise exception 'This authenticated user already has an SME account';
  end if;

  insert into public.sme (business_name) values (btrim(p_business_name))
  returning sme_id into v_sme_id;

  insert into public.staff_account (sme_id, auth_user_id, full_name, role)
  values (v_sme_id, v_user_id, btrim(p_full_name), 'OWNER')
  returning * into v_account;

  return v_account;
end;
$$;

create or replace function public.ensure_product(
  p_brand text, p_product_name text, p_variant text,
  p_package_size_value numeric, p_package_size_unit text,
  p_barcode text, p_canonical_key text
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if private.current_staff_role() not in ('OWNER', 'MANAGER') then
    raise exception 'Only Owner or Manager may create/select product identities';
  end if;
  if p_product_name is null or length(btrim(p_product_name)) = 0 then raise exception 'Product name is required'; end if;
  if p_canonical_key is null or length(btrim(p_canonical_key)) = 0 then raise exception 'Canonical key is required'; end if;

  if p_barcode is not null then
    select product_id into v_id from public.product
    where barcode = btrim(p_barcode) and status = 'ACTIVE';
    if v_id is not null then return v_id; end if;
  end if;

  select product_id into v_id from public.product
  where canonical_key = lower(btrim(p_canonical_key)) and status = 'ACTIVE';
  if v_id is not null then return v_id; end if;

  insert into public.product (
    brand, product_name, variant, package_size_value, package_size_unit, barcode, canonical_key
  ) values (
    nullif(btrim(p_brand), ''), btrim(p_product_name), nullif(btrim(p_variant), ''),
    p_package_size_value, nullif(btrim(p_package_size_unit), ''),
    nullif(btrim(p_barcode), ''), lower(btrim(p_canonical_key))
  )
  on conflict (canonical_key) do nothing
  returning product_id into v_id;

  if v_id is null then
    select product_id into v_id from public.product
    where canonical_key = lower(btrim(p_canonical_key));
  end if;
  return v_id;
end;
$$;

create or replace function public.set_item_price(p_item_id uuid, p_new_price numeric)
returns public.item
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item public.item;
  v_account_id uuid := private.current_staff_account_id();
  v_sme_id uuid := private.current_sme_id();
begin
  if v_account_id is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;
  if private.current_staff_role() not in ('OWNER', 'MANAGER') then raise exception 'Only Owner or Manager may change prices'; end if;
  if p_new_price is null or p_new_price < 0 then raise exception 'Price must be zero or greater'; end if;

  select * into v_item from public.item
  where item_id = p_item_id and sme_id = v_sme_id and status <> 'ARCHIVED' for update;
  if not found then raise exception 'Item not found in current SME'; end if;
  if v_item.current_price = p_new_price then return v_item; end if;

  insert into public.price_change_log (sme_id, item_id, account_id, old_price, new_price)
  values (v_sme_id, v_item.item_id, v_account_id, v_item.current_price, p_new_price);

  update public.item set current_price = p_new_price, price_updated_at = now()
  where item_id = p_item_id and sme_id = v_sme_id
  returning * into v_item;
  return v_item;
end;
$$;

create or replace function public.set_item_cost(p_item_id uuid, p_new_cost numeric)
returns public.item
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item public.item;
  v_account_id uuid := private.current_staff_account_id();
  v_sme_id uuid := private.current_sme_id();
begin
  if private.current_staff_role() <> 'OWNER' then raise exception 'Only Owner may maintain cost'; end if;
  if v_account_id is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;
  if p_new_cost is not null and p_new_cost < 0 then raise exception 'Cost must be null or zero or greater'; end if;

  select * into v_item from public.item
  where item_id = p_item_id and sme_id = v_sme_id and status <> 'ARCHIVED' for update;
  if not found then raise exception 'Item not found in current SME'; end if;

  update public.item
  set cost = p_new_cost,
      cost_updated_at = case when p_new_cost is null then null else now() end,
      cost_updated_by_account_id = case when p_new_cost is null then null else v_account_id end
  where item_id = p_item_id and sme_id = v_sme_id
  returning * into v_item;
  return v_item;
end;
$$;

create or replace function public.record_stock_movement(
  p_item_id uuid, p_movement_type public.stock_movement_type,
  p_quantity integer, p_correction_direction public.correction_direction, p_reason text
)
returns public.stock_movement
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item public.item;
  v_movement public.stock_movement;
  v_account_id uuid := private.current_staff_account_id();
  v_sme_id uuid := private.current_sme_id();
  v_role public.staff_role := private.current_staff_role();
  v_delta integer;
  v_new_stock integer;
begin
  if v_account_id is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  if v_role = 'STAFF' and p_movement_type <> 'SALE' then raise exception 'Staff may perform sale deductions only'; end if;
  if p_movement_type = 'CORRECTION' and p_correction_direction is null then raise exception 'Correction direction is required'; end if;
  if p_movement_type <> 'CORRECTION' and p_correction_direction is not null then raise exception 'Correction direction is only valid for corrections'; end if;
  if p_movement_type <> 'SALE' and (p_reason is null or length(btrim(p_reason)) = 0) then raise exception 'Reason is required for non-sale stock movements'; end if;

  select * into v_item from public.item
  where item_id = p_item_id and sme_id = v_sme_id and status <> 'ARCHIVED' for update;
  if not found then raise exception 'Item not found in current SME'; end if;

  v_delta := case
    when p_movement_type = 'RESTOCK' then p_quantity
    when p_movement_type in ('SALE', 'LOSS', 'SPOILAGE') then -p_quantity
    when p_movement_type = 'CORRECTION' and p_correction_direction = 'INCREASE' then p_quantity
    when p_movement_type = 'CORRECTION' and p_correction_direction = 'DECREASE' then -p_quantity
  end;

  v_new_stock := v_item.stock_qty + v_delta;
  if v_new_stock < 0 then raise exception 'Insufficient stock: current %, requested deduction %', v_item.stock_qty, p_quantity; end if;

  insert into public.stock_movement (
    sme_id, item_id, account_id, movement_type, quantity, correction_direction,
    unit_price_snapshot, unit_cost_snapshot, reason
  ) values (
    v_sme_id, v_item.item_id, v_account_id, p_movement_type, p_quantity,
    case when p_movement_type = 'CORRECTION' then p_correction_direction end,
    case when p_movement_type = 'SALE' then v_item.current_price end,
    case when p_movement_type = 'SALE' then v_item.cost end,
    case when p_movement_type = 'SALE' then null else btrim(p_reason) end
  ) returning * into v_movement;

  update public.item set stock_qty = v_new_stock
  where item_id = p_item_id and sme_id = v_sme_id;

  return v_movement;
end;
$$;

create or replace function public.archive_item(p_item_id uuid)
returns public.item
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item public.item;
  v_account_id uuid := private.current_staff_account_id();
  v_sme_id uuid := private.current_sme_id();
begin
  if private.current_staff_role() <> 'OWNER' then raise exception 'Only Owner may archive items'; end if;
  if v_account_id is null or v_sme_id is null then raise exception 'Authenticated active staff account required'; end if;

  update public.item
  set status = 'ARCHIVED', archived_at = now(), archived_by_account_id = v_account_id
  where item_id = p_item_id and sme_id = v_sme_id and status <> 'ARCHIVED'
  returning * into v_item;

  if not found then raise exception 'Item not found in current SME or already archived'; end if;
  return v_item;
end;
$$;

create or replace view public.v_public_price_comparison as
select
  i.product_id, p.brand, p.product_name, p.variant, p.package_size_value, p.package_size_unit,
  i.sme_id, s.business_name, i.current_price, i.price_updated_at
from public.item i
join public.product p on p.product_id = i.product_id
join public.sme s on s.sme_id = i.sme_id
where s.status = 'ACTIVE'
  and s.public_listing_enabled = true
  and i.status = 'ACTIVE'
  and i.public_visible = true
  and p.status = 'ACTIVE';

alter table public.sme enable row level security;
alter table public.staff_account enable row level security;
alter table public.product enable row level security;
alter table public.category enable row level security;
alter table public.item enable row level security;
alter table public.price_change_log enable row level security;
alter table public.stock_movement enable row level security;

create policy sme_authenticated_select on public.sme
for select to authenticated using (sme_id = private.current_sme_id());

create policy sme_owner_update on public.sme
for update to authenticated
using (sme_id = private.current_sme_id() and private.current_staff_role() = 'OWNER')
with check (sme_id = private.current_sme_id());

create policy staff_select_same_sme on public.staff_account
for select to authenticated using (sme_id = private.current_sme_id());

create policy product_public_read on public.product
for select to anon, authenticated using (status = 'ACTIVE');

create policy category_select_same_sme on public.category
for select to authenticated using (sme_id = private.current_sme_id());

create policy category_insert_management on public.category
for insert to authenticated
with check (sme_id = private.current_sme_id() and private.current_staff_role() in ('OWNER', 'MANAGER'));

create policy category_update_management on public.category
for update to authenticated
using (sme_id = private.current_sme_id() and private.current_staff_role() in ('OWNER', 'MANAGER'))
with check (sme_id = private.current_sme_id());

create policy item_authenticated_select on public.item
for select to authenticated using (sme_id = private.current_sme_id());

create policy item_management_insert on public.item
for insert to authenticated
with check (sme_id = private.current_sme_id() and private.current_staff_role() in ('OWNER', 'MANAGER') and status in ('UNFINISHED', 'ACTIVE'));

create policy item_management_update on public.item
for update to authenticated
using (sme_id = private.current_sme_id() and private.current_staff_role() in ('OWNER', 'MANAGER') and status <> 'ARCHIVED')
with check (sme_id = private.current_sme_id() and status <> 'ARCHIVED');

create policy price_log_select_same_sme on public.price_change_log
for select to authenticated using (sme_id = private.current_sme_id());

create policy stock_movement_select_same_sme on public.stock_movement
for select to authenticated using (sme_id = private.current_sme_id());

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke execute on function private.current_staff_account_id() from public, anon;
revoke execute on function private.current_sme_id() from public, anon;
revoke execute on function private.current_staff_role() from public, anon;
grant execute on function private.current_staff_account_id() to authenticated;
grant execute on function private.current_sme_id() to authenticated;
grant execute on function private.current_staff_role() to authenticated;

revoke all on public.sme from anon, authenticated;
revoke all on public.staff_account from anon, authenticated;
revoke all on public.product from anon, authenticated;
revoke all on public.category from anon, authenticated;
revoke all on public.item from anon, authenticated;
revoke all on public.price_change_log from anon, authenticated;
revoke all on public.stock_movement from anon, authenticated;
revoke all on public.v_public_price_comparison from anon, authenticated;

grant select on public.sme to authenticated;
grant update (business_name, status, public_listing_enabled) on public.sme to authenticated;
grant select (account_id, sme_id, full_name, role, is_active, created_by_account_id, created_at, updated_at, revoked_at, revoked_by_account_id)
  on public.staff_account to authenticated;
grant select on public.product to authenticated;
grant select on public.category to authenticated;
grant insert (sme_id, category_name) on public.category to authenticated;
grant update (category_name) on public.category to authenticated;
grant select (item_id, sme_id, product_id, category_id, current_price, stock_qty, reorder_level, shelf_location, qr_code, photo_path, status, public_visible, price_updated_at, created_at, updated_at)
  on public.item to authenticated;
grant insert (sme_id, product_id, category_id, current_price, cost, stock_qty, reorder_level, shelf_location, qr_code, photo_path, status, public_visible)
  on public.item to authenticated;
grant update (product_id, category_id, reorder_level, shelf_location, qr_code, photo_path, public_visible)
  on public.item to authenticated;
grant select on public.price_change_log to authenticated;
grant select on public.stock_movement to authenticated;

grant select on public.v_public_price_comparison to anon, authenticated;

revoke execute on function public.bootstrap_sme_owner(text,text) from public, anon;
revoke execute on function public.ensure_product(text,text,text,numeric,text,text,text) from public, anon;
revoke execute on function public.set_item_price(uuid,numeric) from public, anon;
revoke execute on function public.set_item_cost(uuid,numeric) from public, anon;
revoke execute on function public.record_stock_movement(uuid,public.stock_movement_type,integer,public.correction_direction,text) from public, anon;
revoke execute on function public.archive_item(uuid) from public, anon;

grant execute on function public.bootstrap_sme_owner(text,text) to authenticated;
grant execute on function public.ensure_product(text,text,text,numeric,text,text,text) to authenticated;
grant execute on function public.set_item_price(uuid,numeric) to authenticated;
grant execute on function public.set_item_cost(uuid,numeric) to authenticated;
grant execute on function public.record_stock_movement(uuid,public.stock_movement_type,integer,public.correction_direction,text) to authenticated;
grant execute on function public.archive_item(uuid) to authenticated;

commit;
