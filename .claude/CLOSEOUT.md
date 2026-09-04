# CLOSEOUT - brandreel doc map

> UNREVIEWED bootstrap (written unattended 2026-09-03). Steven: correct the doc map if any row is wrong.

The next session must pick up from the repo alone. Facts live here:

| Fact that changed | Owning file |
|---|---|
| Current truth: branch state, pending gates, next actions | `STATE.md` (snapshot - delete done items) |
| Design rulings, architecture, craft laws | `SPEC.md` (append/edit rulings; never relitigate silently) |
| Session history | `SESSIONS.md` (append-only, newest first) |
| Agent behaviour rules | `CLAUDE.md` |
| Gates, merge policy, sandbox quirks | `.claude/DEVTEAM.md` |
| Brand facts | `brands/<name>/brand.json` (curated values only - never invented) |
| Video concepts + production references | `animatics/<id>.html` (the quality bar) + `<id>.plan.md` (decisions) |
| Engine behaviour | code + tests in `engine/`; bin CLIs in `bin/`; audio setup in `audio/README.md` |

Git policy: work on feature branches; `main` is protected - Steven merges. Commit with a clear message; no remote yet (flag this until one exists). Never commit generated media (gitignored) or secrets.

Not registered in StevOS `os/sync/REGISTRY.yaml` yet - if registered later, add the state snapshot at the path the registry names.
