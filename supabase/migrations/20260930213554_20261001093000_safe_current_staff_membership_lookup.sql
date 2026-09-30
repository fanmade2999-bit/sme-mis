begin;

create or replace function public.get_current_staff_account()
returns table (
  account_id uuid,
  sme_id uuid,
  first_name text,
  middle_name text,
  last_name text,
  name_suffix text,
  role public.staff_role,
  is_active boolean
)
language sql
stable
security invoker
set search_path to ''
as $function$
  select
    sa.account_id,
    sa.sme_id,
    sa.first_name,
    sa.middle_name,
    sa.last_name,
    sa.name_suffix,
    sa.role,
    sa.is_active
  from public.staff_account sa
  where sa.account_id = private.current_staff_account_id()
    and sa.is_active = true
  limit 1;
$function$;

revoke all on function public.get_current_staff_account() from public;
grant execute on function public.get_current_staff_account() to authenticated;

commit;
