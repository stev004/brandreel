# DEVTEAM.md - brandreel

## Gates (run from engine/ unless noted)
- `npm run typecheck` - tsc --noEmit, zero errors
- `npm test` - vitest run, all green
- Reviewer-only (implementer sandbox has no Chromium/network): `npx remotion render` of the demo composition + `node ../bin/lint.mjs` on the output

## Merge policy
Orchestrator pushes the branch; Steven merges. No remote yet - merges happen locally into `main`; never merge from inside a worktree.

## Protected branches
`main`

## No-touch paths
- `brands/*/brand.json` values are curated facts - implementers may create the schema-conformant file from the spec's quoted tokens but must not invent or "improve" token values
- No `.env`, no secrets, no absolute user paths anywhere in the tree

## Quirks
- Implementer sandbox cannot launch Chromium and has no network: renders and npm installs are orchestrator-run. node_modules is provisioned in the worktree before delegation; Codex must not run npm install or add dependencies beyond the spec.
- Global FPS is 60 and lives in exactly one place; per-composition overrides are a review failure.
- Plain hyphens in all docs and copy - no em/en dashes (also strip U+2212).
- SPEC.md design rulings are settled; deviations need Steven, not an implementer's judgment.
