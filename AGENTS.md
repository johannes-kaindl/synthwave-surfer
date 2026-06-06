# AGENTS.md

Conventions for AI assistants working in this repo.

## What this is
**Synthwave Surfer** — a single-file generative music app (`synthwave_surfer.html`,
~3.5k lines, HTML/JS + Tone.js 14 from CDN). It generates multi-genre electronic
music in the browser: pick a genre "engine" (Outrun, Noir, Dreamwave, Carpenter,
Techno, Prog House, Trance, Dubstep, Acid …), it composes + plays deterministically
from a seed. Long-term goal: an Obsidian plugin (the Kuro universe's audio layer).

## Workflow conventions
- **Edit `synthwave_surfer.html` directly** — it's the whole app (no build step).
- **Tests:**
  - Headless logic suite: `node .remember/tmp/fullsuite.mjs` (extracts the in-file
    `tests` array + pure functions, runs with Node — expect "real: N passed, 0 failed").
  - Headless AUDIO verification (Claude can self-check sound, not just the user's ear):
    `NODE_PATH=~/.npm/_npx/e41f203b7505f1fb/node_modules node .remember/tmp/verify_*.cjs`
    (Playwright + cached Chrome) — loads the app, captures console errors, measures
    master-output RMS via an analyser/offline render. Build new `verify_*.cjs` per task.
  - Syntax gate: extract the main `<script>` and `node --check` it before committing.
  - In-browser: `synthwave_surfer.html?test=1` runs the test harness in the console.
  - Audio needs an HTTP server (Tone.js won't load on `file://`):
    `python3 -m http.server 8745` → http://localhost:8745/synthwave_surfer.html
- **Commit style:** Conventional Commits; AI-pair commits get a `Co-Authored-By` trailer.
  This is a solo single-file project — committing directly to `main` is the norm, but
  large multi-edit features go on a feature branch + merge back.
- **Tone.js gotchas (learned the hard way):** cutoff ≤ ~0.04 ≈ 140 Hz lowpass mutes a
  bass; new synth models need a `MDL_LABELS` entry (else `padEnd` crash); schedule
  one-shots via `makePart` (transport-synced + cleaned up), not raw `triggerAttack`;
  `Tone.Offline` clashes with the global `Tone.Destination` (the WAV-export bug).

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
  preset". The old `FACTORY_PRESETS`/`applyPreset` are DEAD CODE (cleanup pending).
- Synth models live in `buildSynthModel`; drum voices in `buildAudioGraph` (kit-driven).
- Arrangement (`buildArrangedForm` + `arrangement{dropBars,breakdownStart/End}`):
  multi-section EDM structure (build→drop→main→breakdown→drop2→main) with riser+crash.
- **Current state lives in `claude/memory/project_synthwave_surfer.md`** — including the
  active branch and the open next-steps. Always reconcile against it.
