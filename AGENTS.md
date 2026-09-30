# SME MIS Agent Contract

## Project
SME MIS is a multi-tenant SME management information system built with Next.js App Router, Supabase Postgres/Auth/RLS, and Vercel.

## Non-negotiable architecture
- Database is authoritative for business rules and authorization.
- Client mutations must use approved Supabase RPCs/server actions; do not restore direct operational table DML.
- Every tenant-scoped operation must remain inside the caller's SME.
- Roles are Owner, Manager, Staff. Never infer authorization from client UI.
- Never expose `staff_account.auth_user_id`, costs, or other private fields through authenticated client reads unless an explicit safe RPC contract requires them.
- Security-definer functions must have an explicit, minimal search_path and explicit authorization checks.
- Public price data is read-only and limited to explicitly public SMEs/items.
- Do not weaken RLS/grants to make a client query work. Fix the client/RPC contract instead.
- Preserve migration history and use timestamped Supabase migrations for schema changes.

## Authentication
- Supabase Auth identity maps to `staff_account`.
- Active membership is required for protected workspace operations.
- Revoked staff accounts must not regain access merely because their old membership row remains.
- Invite/revocation/reactivation flows must handle missing Auth users safely.
- Never use editable user metadata for authorization.

## Development loop
1. Work on one focused branch/task.
2. Read the relevant code, migration, and current tests before editing.
3. Make the smallest coherent change.
4. Run lint, typecheck, tests, and production build.
5. For database/security changes, verify the live Supabase behavior with SQL/advisors where available.
6. Review the diff for authorization bypasses, cross-SME leakage, race conditions, and client/RPC contract mismatches.
7. Only then merge/deploy.

## Required checks
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

A check that cannot run because the environment lacks credentials or dependencies must be reported as unverified, never assumed green.

## Scope discipline
Do not add unrelated UI/features while fixing infrastructure, security, or CI. Do not rewrite working architecture merely to satisfy a tool.

## Current known deployment constraint
The repository's GitHub Actions workflow can deploy production through Vercel when `VERCEL_TOKEN` is configured. Production may lag behind `main`; verify the deployment commit before claiming production is current.
