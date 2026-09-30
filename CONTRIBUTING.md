# Contributing to SME MIS

## Normal feature workflow

1. Start from an up-to-date `main`.
2. Create one focused branch:
   - `feat/<feature>` for a new capability
   - `fix/<bug>` for a defect
   - `security/<change>` for security hardening
   - `chore/<maintenance>` for tooling/documentation
3. Implement the smallest coherent change.
4. Run the repository checks locally:
   `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
5. Push the branch and open a pull request into `main`.
6. Let CI and preview deployment provide automated feedback.
7. Review the diff for correctness, security, tenant isolation, and test coverage.
8. Resolve review comments and wait for all required checks to pass.
9. Merge the approved pull request into `main`.
10. Deploy production only from the resulting `main` commit.

## Pull-request rules

- Do not merge a red build.
- Do not use a PR to bundle unrelated features or refactors.
- Database/schema changes must include the corresponding Supabase migration and verification.
- Security-sensitive changes must include an explicit authorization/RLS review.
- A passing build is necessary but not sufficient: review behavior and security before merge.
- Never report production as updated without checking the deployed commit SHA.

## Hotfixes

A direct main-branch hotfix is reserved for an urgent production incident. The change should still be followed by a retrospective PR or equivalent review record.

## Verification

The canonical checklist is in `SPEC.md`; the agent-specific constraints are in `AGENTS.md`.
