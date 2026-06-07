# Usage

A complete walkthrough of every control. For the *why* behind the design, see
[ARCHITECTURE.md](ARCHITECTURE.md).

## Getting started

From the cloned repo root, serve the app over HTTP (it stays silent on `file://`):

```bash
git clone https://codeberg.org/jkaindl/synthwave-surfer.git
cd synthwave-surfer
python3 -m http.server 8745
# → http://localhost:8745/synthwave_surfer.html
```

…or use the hosted build at
**[jkaindl.codeberg.page/synthwave-surfer](https://jkaindl.codeberg.page/synthwave-surfer/)**.

The shortest path to sound: **click a genre card → Generate → ▶ Play.** Audio
unlocks on your first click, per browser autoplay policy.

### No sound?

- Served over **`http://`** (not opened from `file://`)?
- Clicked once (a genre card or **▶ Play**) to unlock audio?
- Tracks **un-muted** and **Master Gain** up?
- A current evergreen browser?

## Console

The top row holds the composition inputs and transport:

| Control | What it does |
|---------|--------------|
| **Seed** | The random seed (default `1986`). Same seed + genre = same track. |
| **Scale** | Key/mode (dropdown order): A Minor Pentatonic, A Aeolian, A Phrygian, A Dorian. |
| **BPM** | Tempo. |
| **Random Seed** | Roll a new seed. |
| **Generate** | (Re)compose from the current seed / scale / BPM / genre. |
| **▶ Play / ⏹ Stop** | Transport. |

A status line confirms the last action (e.g. `✓ GENERATED · OUTRUN · SEED 1986`).

## Genre cards

The nine cards are one-click presets. Selecting one loads that genre's curated
seed, BPM, scale, drum kit, and full voicing, then regenerates:

| Genre | Character | BPM | Key |
|-------|-----------|----:|-----|
| **Outrun** | Driving 8th-note bass, pumping sidechain, bright leads | 120 | A minor pentatonic |
| **Noir** | Sparse *Blade Runner* atmosphere, sustained leads | 85 | A aeolian |
| **Dreamwave** | 16th arpeggio bass, shuffled hats, washed pads | 100 | A aeolian |
| **Carpenter** | Relentless phrygian ostinato, "Halloween" arp, no hats | 92 | A phrygian |
| **Techno** | Four-on-the-floor, offbeat open hats, two drops | 128 | A aeolian |
| **Prog House** | Four-on-the-floor, supersaw plucks, pumping pads | 126 | A aeolian |
| **Trance** | Euphoric supersaw anthem, full 32-bar arrangement | 138 | A aeolian |
| **Dubstep** | Half-time, beat-locked wobble bass | 140 | A phrygian |
| **Acid House** | TB-303 squelch line (slide + accent), hypnotic | 124 | A phrygian |

The four EDM genres (Techno, Prog House, Trance, Dubstep) generate a **32-bar
arrangement** with two drops and a breakdown; the rest are 16-bar loops.

## Determinism — the seed

A composition is fully determined by `seed + genre`. So:

- The **same** seed and genre always reproduce the **same** track.
- Changing the seed explores new compositions **in the same style**.
- A track is shareable as just two values (genre + seed).

To audition the style, keep the genre and hit **Random Seed → Generate**
repeatedly.

## Tracks & Loop

| Control | What it does |
|---------|--------------|
| **Bass / Lead / Pad / Drums** | Per-track mute toggles. |
| **Loop** | Loop the form vs. play once. |
| **Natural / Strict** | Harmonic mode — how tightly parts are bound to the chord map. |
| **Generative / Fixed** | Pattern source — algorithmic generation vs. a fixed (imported `.swmd`) pattern. The engine improvements apply in **Generative** mode. |

When a `.swmd` with more than one phase is loaded (Fixed mode), a row of
**phase pills** appears here; click to switch phase.

## Instrument panels

Each of bass / lead / pad has a live panel:

- **Model** — the synth voice (see [synth models](ARCHITECTURE.md#synth-models)).
- **LFO** — target (off / pitch / filter / amp), rate, depth.
- **ADSR** — attack / decay / sustain / release.
- **Filter** — cutoff, resonance, envelope amount.
- **FX send** — how much goes to the reverb/delay buses.

Edits apply to the playing audio immediately — no regenerate needed.

## Drums · Kit & Voicing

- **Kit** — `LINN` (gated LinnDrum feel), `909` (snappy), `808` (deep boom),
  `DUBSTEP` (huge, reverberant).
- **Live knobs** — Kick Decay (`0.1–1.0`), Kick Boom (`0.02–0.2`), Snare Whip
  (`0.05–0.5`), Snare Tone (`600–4000` Hz), Hat Decay (`0.02–0.2`).
- **Snare Gate** — toggles the gated-reverb tail on the snare (on by default for
  the `linn` and `dubstep` kits).

The knobs change the drums live. Switching the **kit** also resets the knobs to
that kit's character; the structural side (snare filter type, voice levels) takes
full effect on the next **Generate**.

## Master · FX & Bus

Eight sliders shape the whole mix: **Reverb Size**, **Reverb Wet**, **Delay
Time**, **Delay FB**, **Delay Wet**, **Sidechain** (pump depth),
**Tape Saturation**, and **Master Gain**.

## Meter & Piano Roll

A stereo VU meter plus a spectrum display show the live output; the piano-roll
canvas visualises the generated notes for the current form.

## Presets

- **Save** — name the current state and store it (in `localStorage`).
- **Load / Delete** — click a saved chip to load it; delete with confirmation.
- **Export / Import JSON** — move your presets between browsers or back them up.

> User presets capture seed, BPM, scale, genre, track params, master state, and
> mutes. They do **not** currently round-trip the live drum-knob tweaks.

## Export

| Format | Contents |
|--------|----------|
| **WAV** | The current composition rendered to audio (offline render — includes your mutes and current sound). |
| **MIDI** | All tracks as a standard MIDI file. |
| **`.swmd`** | The composition as Obsidian-compatible Markdown — saved as `<name>.md` (the `.swmd` format with a `.md` extension so Obsidian renders it). |
| **State JSON** | A full snapshot of the current state, including the serialised SWMD. |

## Importing `.swmd`

Use the import control in the Export panel and pick a `.swmd` or `.md` file. The
app reads the frontmatter (BPM / mode / genre), applies the chosen phase's track
and FX settings, switches to **Fixed** pattern mode, and regenerates. With more
than one phase, use the phase pills (in *Tracks & Loop*) to move between them.

## External control (API)

For driving the app from outside (e.g. syncing an animation), a small frozen API
is on `window.synthwaveSurfer`:

```js
synthwaveSurfer.getPhases();          // ['intro', 'drop', …]  (or [] in generative mode)
synthwaveSurfer.setPhase('drop');     // switch phase (fixed/SWMD mode only)
synthwaveSurfer.getCurrentPhase();    // 'drop' | null
const off = synthwaveSurfer.onPhaseChange(p => console.log('now', p));
synthwaveSurfer.getMeta();            // imported SWMD frontmatter | null
```

> The phase API only does anything in **Fixed** mode with a loaded `.swmd`; in
> generative mode `getPhases()` returns `[]` and `setPhase` is inert. There is
> currently no transport/beat-position hook for generative tracks (roadmap).

See [ARCHITECTURE.md](ARCHITECTURE.md#public-api) for the full contract.
