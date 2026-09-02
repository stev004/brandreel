# brandreel

Standalone brand-agnostic 60fps short-form video pipeline. **Read SPEC.md first - it carries the settled design rulings; do not relitigate the engine choice or the eight-stage shape without Steven.**

- Stages communicate through files in `workspace/<video-id>/` only; no cross-stage imports.
- `brand.json` (Zod, `schema/brand.ts`) is the portability boundary. Templates never contain brand literals.
- Global FPS is 60. Deterministic bezier easing only, no springs.
- Lints fail builds; taste decisions go to Steven via the review sheet.
- No absolute user paths. Plain hyphens in docs and copy, no em/en dashes.
- Renders need Chromium: sandboxed implementers stop at `tsc --noEmit` + tests; reviewer or CI runs `bin/compose`.
