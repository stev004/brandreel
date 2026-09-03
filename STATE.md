# STATE - brandreel snapshot

*Updated 2026-09-03 06:21. Snapshot of current truth; history in SESSIONS.md and git.*

## Where things stand
- **Branch chain (all local, no remote):** `main` <- `feature/m1-engine` (M1 engine, demo green) <- `feature/howclose-trial` (v1 port + schema + animatics + audio modules merged in). **One merge gets everything:** `git -C ~/Documents/brandreel merge --no-ff feature/howclose-trial`. Worktrees live at /tmp/brandreel-m1-wt and /tmp/brandreel-hc-wt (remove after merge).
- **Gates all green on the trial branch:** typecheck, 12 tests, no-literal greps, both workspace renders + media lints, audio end-to-end (VO -> alignment -> polish at -13.75 LUFS).

## Waiting on Steven
1. **Gate animatic v2 rev3** (KEEP/TWEAK/KILL): https://claude.ai/code/artifact/af17a332-4be0-4af1-a670-7e52629ced63 - 29s, two-bar ENERGY IN vs OUT concept (rev3 replaced the time-series chart per Steven's clarity ruling). On KEEP -> delegate the v2 port.
2. **Merge** the chain (command above).
3. Optional: create a private GitHub remote so the CI render workflow runs.

## Next build steps (in order)
1. v2 port after gate: new `bars` beat kind + zoom composition, 1:1 from `animatics/howclose-fusion-v2.html`. **Scene durations must derive from `vo-timing.json` when modules.vo is on** - measured VO is 33s vs 29s picture; VO timing is authoritative.
2. Assemble the finished v2 video: compose -> polish (real music track needed - none chosen yet) -> lint -> review sheet.
3. M3 assets (Veo free tier + Pexels + RIFE) when a script needs footage; M4 (script LLM stage, brand extractor, orchestrator, photography + regulate content kits) after.

## Environment facts (hard-won)
- Audio venv MUST be Python 3.12 (`python3.12 -m venv audio/.venv`) - kokoro has no 3.14 wheels. Setup in `audio/README.md`.
- Codex sandbox: no Chromium, no network - renders and installs are reviewer-run.
- Kokoro new API yields Result objects (.audio), not tuples - handled in bin/vo.py.
