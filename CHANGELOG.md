# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/).

This changelog begins at the project's first public release; it summarises the
capabilities present at that point rather than reconstructing the full
pre-public history.

## [Unreleased]

## [0.2.0] - 2026-06-08

### Added
- **Rolling offbeat basses** for Techno / Prog House / Trance (kick-dodging — the
  bass never lands on a four-on-the-floor kick step): Techno plays a sustained,
  melodic, pumping offbeat bass; Prog House and Trance roll the offbeat 16ths.
- **Detroit-style stab for Techno** — a short off-beat m7 chord stab replaces the
  sustained pad: transient and narrow, so it frees the frequency space the wide pad
  was hogging.
- **Supersaw leads** for Techno / Prog House / Trance — an octave lower with a
  plucky 0.10 sustain; the lead phrase now repeats across both main sections and
  the breakdown (was a single short phrase).

### Changed
- EDM **pads dialed back** (quieter, darker, drier) so they sit under the bass and
  lead instead of washing over everything.
- The **piano roll now renders the actual pad/stab patterns** — a shared
  `buildPadHits` feeds both the scheduler and the roll, so they can't drift.
- **Dubstep is parked** (hidden from the genre selector) until a real wobble
  (per-bar bass-filter modulation) exists — the bus LFO can't reach the PolySynth's
  per-voice filter. The engine code stays in the repo.

### Fixed
- **Performance degradation over time** — the live audio graph leaked its track-bus
  and synth-model nodes (including PolySynths) on every rebuild, and `renderMeters`
  stacked a requestAnimationFrame loop on every re-arm. Both are cleaned up.
- **Trance / Prog House lead showed no instrument** in the Model dropdown — the
  `supersaw` option was missing from the list.
- **`bassFill` dropped the `rest` flag**, turning rolling-bass rests into
  `undefined`-degree notes — which blanked the piano roll (NaN range) for the
  rolling-bass genres and silently dropped those bass notes. Rests are preserved now.

## [0.1.2] - 2026-06-07

### Fixed

- **WAV export now works.** The offline render hit a cross-context error —
  `buildAudioGraph` connected to the frozen global `Tone.Destination`, which does
  not follow `Tone.Offline`'s context swap. It now renders via `setContext()` +
  `OfflineContext.render()`, with `buildAudioGraph`/`scheduleAll` using
  `getDestination()`/`getTransport()`. Verified across all nine genres.
- **Switching genre while the music plays now changes the composition, not just
  the sound.** `generate()` re-arms the running transport (previously only the
  voicing was applied live, so you heard the new instruments playing the old notes).
- **Dubstep half-time pattern** scheduled two hat hits at the same instant (the
  offbeat hat overlapped the first step of the 1/32 roll) — which a monophonic
  voice cannot retrigger, breaking the offline render. The scheduler now collapses
  same-time, same-voice drum hits.

### Removed

- Dead `FACTORY_PRESETS` / `applyPreset` / `renderFactoryRow` (and their CSS),
  superseded by the per-genre card-preset model — they were never reachable from
  the UI.

## [0.1.1] - 2026-06-06

### Fixed

- Corrected stale in-app text from before the nine-engine expansion: the epigraph
  read "Three algorithms" (now "Nine engines"), the footer listed only three
  genres ("Outrun × Noir × Dreamwave", now "Nine genre engines"), and the header
  badge advertised "v1.0 · Factory Presets" (Factory Presets are dead code) —
  replaced with an accurate feature list.

## [0.1.0] - 2026-06-06

### Added

- **Public release** with full documentation (README, architecture + usage
  guides, contributing, licensing, security) and a hosted live demo on Codeberg
  Pages.
- **Nine genre engines**, each pairing a composition algorithm with a canonical
  synth voicing: Outrun, Noir, Dreamwave, Carpenter, Techno, Prog House, Trance,
  Dubstep, Acid House.
- **Engine + Voicing architecture** — `ALGORITHMS` (composition) and
  `ENGINE_VOICINGS` (sound) are decoupled and combined via `mergeVoicing`, so a
  genre's algorithm and tone evolve independently and presets store only sparse
  deltas.
- **Motif-based melody engine** (state-a-motif-then-develop, not random-walk)
  and a root-anchored **bass-riff engine** with turnaround fills.
- **Six synth voices** — FM bell, Juno-style detuned saws, MS-20 bass, TB-303
  (saw + filter envelope + Chebyshev squelch), lush pad, and a 7-osc supersaw.
- **Four drum kits** (LinnDrum-style gated, TR-909, TR-808, Dubstep) built from
  an editable `drumParams` graph, with a live **Drums · Kit & Voicing** panel
  (per-voice knobs + gated-snare toggle).
- **EDM arrangement engine** — a 32-bar form with two drops and a breakdown,
  noise risers and crashes into each drop, and pre-drop kick gating.
- **`.swmd` codec** — a Markdown, Obsidian-compatible music format
  (import / export), with multi-phase blocks, piano-roll patterns, ` ```swdrum `
  drum grids, and an FX-bus table.
- **Real-time editing** — per-track instrument panels and a master FX bus
  (reverb, feedback delay, sidechain, tape saturation).
- **Preset system** — each genre card is a curated preset; user presets persist
  to `localStorage` with JSON import / export; full-state JSON export.
- **External API** — a frozen `window.synthwaveSurfer` (`setPhase`, `getPhases`,
  `getCurrentPhase`, `onPhaseChange`, `getMeta`) for syncing external visuals.
- **Test harnesses** — an in-browser `?test=1` suite (49 tests), a headless
  Node logic suite (45/0), and a Playwright audio-RMS verifier.

### Known issues

- **WAV export is disabled** — the UI button is greyed out pending a
  `Tone.Offline` / `Tone.Destination` cross-context fix. MIDI and `.swmd` export
  work; live playback is unaffected.
- Dead code (`FACTORY_PRESETS` / `applyPreset` / `renderFactoryRow`) remains in
  the source pending cleanup; it is not reachable from the UI.

[Unreleased]: https://codeberg.org/jkaindl/synthwave-surfer/compare/v0.2.0...main
[0.2.0]: https://codeberg.org/jkaindl/synthwave-surfer/compare/v0.1.2...v0.2.0
[0.1.2]: https://codeberg.org/jkaindl/synthwave-surfer/compare/v0.1.1...v0.1.2
[0.1.1]: https://codeberg.org/jkaindl/synthwave-surfer/compare/v0.1.0...v0.1.1
[0.1.0]: https://codeberg.org/jkaindl/synthwave-surfer/releases/tag/v0.1.0
