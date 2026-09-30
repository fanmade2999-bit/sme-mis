# Supabase migrations

The live SME MIS Supabase project was initialized on 2026-09-30 with these remote migrations:

1. `20260930065314_initial_operational_schema`
2. `20260930065356_security_transactions_and_public_read_model`
3. `20260930065430_performance_fk_indexes`
4. `20260930065500_auth_bootstrap_and_public_view_hardening`

These files are kept in this repository so fresh environments can reproduce the database setup in the same order.

The fourth migration adds the authenticated first-owner bootstrap RPC and hardens SECURITY DEFINER functions with an empty search_path. Public catalog tables are not exposed to anonymous clients; anonymous price comparison goes through the curated `v_public_price_comparison` view.

Do not re-run these migrations against the already initialized live project. Future schema changes should be incremental migrations.
