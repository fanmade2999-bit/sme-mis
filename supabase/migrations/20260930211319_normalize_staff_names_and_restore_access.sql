-- Normalize staff names and keep staff restoration NULL-safe.
begin;

alter table public.staff_account
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists name_suffix text;

do $migration$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'staff_account'
      and column_name = 'full_name'
  ) then
    execute $sql$
      update public.staff_account
      set
        first_name = nullif(split_part(btrim(full_name), ' ', 1), ''),
        last_name = case
          when array_length(regexp_split_to_array(btrim(full_name), '\s+'), 1) >= 2
            then nullif(reverse(split_part(reverse(btrim(full_name)), ' ', 1)), '')
          else null
        end,
        middle_name = case
          when array_length(regexp_split_to_array(btrim(full_name), '\s+'), 1) >= 3 then
            nullif(
              btrim(
                regexp_replace(
                  btrim(full_name),
                  '^\S+\s+|\s+\S+$',
                  '',
                  'g'
                )
              ),
              ''
            )
          else null
        end
      where first_name is null
        and full_name is not null;
    $sql$;
  end if;
end;
$migration$;

alter table public.staff_account
  alter column first_name set not null;

do $migration$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_staff_first_name_nonblank') then
    alter table public.staff_account
      add constraint ck_staff_first_name_nonblank
      check (length(btrim(first_name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ck_staff_middle_name_nonblank') then
    alter table public.staff_account
      add constraint ck_staff_middle_name_nonblank
      check (middle_name is null or length(btrim(middle_name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ck_staff_last_name_nonblank') then
    alter table public.staff_account
      add constraint ck_staff_last_name_nonblank
      check (last_name is null or length(btrim(last_name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ck_staff_name_suffix_nonblank') then
    alter table public.staff_account
      add constraint ck_staff_name_suffix_nonblank
      check (name_suffix is null or length(btrim(name_suffix)) > 0);
  end if;
end;
$migration$;

alter table public.staff_account
  drop column if exists full_name;

create or replace function public.bootstrap_sme_owner(
  p_business_name text,
  p_first_name text,
  p_middle_name text default null,
  p_last_name text default null,
  p_name_suffix text default null
)
returns public.staff_account
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_sme_id uuid;
  v_account public.staff_account;
begin
  if v_user_id is null then
    raise exception 'Authenticated user required';
  end if;
  if p_business_name is null or length(btrim(p_business_name)) = 0 then
    raise exception 'Business name is required';
  end if;
  if p_first_name is null or length(btrim(p_first_name)) = 0 then
    raise exception 'First name is required';
  end if;
  if exists(select 1 from public.staff_account where auth_user_id = v_user_id) then
    raise exception 'This authenticated user already has an SME account';
  end if;

  insert into public.sme(business_name)
  values(btrim(p_business_name))
  returning sme_id into v_sme_id;

  insert into public.staff_account(
    sme_id, auth_user_id, first_name, middle_name, last_name, name_suffix, role
  )
  values(
    v_sme_id, v_user_id,
    btrim(p_first_name),
    nullif(btrim(p_middle_name), ''),
    nullif(btrim(p_last_name), ''),
    nullif(btrim(p_name_suffix), ''),
    'OWNER'
  )
  returning * into v_account;

  return v_account;
end;
$function$;

revoke execute on function public.bootstrap_sme_owner(text,text,text,text,text) from public, anon;
grant execute on function public.bootstrap_sme_owner(text,text,text,text,text) to authenticated;

create or replace function public.reactivate_staff_account(p_account_id uuid)
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
    raise exception 'Only Owner may restore staff accounts';
  end if;
  if v_actor is null or v_sme_id is null then
    raise exception 'Authenticated active staff account required';
  end if;

  update public.staff_account
  set is_active = true,
      revoked_at = null,
      revoked_by_account_id = null
  where account_id = p_account_id
    and sme_id = v_sme_id
    and role <> 'OWNER'
    and is_active = false
  returning * into v_account;

  if not found then
    raise exception 'Revoked non-owner staff account not found in current SME';
  end if;

  return v_account;
end;
$function$;

revoke execute on function public.reactivate_staff_account(uuid) from public, anon;
grant execute on function public.reactivate_staff_account(uuid) to authenticated;

grant select(
  account_id,sme_id,auth_user_id,first_name,middle_name,last_name,name_suffix,
  role,is_active,created_by_account_id,created_at,updated_at,revoked_at,revoked_by_account_id
) on public.staff_account to authenticated;

commit;