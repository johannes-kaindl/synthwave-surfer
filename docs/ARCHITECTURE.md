# Architecture

Synthwave Surfer is one self-contained file, `synthwave_surfer.html` (~3.9k
lines): markup, CSS, all the music engines, the audio graph, the UI controller,
and an in-file test suite. The only runtime dependency is
[Tone.js 14.8.49](https://tonejs.github.io/), loaded from a CDN. There is no
build step.

Line numbers below are pointers into `synthwave_surfer.html` and will drift as
the file changes; treat them as a map, not a contract.

## The core idea: Engine + Voicing

Every genre is two independent things:

1. **Composition** — *what notes and structure*. Lives in `ALGORITHMS[genre]`
   (`:1303`). Pure data + generator functions: which form builder runs, how the
   bass riff and lead are generated, the pad chord progression, the drum
   pattern, swing, sidechain, default BPM/mode, and (for EDM genres) an
   `arrangement`. **No synth or FX data lives here.**
2. **Voicing** — *what it sounds like*. Lives in `ENGINE_VOICINGS[genre]`
   (`:2855`). The synth model + full ADSR/filter/LFO per track (bass/lead/pad)
   plus a master FX block (reverb, delay, sidechain depth, tape saturation,
   master gain).

They are deliberately decoupled so a genre's algorithm and its tone can change
without touching each other.

```
ALGORITHMS[genre]          ENGINE_VOICINGS[genre]
  form / bass / lead         model + ADSR + filter + LFO  (per track)
  pad / drums / swing        master: reverb / delay / sidechain / sat
  sidechain / arrangement
        │                            │
        └──────────► mergeVoicing ◄──┘
                          │
                     generate()  →  currentState.form
```

### mergeVoicing — sparse deltas

`mergeVoicing(defaultVoicing, deltas)` (`:2911`) shallow-merges, per track, a
canonical voicing with a sparse delta object and returns
`{ trackParams: { bass, lead, pad }, masterState }`. It never mutates its inputs
(spreads only). A preset therefore stores **only the few values it overrides**;
improvements to an engine's canonical voicing automatically propagate to every
preset built on it. `applyGenreVoicing(genre)` (`:2926`) is just
`mergeVoicing(voicing, null)` — load the canonical voicing with no deltas.

### Genre cards are presets

There is no separate "factory presets" UI anymore. **Each genre card *is* a
curated preset.** Clicking a card (`:2946`) clears the others, then:
`loadDrumKit(algo.drumKit)` → set the curated `GENRE_SEED` → set
`algo.defaultBpm` / `algo.defaultMode` → `applyGenreVoicing(genre)` →
`generate()`. `GENRE_SEED` (`:2945`) values are thematic (style birth years,
Roland model numbers, signature tempos).

> A separate `FACTORY_PRESETS` system predated this; it was removed once every
> genre card became its own preset — the card-preset path above is now the only
> preset mechanism.

## Composition layer

### Forms

Most genres have a bespoke 16-bar form builder (`buildOutrunForm`,
`buildNoirForm`, `buildCarpenterForm`, `buildAcidForm`, …). The EDM genres use
the shared 32-bar `buildArrangedForm` (`:1283`) instead — see
[Arrangement](#arrangement-engine).

### Harmony

`buildChordMap(padProg, totalBars)` (`:518`) splits the song into equal chord
spans and returns a per-bar `{ root, tones }`. **Bass, lead, and pad all read
the same chord map**, so they share one harmonic rhythm (this fixed an earlier
clash where the pad progression cycled every bar). Scales live in `SCALES`
(`:386`): aeolian, phrygian, dorian, pentatonic minor — all genres are rooted on
A.

### Melody — motif engine

Leads are not random walks. `MELODY_PROFILES` + `generateMelody` state a motif
and **develop** it (transpose / invert / ornament) along a contour
(arch / wave / rise), landing on harmony at phrase ends. Some genres use
specialised generators instead: `generateSustainedLead` (Noir/Acid, long held
Vangelis notes), `generateArpLead` (Carpenter's continuous "Halloween" arp), or
no lead at all (Dubstep).

### Bass — riff engine

`BASS_PROFILES` + `generateRiff` build a root-anchored one-bar ostinato with a
`bassFill` turnaround every fourth bar. Grooves range from Outrun's driving
8th-notes to Noir's sparse held notes to Carpenter's pure repetition
(`octaveProb` / `moveProb` = 0) to Dubstep's single drone.

### Drum patterns

Six named patterns are dispatched in the scheduler (`:1949`):

| Pattern | Used by | Feel |
|---------|---------|------|
| `driving` | Outrun | kick 1 & 3 (all-four when intense), snare 2 & 4, 8th hats |
| `sparse` | Noir | kick alternating bars, soft snare on 3, quiet hats |
| `carpenter` | Carpenter | kick on 1, snare on 3 (odd bars), **no hats** |
| `shuffle` | Dreamwave | 16th shuffled hats, snare on 3 |
| `fourfloor` | Techno/Prog House/Trance/Acid | four-on-the-floor kick, clap 2 & 4, closed hat on-beat + **open hat offbeat** |
| `halftime` | Dubstep | kick 1, ghost kick, snare on **3**, gapped hats, 1/32 fill |

### Arrangement engine

`buildArrangedForm` (`:1283`) + `arrPhase(arr, bar)` (`:1275`) give the EDM
genres a song arc. `arrPhase` classifies each bar as **build** (before the first
drop), **main** (after a drop), or **breakdown**.

The four EDM genres share an identical
`arrangement = { dropBars: [8, 24], breakdownStart: 16, breakdownEnd: 24 }` over
32 bars — two drops, one breakdown (bars 16–23). The arc is built from these
rules:

- **Bass plays only in `main` bars** (`:1290`) — it cuts out during build and
  breakdown and *slams back* at each drop.
- **Lead** phrase A lands two bars after the first drop; phrase B opens the
  breakdown.
- **Kick** is filtered out during the breakdown and for the single bar *before*
  each drop (`:1991`), so kick + bass + crash hit together on the drop.
- A **noise riser** sweeps 150 Hz → 6 kHz over the two bars into a drop, and a
  dedicated **crash** voice lands on the drop (`:2017`). Crash is a separate
  voice from the open-hat to avoid a schedule clash.

> Quirk: because the four-on-the-floor kick runs through the whole build, the
> build can measure *louder* (RMS) than the main section. The drop is felt as
> the **break-then-slam**, not as a level jump.

## Voicing layer

### Synth models

`buildSynthModel(name, poly)` (`:1418`) is a flat `if`-chain returning
`{ synth, character, characterAmount, type }`. Models in active use:

| Model | Flavour | Build |
|-------|---------|-------|
| `crystal` | DX7 FM bell | `PolySynth(FMSynth)` + Chorus |
| `vapor` | Juno-106 pad | 3× fat saw + heavy Chorus |
| `alkali` | MS-20 bass | 2× fat saw, Q≈5 + Distortion |
| `acid` | TB-303 | **always** MonoSynth, saw Q10 + portamento + Chebyshev |
| `ether` | Juno-106 lead | 3× fat saw + Chorus |
| `supersaw` | Anthem lead | 7× fat saw, wide spread + Chorus |

`stratos` (Jupiter-8 PWM bass) is **legacy** — no genre voicing references it,
and the `pwm` LFO target it depended on is force-baked to `off` — but it is still
selectable in the per-track Model dropdown.

> **`MDL_LABELS` (`:2192`) must have an entry for every model.** A missing label
> crashes the info panel (`padEnd` on `undefined`). Coverage is currently 1:1.

### Applying a voicing

`applyTrackParams(model, params, isPoly, lfoNodes)` (`:1561`) pushes a voicing
onto a live synth: rebuilds the envelope, filter `Q` (`resonance * 18`) and
filter envelope (`baseFreq = 50 + cutoff*4500`, `octaves = 1 + fenvAmount*5`),
detune, character (chorus/distortion wet), and LFO routing
(`off` / `pitch` / `filter` / `pwm` / `amp`). The poly path uses `synth.set()`
and **skips the filter for `crystal`** (FM has no filter); the mono path sets
properties directly.

## Audio graph

`buildAudioGraph()` (`:1661`) wires everything:

```
per-track bus:  tremGain → duckGain(sidechain) → volume ─┬─ dry ────────────────┐
                                                         └─ send → reverbSend ───┤
drum voices ──────────────────────────────────────────────────────────────────┤
                                                          delaySend → delay ─────┤  (delay feeds reverb)
                                          reverbSend → reverb ───────────────────┤
                                                                                 ▼
                              compressor → tapeSat → limiter(-3) → masterGain(0.8) → meter → Destination
```

- **Send buses:** `reverb` = Freeverb, `delay` = a feedback delay
  (`Tone.FeedbackDelay`); the delay output feeds *into* the reverb. Each per-track
  bus splits into a dry path (straight to the compressor) and a send path.
- **Drums bypass the send buses** entirely and route straight to the compressor.
- An FFT analyser taps the master for the spectrum display.

### Drum kits and the drum graph

`DRUM_KITS` (`:1655`) defines four kits — `linn`, `909`, `808`, `dubstep` —
each with `kick` / `snare` / `hat` parameters. But the drum voices are actually
built from the editable `drumParams` object (`:1802`), not the kit directly:

- **Tunable knobs** (kick decay/boom, snare whip/tone, hat decay) come from
  `drumParams`.
- **Structural fields** (kick `octaves`, snare `filterType`, voice volumes,
  gated-reverb decay) come from the selected `_kit` and are read **only at graph
  build time**.
- `openhat`, `riser`, and `crash` are hardcoded extra voices, not param-driven.
- The **gated-reverb chain** (`snareGateGain → snareGateReverb → …`) is always
  built but stays silent unless `snareGated` is set; `triggerGatedReverb`
  (`:1853`) fires a hard 0→1→0 envelope per snare hit. Only the `linn` and
  `dubstep` kits gate by default (plus the manual snare-gate toggle).

`loadDrumKit(name)` (`:2477`) copies a kit preset *into* `drumParams` (mapping
the kit's field names to the differently-named `drumParams` fields), then syncs
the UI and calls `applyDrumParams`.

## Apply-flow

Three paths override constructor defaults; they are **separate**:

- `applyAllToGraph(g)` (`:1812`) — pushes `masterState` (reverb/delay/sat/gain)
  and per-track `trackParams` (calling `applyTrackParams` per model), and applies
  mute state. **Does not touch drums.**
- `applyTrackParams(...)` (`:1561`) — the per-synth voicing push (above).
- `applyDrumParams(g)` (`:2466`) — live-mutates the tunable drum fields. The
  structural kit fields require a graph rebuild to take effect.

## The `.swmd` codec

`.swmd` is a Markdown serialisation of a composition (`swmdParse` `:1098`,
`swmdSerialize` `:1127`). A file is:

- **YAML frontmatter** — name, genre/algo, BPM, mode, pattern-mode, roots, mood,
  energy, default phase.
- One **`## Phase: <name>`** block per phase, each with `### Bass` / `### Lead` /
  `### Pad` / `### Drums`, and under each a `### Settings` block plus a
  `### Pattern` / `### Progression`.
- Patterns are ASCII **piano-roll tables**; drums are fenced **` ```swdrum `**
  blocks (kick/snare/hihat/open, 16 steps of `x` / `.`); pad is a degree
  progression table; FX is an `Effect | Param | Value` table.
- Instrument sections without a `## Phase` header collapse into an implicit
  `default` phase (backwards compat).

Files are written with a **`.md` extension** so Obsidian renders them; the
importer accepts both `.swmd` and `.md`. This is the bridge format to the planned
Obsidian plugin.

## Public API

`window.synthwaveSurfer` (`:2701`) is `Object.freeze`d and exposes exactly five
members:

| Member | Returns | Notes |
|--------|---------|-------|
| `setPhase(name)` | `boolean` | only active in fixed/SWMD mode; regenerates + notifies |
| `getPhases()` | `string[]` | phase names; `[]` in generative mode |
| `getCurrentPhase()` | `string \| null` | |
| `onPhaseChange(cb)` | unsubscribe fn | |
| `getMeta()` | object \| `null` | the imported SWMD's frontmatter |

The phase state machine is only live when `patternMode === 'fixed'` and a SWMD
has been imported — in generative mode `getPhases()` returns `[]` and `setPhase`
is inert, and there is no transport/beat-position callback yet. This API is the
hook for syncing external visuals (e.g. a Kuro animation) to the music.

## Presets and state

- **Card preset** — `ENGINE_VOICINGS[genre]` + `GENRE_SEED[genre]` (above).
- **User presets** — `captureFullState` / `applyFullState`, persisted to
  `localStorage` under `synthwave_surfer_presets_v1`, with Save / Export-JSON /
  Import-JSON / delete. *(Note: the live drum-knob tweaks are not part of the
  captured state.)*
- **State JSON** — a one-shot snapshot of the full current state, including the
  serialised SWMD.

## Determinism

Generation is driven by a **seeded PRNG**, so `seed + genre` fully determines
`currentState.form`. Re-generating with the same inputs reproduces the exact same
note events; changing the seed explores the same style.

## Tests

- **In-browser:** `?test=1` runs the in-file `tests` array (49 real tests) to the
  console.
- **Headless logic:** `node scripts/fullsuite.mjs` extracts the same tests plus
  the pure functions and runs them under Node → `real: 45 passed, 0 failed`
  (4 DOM tests skipped). `node scripts/check-syntax.mjs` is the syntax gate.
- **Headless audio:** Playwright + Chrome measures master-output RMS to confirm
  an engine actually produces sound. See [CONTRIBUTING.md](../CONTRIBUTING.md).

## Known limitations

- **Audio requires an HTTP origin** — Tone.js does not initialise on `file://`.
- **Legacy code** — `stratos` is a legacy synth model (still selectable in the
  Model dropdown, but used by no genre voicing).

WAV export renders offline in a dedicated `OfflineContext`: it swaps the global
context with `setContext()` so `buildAudioGraph()`/`scheduleAll()` (which use
`getDestination()`/`getTransport()`) build and schedule inside it, then restores
the live context. (Connecting to the frozen global `Tone.Destination` from inside
an offline render is the cross-context trap to avoid.)
