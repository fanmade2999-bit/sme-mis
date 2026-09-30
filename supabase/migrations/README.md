# Supabase migrations

The live SME MIS Supabase project was initialized on 2026-09-30 with these migrations:

1. `20260930065314_initial_operational_schema`
2. `20260930065356_security_transactions_and_public_read_model`
3. `20260930065430_performance_fk_indexes`
4. `20260930070210_auth_bootstrap_and_public_view_hardening`
5. `20260930071013_public_price_lookup_rpc`
6. `20260930071157_public_price_view_security_invoker`
7. `20260930071627_account_management_and_reporting_views`
8. `20260930071940_owner_profit_availability_guard`
9. `20260930072027_secure_item_creation_transaction`
10. `20260930072046_activate_completed_item_creation`
11. `20260930072125_atomic_item_creation_with_opening_stock`
12. `20260930072410_restore_item_cost_column_protection`
13. `20260930072430_enforce_item_safe_column_grants`

The repository keeps these incremental migrations so fresh environments can reproduce the database setup in the same order.

Public price comparison uses a `security_invoker` view so the underlying table RLS policies apply to anonymous reads. Item cost and historical unit cost are withheld from direct authenticated table reads; Owner-only margin reporting uses an explicitly privileged database function with internal role checks.

Future schema changes should be incremental migrations. Do not re-run already-recorded migrations against the initialized live project.
