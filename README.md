# SME: MIS with Price and Stock Control

A multi-tenant web-based Management Information System for micro and small SMEs, with a public read-only price comparison layer.

## Current direction

This repository intentionally starts from a clean technical foundation. The database schema, business rules, authentication model, RLS policies, transactions, and analytics definitions are designed before the frontend is built.

## Architecture

- Next.js / App Router
- Supabase Postgres + Auth + Row-Level Security
- Vercel for deployment
- GitHub for version control

## Core model

SME, STAFF_ACCOUNT, PRODUCT, CATEGORY, ITEM, PRICE_CHANGE_LOG, and STOCK_MOVEMENT.

PRODUCT identifies the shared product; ITEM represents an SME-specific listing of that product.

## Roles

- Owner — full SME access, staff management, cost and margin visibility
- Manager — item, price, and stock management; no cost editing
- Staff — view/search and stock deduction

## Scope boundary

The project does not include password recovery, supplier management, multi-branch consolidation, payments, push notifications, forecasting, automatic price capping, or automatic item creation from failed QR scans.

## Development order

1. Operational schema and constraints
2. Auth and RLS
3. Transaction functions and audit behavior
4. Analytics/reporting views
5. Database security and transaction tests
6. Frontend modules derived from the schema and DFD
7. BI layer where justified by validated operational data

## Repository status

The generic starter UI has been removed. Do not reintroduce template/demo pages; build SME MIS modules from the approved system design instead.


<!-- Production pipeline verified: 2026-09-30 -->
