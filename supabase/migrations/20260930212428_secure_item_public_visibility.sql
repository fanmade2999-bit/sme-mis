create or replace function public.set_item_public_visibility(p_item_id uuid, p_public_visible boolean)
returns public.item
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_item public.item;
  v_sme_id uuid := private.current_sme_id();
  v_role public.staff_role := private.current_staff_role();
begin
  if v_sme_id is null or v_role is null then
    raise exception 'Authenticated active staff account required';
  end if;
  if v_role not in ('OWNER','MANAGER') then
    raise exception 'Only Owner or Manager may change public visibility';
  end if;
  if p_public_visible is null then
    raise exception 'Public visibility value is required';
  end if;

  update public.item
  set public_visible = p_public_visible
  where item_id = p_item_id
    and sme_id = v_sme_id
    and status <> 'ARCHIVED'
  returning * into v_item;

  if not found then
    raise exception 'Item not found in current SME';
  end if;

  return v_item;
end;
$function$;

revoke all on function public.set_item_public_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_item_public_visibility(uuid, boolean) to authenticated;
