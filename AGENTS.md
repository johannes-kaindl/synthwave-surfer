# AGENTS.md

> **Workspace-Standards:** Die verbindliche Leitkonvention steht in `_docs/CONVENTIONS.md`
> (am Workspace-Root `/Users/Shared/code/`), Modell comply-or-explain. Offene Punkte fuer
> dieses Repo siehe Abschnitt "Offene Konventions-Punkte".

Conventions for AI assistants working in this repo.

## What this is
**Synthwave Surfer** — a single-file generative music app (`synthwave_surfer.html`,
~3.9k lines, HTML/JS + Tone.js 14 from CDN). It generates multi-genre electronic
music in the browser: pick a genre "engine" (Outrun, Noir, Dreamwave, Carpenter,
Techno, Prog House, Trance, Dubstep, Acid House), it composes + plays deterministically
from a seed. Long-term goal: an Obsidian plugin (the Kuro universe's audio layer).

## Workflow conventions
- **Edit `synthwave_surfer.html` directly** — it's the whole app (no build step).
- **Tests:**
  - Headless logic suite (committed, canonical): `node scripts/fullsuite.mjs`
    (extracts the in-file `tests` array + pure functions, runs with Node — expect
    "real: 47 passed, 0 failed"). A `.remember/tmp/fullsuite.mjs` copy may also exist.
  - Syntax gate (committed): `node scripts/check-syntax.mjs` before committing.
  - Headless AUDIO verification (Claude can self-check sound, not just the user's ear):
    `NODE_PATH=~/.npm/_npx/e41f203b7505f1fb/node_modules node .remember/tmp/verify_*.cjs`
    (Playwright + cached Chrome) — loads the app, captures console errors, measures
    master-output RMS via an analyser/offline render. Build new `verify_*.cjs` per task.
  - In-browser: `synthwave_surfer.html?test=1` runs the test harness in the console.
  - Audio needs an HTTP server (Tone.js won't load on `file://`):
    `python3 -m http.server 8745` → http://localhost:8745/synthwave_surfer.html
- **Commit style:** Conventional Commits; AI-pair commits get a `Co-Authored-By` trailer.
  This is a solo single-file project — committing directly to `main` is the norm, but
  large multi-edit features go on a feature branch + merge back.
- **Tone.js gotchas (learned the hard way):** cutoff ≤ ~0.04 ≈ 140 Hz lowpass mutes a
  bass; new synth models need a `MDL_LABELS` entry (else `padEnd` crash); schedule
  one-shots via `makePart` (transport-synced + cleaned up), not raw `triggerAttack`;
  for the offline render (WAV export) use `Tone.getDestination()`/`Tone.getTransport()` +
  `setContext()`+`OfflineContext.render()`, NOT the frozen global `Tone.Destination`/`Tone.Transport`
  (cross-context connect error — fixed in v0.1.2).

## Memory + logs
- **Vault memory (tracked, primary):** `claude/memory/` — `MEMORY.md` is the index,
  `project_synthwave_surfer.md` is the live project state. READ THIS FIRST each session.
- **Global memory:** `~/.claude/projects/-Users-Shared-code-synthwave-surfer/memory/`.
- **Session logs:** `claude/logs/YYYY-MM-DD-<topic>.md`. (The `remember` plugin also
  keeps daily scratch in `.remember/` — gitignored.)
- **Specs / plans / research:** `docs/superpowers/{specs,plans,research}/`.

## Architecture notes
- **Genre = Engine + Voicing.** `ALGORITHMS[engine]` = composition (form builder,
  bass/lead generators, drum pattern, padProg, arrangement). `ENGINE_VOICINGS[engine]`
  = canonical synth voicing; `mergeVoicing` applies sparse deltas. `DRUM_KITS` +
  `drumParams` = the drum voicing (kit + live-editable knobs via the Drums panel).
- Each genre card carries a curated seed (`GENRE_SEED`); clicking it = loading "its
  preset". (The old `FACTORY_PRESETS`/`applyPreset`/`renderFactoryRow` system was removed 2026-06-06.)
- Synth models live in `buildSynthModel`; drum voices in `buildAudioGraph` (kit-driven).
- Arrangement (`buildArrangedForm` + `arrangement{dropBars,breakdownStart/End}`):
  multi-section EDM structure (build→drop→main→breakdown→drop2→main) with riser+crash.
- **Current state lives in `claude/memory/project_synthwave_surfer.md`** — including the
  active branch and the open next-steps. Always reconcile against it.

## Offene Konventions-Punkte

- [ ] CORE-META-03 — Hero/Screenshots nach `docs/images/` verschieben (statt `assets/`) und reproduzierbar per Skript erzeugen.
- [ ] CORE-META-08 — Doc-Lizenz `LICENSE-DOCS` (CC BY-SA 4.0) anlegen und im README verlinken.
- [x] CORE-META-10 — Beschreibung + Topics auf Codeberg/GitHub setzen — erledigt 2026-06-08 (Description + Homepage=Live-Demo + 15 Topics auf beiden via API; manuell gepflegt).
- [ ] CORE-AGENT-01 — Abschnitt "Abweichungen von der Leitkonvention" in AGENTS.md ergaenzen (Skeleton vervollstaendigen).
- [ ] CORE-AGENT-05 — `.claude/` gitignoren (nur `.claude/settings.local.json` erlauben); bereits getrackte `.claude/launch.json` aus dem Index nehmen.
