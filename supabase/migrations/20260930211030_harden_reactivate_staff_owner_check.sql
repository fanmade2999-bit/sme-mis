-- Harden the revoked-staff restore RPC against users with no active Owner account.
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