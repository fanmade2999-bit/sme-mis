begin;

revoke execute on function public.get_current_staff_account() from anon;
grant execute on function public.get_current_staff_account() to authenticated;

commit;
