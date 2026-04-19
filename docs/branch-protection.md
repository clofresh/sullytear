# Branch protection setup

Required configuration for the `main` branch in GitHub repo settings
(Settings → Branches → Branch protection rules → Add rule for `main`).

## Required status checks

Enable "Require status checks to pass before merging" with these checks:

- `typecheck` (from `pr-gates.yml`)
- `test` (from `pr-gates.yml`)
- `build` (from `pr-gates.yml`)
- `validate-models` (from `pr-gates.yml`)
- `sim-compare` (from `pr-gates.yml`)

## Auto-merge

Enable "Allow auto-merge" in the repo's general settings. PRs with the
`auto-merge` label can be set to auto-merge when all required checks pass.

The agent improvement loop applies `auto-merge` only to these roles:
- `coverage-filler` — test-only, no source changes
- `docs-syncer` — docs-only, no source changes
- `simplifier` — only when sim:compare shows ≤2% drift

All other agent PRs (`balance-tuner`, `bug-hunter` source fixes) require
human review.

## Recommended additional settings

- "Require branches to be up to date before merging" — ensures PRs are
  tested against latest `main`.
- "Require linear history" — keeps the commit graph clean.
- "Do not allow bypassing the above settings" — applies rules to admins too.
