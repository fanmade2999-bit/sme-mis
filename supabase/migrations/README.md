# Supabase migrations

The live SME MIS Supabase project was initialized on 2026-09-30. The repository migration filenames below match the versions recorded by Supabase:

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
12. `20260930072426_restore_item_cost_column_protection`
13. `20260930072447_enforce_item_safe_column_grants`
14. `20260930073430_harden_operational_rpc_response_contracts`
15. `20260930074237_enable_anonymous_public_price_position`
16. `20260930074754_atomic_catalog_item_creation`
17. `20260930074810_safe_atomic_catalog_item_contract`

The application treats the operational database as the source of truth. Core writes are performed through server/database-controlled transactions, while reporting is served through purpose-built views and Owner-only margin functions.

Security note: `item.cost` and `stock_movement.unit_cost_snapshot` are not directly selectable by authenticated clients. Public price comparison uses a security-invoker read model so the underlying RLS rules remain effective. Security-definer RPCs are intentionally exposed only where the application needs them; each performs its own tenant and role checks.

Future schema changes should be incremental migrations. Do not re-run migrations already recorded on the initialized live project.
