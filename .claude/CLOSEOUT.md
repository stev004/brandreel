# CLOSEOUT - brandreel doc map

> Bootstrapped 2026-09-03, extended 2026-09-22 (roadmap, foreman state, run evidence rows).

The next session must pick up from the repo alone. Facts live here:

| Fact that changed | Owning file |
|---|---|
| Current truth: branch state, pending gates, next actions | `STATE.md` (snapshot - delete done items) |
| The ordered goal ladder (what to build next, done-conditions, Steven blocks) | `ROADMAP.md` (tick boxes; never delete a goal, supersede it) |
| Agent operating rules and where to start | `AGENTS.md` (any model) + `CLAUDE.md` (Claude) |
| Foreman run state (in-flight unit, frontier, parked decisions, director rules, trail) | `.claude/RUN.md`, `FRONTIER.md`, `GATES.md`, `DIRECTOR.md`, `decisions.tsv` |
| Run evidence (executor reports, briefs, frames, lint reports, digests) | `docs/runs/` (write-once) |
| Design rulings, architecture, craft laws | `SPEC.md` (append/edit rulings; never relitigate silently) |
| Session history | `SESSIONS.md` (append-only, newest first) |
| Agent behaviour rules | `CLAUDE.md` |
| Gates, merge policy, sandbox quirks | `.claude/DEVTEAM.md` |
| Brand facts | `brands/<name>/brand.json` (curated values only - never invented) |
| Video concepts + production references | `animatics/<id>.html` (the quality bar) + `<id>.plan.md` (decisions) |
| Engine behaviour | code + tests in `engine/`; bin CLIs in `bin/`; audio setup in `audio/README.md` |

Git policy: work on feature branches; `main` is protected - Steven merges code. Docs-only closeout commits may land on `main` directly. Remote: https://github.com/stev004/brandreel (public; CI renders + lints on push) - push after every closeout. Never commit generated media (gitignored) or secrets.

Not registered in StevOS `os/sync/REGISTRY.yaml` yet - if registered later, add the state snapshot at the path the registry names.
