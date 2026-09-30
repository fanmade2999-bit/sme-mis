begin;

drop function if exists public.create_sme_category(text);

create function public.create_sme_category(p_category_name text)
returns public.category
language plpgsql security definer set search_path=''
as $$
declare
  v_sme_id uuid := private.current_sme_id();
  v_role public.staff_role := private.current_staff_role();
  v_category public.category;
begin
  if v_sme_id is null or v_role is null then raise exception 'Authenticated active staff account required'; end if;
  if v_role not in ('OWNER','MANAGER') then raise exception 'Only Owner or Manager may create categories'; end if;
  if p_category_name is null or length(btrim(p_category_name)) = 0 then raise exception 'Category name is required'; end if;
  insert into public.category(sme_id, category_name)
  values(v_sme_id, btrim(p_category_name))
  returning * into v_category;
  return v_category;
exception when unique_violation then
  raise exception 'A category with that name already exists';
end;
$$;

revoke execute on function public.create_sme_category(text) from public, anon;
grant execute on function public.create_sme_category(text) to authenticated;

commit;
