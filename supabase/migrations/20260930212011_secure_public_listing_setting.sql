create or replace function public.set_sme_public_listing(p_enabled boolean)
returns public.sme
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_sme public.sme;
  v_sme_id uuid := private.current_sme_id();
begin
  if private.current_staff_role() is distinct from 'OWNER' then
    raise exception 'Only Owner may change public listing settings';
  end if;
  if v_sme_id is null then
    raise exception 'Authenticated active staff account required';
  end if;

  update public.sme
  set public_listing_enabled = coalesce(p_enabled, false),
      updated_at = now()
  where sme_id = v_sme_id
  returning * into v_sme;

  if not found then
    raise exception 'Current SME not found';
  end if;

  return v_sme;
end;
$function$;

revoke all on function public.set_sme_public_listing(boolean) from public, anon;
grant execute on function public.set_sme_public_listing(boolean) to authenticated;
