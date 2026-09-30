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

create unique index uq_category_sme_name_ci
  on public.category (sme_id, lower(btrim(category_name)));

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

create unique index uq_item_qr_per_sme
  on public.item (sme_id, qr_code)
  where qr_code is not null;

create unique index uq_product_barcode_present
  on public.product (barcode)
  where barcode is not null;

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
    (movement_type = 'SALE')
    or (reason is not null and length(btrim(reason)) > 0)
  )
);

create index idx_staff_sme_active on public.staff_account (sme_id, is_active);
create index idx_item_sme_status on public.item (sme_id, status);
create index idx_item_product_status_public on public.item (product_id, status, public_visible);
create index idx_price_log_sme_item_time on public.price_change_log (sme_id, item_id, changed_at desc);
create index idx_stock_movement_sme_item_time on public.stock_movement (sme_id, item_id, date_time desc);

commit;