# SME MIS Specification Checklist

This is the implementation contract. Check items only after code and automated/live evidence support them.

## Authentication & membership
- [ ] Registration creates the correct SME/staff ownership relationship.
- [ ] Login establishes a valid protected session.
- [ ] Email confirmation cannot perform an unsafe redirect.
- [ ] Invites create/link staff accounts safely.
- [ ] Revoked accounts cannot use protected workspace operations.
- [ ] Reactivation refuses accounts whose linked Auth user no longer exists.
- [ ] Current-user lookup uses the safe RPC contract.

## Catalog
- [ ] Product identity is canonical and barcode-independent.
- [ ] Barcode conflicts are rejected.
- [ ] Categories are SME-scoped.
- [ ] Shelf locations are SME-scoped.
- [ ] Item creation is atomic with opening stock where applicable.
- [ ] Archived items cannot be used for invalid operational actions.
- [ ] Public item visibility is explicitly controlled.

## Stock
- [ ] Stock movements are performed through guarded RPCs.
- [ ] Quantity/sign validation is enforced server-side.
- [ ] Stock cannot cross SME boundaries.
- [ ] Audit records are created consistently.
- [ ] Cost data is not exposed to non-authorized roles.

## Staff
- [ ] Only authorized Owners can manage staff.
- [ ] Owner self-revocation is prevented.
- [ ] Owner role cannot be assigned/reassigned through an unsafe path.
- [ ] Role changes remain inside the current SME.
- [ ] Revoke/reactivate state transitions are validated server-side.
- [ ] UI confirmation exists for destructive staff access changes.

## Public prices
- [ ] Only explicitly public SMEs/items appear.
- [ ] Public views do not expose private cost/margin fields.
- [ ] Price freshness is visible.
- [ ] Public comparison uses the intended product identity.
- [ ] Platform authentication does not unintentionally block the intended public route.

## Database security
- [ ] RLS is enabled on all exposed application tables.
- [ ] Direct operational DML is not granted to clients.
- [ ] Security-definer functions have explicit authorization checks.
- [ ] Security-definer functions use a controlled search_path.
- [ ] Anonymous execution is revoked from privileged application RPCs.
- [ ] Public views use appropriate security-invoker behavior.
- [ ] Foreign keys and tenant predicates prevent cross-SME references.
- [ ] Supabase security advisors have no unexplained findings.

## Quality & delivery
- [ ] ESLint passes.
- [ ] TypeScript typecheck passes.
- [ ] Automated tests pass.
- [ ] Production build passes.
- [ ] GitHub Actions runs verification on pushes/PRs.
- [ ] Deployment only occurs after verification passes.
- [ ] Production commit is verified before reporting deployment status.
