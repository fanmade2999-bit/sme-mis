-- 1. Drop legacy overload that still referenced the removed full_name column.
drop function if exists public.bootstrap_sme_owner(text, text);

-- 2. Make Owner checks NULL-safe. current_staff_role() returns NULL for users with no
--    active staff account, and (NULL <> 'OWNER') is NULL, which would skip the guard.
--    "is distinct from" treats NULL as "not owner" and raises as intended.

create or replace function public.archive_item(p_item_id uuid)
returns public.item
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_item public.item;
  v_account_id uuid;
  v_sme_id uuid;
begin
  v_account_id := private.current_staff_account_id();
  v_sme_id := private.current_sme_id();
  if private.current_staff_role() is distinct from 'OWNER' then
    raise exception 'Only Owner may archive items';
  end if;
  if v_account_id is null or v_sme_id is null then
    raise exception 'Authenticated active staff account required';
  end if;
  update public.item
     set status = 'ARCHIVED', archived_at = now(), archived_by_account_id = v_account_id
   where item_id = p_item_id and sme_id = v_sme_id and status <> 'ARCHIVED'
  returning * into v_item;
  if not found then
    raise exception 'Item not found in current SME or already archived';
  end if;
  return v_item;
end;
$function$;

create or replace function public.change_staff_role(p_account_id uuid, p_new_role public.staff_role)
returns public.staff_account
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_account public.staff_account;
  v_sme_id uuid := private.current_sme_id();
begin
  if private.current_staff_role() is distinct from 'OWNER' then
    raise exception 'Only Owner may change staff roles';
  end if;
  if p_new_role = 'OWNER' then
    raise exception 'Owner role cannot be assigned through staff role management';
  end if;
  update public.staff_account
     set role = p_new_role
   where account_id = p_account_id and sme_id = v_sme_id and is_active = true and role <> 'OWNER'
  returning * into v_account;
  if not found then
    raise exception 'Active non-owner staff account not found in current SME';
  end if;
  return v_account;
end;
$function$;

create or replace function public.revoke_staff_account(p_account_id uuid)
returns public.staff_account
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_account public.staff_account;
  v_actor uuid := private.current_staff_account_id();
  v_sme_id uuid := private.current_sme_id();
begin
  if private.current_staff_role() is distinct from 'OWNER' then
    raise exception 'Only Owner may revoke staff accounts';
  end if;
  if v_actor is null or v_sme_id is null then
    raise exception 'Authenticated active staff account required';
  end if;
  if p_account_id = v_actor then
    raise exception 'Owner cannot revoke their own account';
  end if;
  update public.staff_account
     set is_active = false, revoked_at = now(), revoked_by_account_id = v_actor
   where account_id = p_account_id and sme_id = v_sme_id and is_active = true
  returning * into v_account;
  if not found then
    raise exception 'Active staff account not found in current SME';
  end if;
  return v_account;
end;
$function$;

create or replace function public.set_item_cost(p_item_id uuid, p_new_cost numeric)
returns public.item
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_item public.item;
  v_account_id uuid;
  v_sme_id uuid;
begin
  v_account_id := private.current_staff_account_id();
  v_sme_id := private.current_sme_id();
  if private.current_staff_role() is distinct from 'OWNER' then
    raise exception 'Only Owner may maintain cost';
  end if;
  if v_account_id is null or v_sme_id is null then
    raise exception 'Authenticated active staff account required';
  end if;
  if p_new_cost is not null and p_new_cost < 0 then
    raise exception 'Cost must be null or zero or greater';
  end if;
  select * into v_item from public.item
   where item_id = p_item_id and sme_id = v_sme_id and status <> 'ARCHIVED'
   for update;
  if not found then
    raise exception 'Item not found in current SME';
  end if;
  update public.item
     set cost = p_new_cost,
         cost_updated_at = case when p_new_cost is null then null else now() end,
         cost_updated_by_account_id = case when p_new_cost is null then null else v_account_id end
   where item_id = p_item_id and sme_id = v_sme_id
  returning * into v_item;
  return v_item;
end;
$function$;
