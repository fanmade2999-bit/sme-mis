-- SME MIS database contract tests
-- Authentication-specific row-policy tests should be expanded once test users exist.

do $$
declare v_count integer;
begin
  select count(*) into v_count from pg_tables
  where schemaname='public'
    and tablename in ('sme','staff_account','product','category','item','price_change_log','stock_movement');
  if v_count <> 7 then raise exception 'Expected 7 core tables, found %',v_count; end if;

  select count(*) into v_count from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and c.relrowsecurity;
  if v_count < 7 then raise exception 'Expected all core public tables to have RLS enabled'; end if;

  if to_regprocedure('public.create_item(uuid,uuid,numeric,numeric,integer,text,text,text,boolean,integer)') is null then
    raise exception 'Atomic create_item contract is missing';
  end if;
  if to_regprocedure('public.bootstrap_sme_owner(text,text)') is null then
    raise exception 'Owner bootstrap contract is missing';
  end if;
  if to_regprocedure('public.record_stock_movement(uuid,public.stock_movement_type,integer,public.correction_direction,text)') is null then
    raise exception 'Stock movement contract is missing';
  end if;
  if pg_get_function_result(to_regprocedure('public.record_stock_movement(uuid,public.stock_movement_type,integer,public.correction_direction,text)')) <> 'jsonb' then
    raise exception 'Stock movement must return a safe jsonb contract';
  end if;
  if to_regprocedure('public.set_item_price(uuid,numeric)') is null then
    raise exception 'Price transaction contract is missing';
  end if;
  if to_regprocedure('public.set_item_price(uuid,numeric)') is not null and
     pg_get_function_result(to_regprocedure('public.set_item_price(uuid,numeric)')) <> 'jsonb' then
    raise exception 'Price transaction must return a safe jsonb contract';
  end if;
  if to_regprocedure('public.set_item_cost(uuid,numeric)') is null then
    raise exception 'Cost transaction contract is missing';
  end if;
  if to_regprocedure('public.get_owner_profit_summary(timestamptz,timestamptz)') is null then
    raise exception 'Owner profit contract is missing';
  end if;
  if to_regprocedure('public.revoke_staff_account(uuid)') is null
     or to_regprocedure('public.change_staff_role(uuid,public.staff_role)') is null then
    raise exception 'Staff management contracts are missing';
  end if;

  if to_regclass('public.v_public_price_comparison') is null
     or to_regclass('public.v_inventory_status') is null
     or to_regclass('public.v_sales_daily') is null
     or to_regclass('public.v_price_freshness') is null
     or to_regclass('public.v_public_price_position') is null then
    raise exception 'Required reporting views are missing';
  end if;

  if has_table_privilege('anon','public.item','SELECT') then
    raise exception 'Anonymous access to item table should remain revoked';
  end if;
  if has_table_privilege('authenticated','public.item','SELECT') then
    raise exception 'Authenticated whole-table SELECT on item should remain revoked';
  end if;
  if has_column_privilege('authenticated','public.item','cost','SELECT') then
    raise exception 'Authenticated roles should not directly read item cost';
  end if;
  if has_column_privilege('authenticated','public.stock_movement','unit_cost_snapshot','SELECT') then
    raise exception 'Authenticated roles should not directly read historical unit cost';
  end if;
  if not has_table_privilege('anon','public.v_public_price_comparison','SELECT') then
    raise exception 'Anonymous public price view access is missing';
  end if;
end $$;

select 'SME MIS database contract tests passed' as result;