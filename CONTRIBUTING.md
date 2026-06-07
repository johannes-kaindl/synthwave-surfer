# Contributing

Thanks for your interest! This doc describes the developer workflow. It aims to
stay low-friction — the stack is intentionally a single file with no build.

## Setup

There's no build step and exactly one runtime dependency ([Tone.js](https://tonejs.github.io/),
loaded from a CDN). You only need:

- A modern browser (Chrome, Firefox, Safari)
- Python 3 for a local server (audio needs an HTTP origin — see below)
- Optional: Node.js for the headless checks

```bash
git clone https://codeberg.org/jkaindl/synthwave-surfer.git
cd synthwave-surfer
python3 -m http.server 8745
# → http://localhost:8745/synthwave_surfer.html
```

**You must serve over HTTP.** Opening `synthwave_surfer.html` from `file://`
shows the UI but produces no sound — Tone.js does not initialise on a `file://`
origin.

## Code style

- **Vanilla JS**, ES2020+ browser targets. No TypeScript migration without
  discussion (the TS port is the *separate* Obsidian-plugin project).
- **One dependency.** Tone.js is it. Don't add others without a clear reason —
  the tool needs to stay a single statically-deployable file.
- **Comments, UI strings, identifiers, and commit messages in English.**
- Function names in `camelCase`, constants in `UPPER_SNAKE_CASE`.
- The whole app lives in `synthwave_surfer.html`. Edit it directly.

Pragmatic: if you disagree with the existing style somewhere, raise it in the
issue/PR — we'll decide together.

## Tests

Four layers, in order of how often you'll touch them.

### 1. Syntax gate (mandatory before each commit)

```bash
node scripts/check-syntax.mjs
# → SYNTAX OK — 1 inline script block(s) parse
```

It extracts every inline `<script>` and parses it with the VM compiler (validates
syntax without executing). A regression here is a syntax error that would break
the whole app.

### 2. Headless logic suite (mandatory when changing engine logic)

```bash
node scripts/fullsuite.mjs
# → real: 47 passed, 0 failed | probes: 1 pass, 2 expected-fail | skipped(DOM): 4
```

It extracts the in-file `tests` array plus the pure functions and runs them under
Node. Expect `0 failed`. Probe lines are coverage markers, not failures; four
DOM-dependent tests are skipped headless (they run in layer 3).

### 3. In-browser test harness

```bash
python3 -m http.server 8745
# → http://localhost:8745/synthwave_surfer.html?test=1
```

The `?test=1` flag runs the full `tests` array (51 real tests) in the browser
console.

### 4. Headless audio verification (optional — for audio-graph / synth / drum / scheduling changes)

This one is **optional and maintainer-side**: a Playwright + headless-Chrome
harness loads the served app, captures console / page errors, and measures
master-output RMS on `Tone.Destination` to confirm an engine actually makes
sound (not just that the logic passes). To set it up:

```bash
npm i -D playwright && npx playwright install chromium
# then write a small verify_*.cjs: load the app on :8745, connect an AnalyserNode
# to Tone.Destination, measure RMS over a few frames, and run it with node.
```

If you'd rather not, the **manual browser smoke** below is the required path for
any audio-touching PR.

### Manual browser smoke (before a PR)

```bash
python3 -m http.server 8745   # → http://localhost:8745/synthwave_surfer.html
```

- [ ] Default genre (Outrun) loads and **Generate → ▶ Play** produces sound
- [ ] All **8 visible genre cards** load and play without console errors
      (outrun, noir, dreamwave, carpenter, techno, proghouse, trance, acid; Dubstep is parked)
- [ ] Changing the **seed** and regenerating yields a different composition in
      the same style; the same seed reproduces exactly
- [ ] The EDM genres (techno/proghouse/trance) audibly **drop** after
      the build and expose pads in the breakdown
- [ ] **Drums panel**: switching kit + moving the knobs changes the drums live;
      the snare-gate toggle changes the snare tail
- [ ] Per-track **mutes** and the **master FX** sliders take effect live
- [ ] **Export** MIDI and `.swmd`; re-import the `.swmd` and it reproduces

## Adding a synth model

`buildSynthModel(name, poly)` is a flat `if`-chain returning
`{ synth, character, characterAmount, type }`. When you add a model:

1. Add its branch to `buildSynthModel`.
2. **Add a matching entry to `MDL_LABELS`** — a missing label crashes the info
   panel (`padEnd` on `undefined`). This exact bug hit `supersaw`.
3. If it needs a non-standard LFO target, wire it in `applyTrackParams`.
4. Reference it from an `ENGINE_VOICINGS` track, and add a test.

## Adding a drum kit

`DRUM_KITS` maps a kit name to `{ kick, snare, hat }`. To add one:

1. Add a `DRUM_KITS` entry: `kick { pitchDecay, octaves, decay, vol }`,
   `snare { decay, filterFreq, filterType, vol, gate, gateDecay? }`,
   `hat { decay, filterFreq, vol }`. Set `gate: true` (plus a `gateDecay`) only
   if the snare should have a gated-reverb tail.
2. It appears automatically in the **Drums · Kit & Voicing** selector — that
   dropdown is built from the `DRUM_KITS` keys.
3. Mind the field-name mapping: `loadDrumKit` copies the kit into the live
   `drumParams` under *different* names (`kick.decay → kickDecay`,
   `kick.pitchDecay → kickBoom`, `snare.filterFreq → snareTone`, …). The tunable
   knobs apply live; structural fields (`octaves`, `filterType`, voice volumes,
   `gateDecay`) are read only at graph-build time, so they take full effect on the
   next **Generate**.
4. Optionally point a genre's `drumKit` at it in `ALGORITHMS`, add a test, and
   smoke-test the kit in the browser.

## Tone.js gotchas (learned the hard way)

- `cutoff ≤ ~0.04` ≈ a 140 Hz lowpass that **mutes a bass** entirely.
- New synth/track models **need an `MDL_LABELS` entry** (see above).
- Schedule one-shots via `makePart` (transport-synced + auto-cleaned), **not**
  raw `triggerAttack`.
- The crash voice **must not share** the open-hat voice (schedule clash).
- `Tone.Offline` clashes with the global `Tone.Destination` — this is the parked
  WAV-export bug; don't reintroduce the pattern in live code.

## Pull requests

1. **Branch** from `main` with a descriptive name (`feat/lofi-engine`,
   `fix/dubstep-wobble-drift`).
2. **[Conventional Commits](https://www.conventionalcommits.org/)** — e.g.
   `feat(drums): add 707 kit`, `fix(arrange): kick gating off-by-one`.
3. **Update `CHANGELOG.md`** in the `[Unreleased]` section.
4. **Description**: what changed, why, how it was tested.

PRs without visible test effort will be returned.

## Out of scope

Please **discuss before working on**:

- Migration to frameworks (React/Vue/Svelte) or bundlers (Webpack/Vite)
- Adding dependencies that aren't small and essential
- File renames without a refactoring reason (a lot of tooling references
  `synthwave_surfer.html` by name)
- Auto-formatting across the whole file

## License of contributions

By opening a PR you agree to the [Contributor License Agreement](CLA.md): you
keep your copyright, your contribution stays available under the project's
open-source license, **and** you grant the maintainer the right to also license
it under other terms — which keeps the project's [dual-licensing model](LICENSING.md)
(AGPL + an optional commercial license) possible. To accept, add this line to
your PR description (or as a `Signed-off-by:` trailer on your commits):

> I have read and agree to the Contributor License Agreement (CLA.md).

Under the open-source license, your contribution is published under the same
license as the overall project: [AGPL-3.0-or-later](LICENSE).
