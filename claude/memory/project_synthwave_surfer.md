---
name: Synthwave Surfer – Projektstand
description: Single-file Musikgenerator – Vision, Roadmap, aktueller Stand, nächster Schritt
type: project
---

**Synthwave Surfer** ist ein single-file HTML/JS Musikgenerator unter `/Users/Shared/code/synthwave-surfer/synthwave_surfer.html`, gebaut mit Tone.js 14. Git-Repo (Branch `main`).

**Echte Vision (Brainstorming-Session 2026-05-14):**
Synthwave Surfer ist die Audio-Schicht des **Kuro-Universums**: Theme + Companion-Plugin + Synthwave Surfer als zusammengehöriges Obsidian-Ökosystem. `.swmd` ist die didaktische Markdown-Brücke zu Obsidian. Original-Use-Case: Carpenter-Soundtracks für 3D-Animationen (insbesondere Kuro-Screensaver). Ziel: Standalone Obsidian-Plugin, optional gekoppelt mit Kuro Companion via Plugin-Events.

**Phase 1 COMPLETE — Tag `ss-post-burst-c-presets-wav` gesetzt (2026-05-14)**

**Was in Phase 1 implementiert wurde (28 Tasks, 3 Bursts):**
- SWMD Codec: Parser + Serializer für `.swmd`-Format (Multi-Phase, Drum-Grid, FX-Bus)
- Phase Engine: `setPhase()`, `getPhases()`, `getCurrentPhase()`, `onPhaseChange()` via `window.synthwaveSurfer` API
- UI: Pattern-Toggle (Generativ/Fixed), Phase-Selector-Pills, SWMD Import/Export, State-JSON-Export, WAV-Export
- 6 Multi-Phase Factory-Presets mit `fixedSwmd`: Miami Nights (2 Phasen), Highway Cruise (3), Blade Runner Rain (3), Carpenter Synth (2), Mall Bliss (2), VHS Sunset (2)
- Fix: `buildFormFromSwmd` optional-chaining für fehlende Phase-Properties
- Fix: WAV-Export nutzt Offline-Transport (nicht globalen Live-Transport)
- Inline-Test-Harness: `synthwave_surfer.html?test=1`, erwartet 28 passed / 0 failed

**Doku (committed):**
- `docs/superpowers/specs/2026-05-14-synthwave-foundations-design.md` — Phase-1-Spec
- `docs/superpowers/plans/2026-05-14-synthwave-foundations-phase1.md` — 28-Task-Plan (vollständig abgearbeitet)
- `docs/superpowers/plans/2026-05-14-swmd-codec-fixed-patterns.md` — superseded, NICHT ausführen

**Bekannte Einschränkung:** Tone.js lädt nicht auf `file://`-Origin (CORS). Audio nur via HTTP-Server. Phase-2-Plugin-Migration löst das.

**Phase 1.5 — STAND 2026-06-03 (große Session, alles committet & ohrgeprüft):** Generative Musik-Qualität massiv ausgebaut.
- Sound-Fundament: Master entquetscht (Compressor/Limiter), Kick-Sub-Punch, Swing spürbar, Hi-Hat hörbar.
- **Motiv-Melodie-Engine** (`MELODY_PROFILES`, makeMotif, Entwicklungs-Operatoren, pickContour, landOnHarmony, generateMelody) — ersetzt Random-Walk-Leads durch Motiv+Entwicklung. Spec+Plan in `docs/superpowers/`. Headless-Verify-Pattern: pure Funktionen via Node aus HTML extrahieren (Sentinels `// <<MELODY_ENGINE_START/END>>`).
- **Bass-Riff-Engine** (`BASS_PROFILES`, generateRiff = root-anchored 1-Takt-Ostinato, bassFill = Turnaround alle 4 Takte).
- **Genre-Voicing** (`GENRE_REF`/`GENRE_BASS` + applyGenreVoicing im Algo-Card-Handler) — Instrumente+FX folgen dem Genre beim Algo-Wechsel; Referenzen Miami/Carpenter/VHS.
- **Stratos retired** überall → `alkali` (Default+Presets); Filter-Bugs gefixt: Pads waren `PolySynth(Tone.Synth)` ohne Filter → jetzt `PolySynth(Tone.MonoSynth)`; Filter-LFO sweept jetzt um den Cutoff statt fix 200–4000 Hz.
- **WICHTIG:** Neue Engines wirken nur im **Generativ-Modus** (⚙-Toggle auf „Generativ"). Die 6 Presets sind weiter eingefrorenes `fixedSwmd` → erben die Engine-Verbesserungen (noch) nicht.

**Neufassung (Zielbild A, settings-first) — DONE & nach `main` gemerged (2026-06-04):**
- **4 Engines** (`ALGORITHMS`): outrun, noir (= atmosphärisches Blade-Runner-Noir), dreamwave, **carpenter (NEU: eigene 4/4-Horror-Ostinato-Engine, phrygian, relentless 8tel-Bass ohne Fill, minimal Drums)**. Carpenter ist eine eigene Engine, nicht nur Noir-Voicing.
- **`ENGINE_VOICINGS` + `mergeVoicing`**: kanonische Default-Voicing pro Engine; Preset = `{ engine, seed, bpm?, mode?, tag, voicing }` mit SPARSE Deltas → erbt Engine-/Voicing-Verbesserungen automatisch. KEIN `fixedSwmd` mehr; `applyPreset` ersetzt `applyFactoryPreset`; `GENRE_REF` retired.
- Verifikation: 41/41 In-File-Tests headless grün (Sentinel-Slice-Extraktion + Node, `.remember/tmp/headless.mjs`+`fullsuite.mjs`). Seed-Kuratierung zurückgestellt (später gebündelt über alle Genres). Spec/Plan: `docs/superpowers/specs|plans/2026-06-04-neufassung-settings-first*`.

**AKTUELLE RICHTUNG — Genre-Expansion via Fähigkeits-Schichten (ratifiziert 2026-06-04):**
Ziel: viele Genres generativ-authentisch (Acid House, Dubstep, Prog House, Trance, Techno, Chillstep, Lo-fi, DnB … bis Bach-Fugen). 10-Genre-DNA web-recherchiert. Statt Genre-für-Genre → **Fähigkeits-Schichten**, jede schaltet mehrere Genres frei:
- **Layer A** (billig, hoher Fan-out, IN ARBEIT auf Branch `genre-layer-a`): Half-Time-Drum-Grid, `arp`-Aktivierung (Feld existiert, wird nie gelesen!), Per-Track-Distortion + Supersaw-Voice, **tempo-synchroner LFO (Wobble)**. → Techno, Prog House, Trance, Dubstep, Chillstep.
  - **FORTSCHRITT (2026-06-05):** 7 Engines live — **Techno** (Open-Hat-Voice NEU + `'fourfloor'`-Pattern: four-on-floor + Offbeat-Open-Hat), **Prog House**, **Trance** (Config-Genres auf Technos Maschinerie). `arpExpand` + `generateArpLead` (Carpenter) + `generateSustainedLead` (Noir-Vangelis) gebaut → je Engine eigene Pattern-Sprache. 4 Ohr-Runden Tuning der Basis-Engines (Pads gezähmt: Pad-Harmonie-Bug gefixt [zyklte padProg pro Takt statt buildChordMap], sporadisch via padStride; VHS Sunset entfernt → 5 Presets).
  - **HEADLESS-AUDIO-HARNESS (NEU, wichtig):** Playwright + Chrome (`~/.npm/_npx/.../node_modules`, Browser gecacht) → `.remember/tmp/verify_*.cjs`: lädt App, fängt Konsolen-Fehler, misst Output-RMS via Analyser/Offline. Damit kann Claude „macht es Klang / welche Engine ist stumm" SELBST prüfen (nicht nur User-Ohr). Lehre: cutoff ≤0.04 = ~140Hz-Lowpass kann Bass stummschalten.
  - **PARKED BUG:** WAV-Export/Offline-Render kaputt (`Tone.Offline` + `Tone.Destination` Cross-Context, Zeile ~1471) — nur Export, nicht Live-Play.
  - **9 ENGINES (2026-06-05):** + **Dubstep** (A4 tempo-synchroner Wobble: `scheduleAll` lockt Bass-Filter-LFO auf `(bpm/60)*wobbleRate`; `'halftime'`-Drums Snare auf Beat 3) + **Acid House** (B1 303: Bass-Callback wendet per-Step Slide=Portamento + Accent=Velocity+Filter an, wenn `line[].slide/accent` gesetzt; `generateAcidLine` + `buildAcidForm`).

  - **PUBLISHED & MERGED 2026-06-06:** `genre-layer-a` per Fast-Forward in `main` gemerged. Repo öffentlich: **Codeberg** `codeberg.org/jkaindl/synthwave-surfer` (remote `origin`, SSH) + **GitHub-Mirror** `github.com/johannes-kaindl/synthwave-surfer` (remote `github`, SSH). **Live-Demo** `https://jkaindl.codeberg.page/synthwave-surfer/` (Codeberg Pages via `pages`-Branch + `index.html`-Redirect). Release **v0.1.0** auf beiden Plattformen. Umfassende EN-Doku im Hausstil (README + docs/ARCHITECTURE + docs/USAGE + CONTRIBUTING + CHANGELOG + SECURITY + LICENSING + CLA + LICENSE + .editorconfig), AGPL-3.0 dual-licensed, Reader-getestet (3 Agents). Test-Scripts committet: `scripts/fullsuite.mjs` (45/0) + `scripts/check-syntax.mjs`. — *Davor war der Endstand: Branch `genre-layer-a`, 18 Commits vor `main`, Suite 45/45:*
    - **Genre-Authentizitäts-AUDIT** (Workflow, `docs/superpowers/research/2026-06-06-genre-authenticity-audit.json`): die 5 EDM-Genres impl-vs-DNA verglichen → Scores 38–52/100 (Config-Shortcut zu flach). **Lehre des Users: Genre-Treue strukturell gegen die DNA verifizieren, nicht raten.** Audit-getriebene Fixes:
      - **Supersaw-Modell** gebaut (`buildSynthModel 'supersaw'`, 7 fatsawtooth) → Prog House + Trance Leads (war fälschlich `crystal` FM-Bell). **Acid** Bass auf das schon gebaute `'acid'`-Modell (echtes 303) + Accent öffnet Filter (`filterEnvelope.octaves`). Bug gefangen+gefixt: `MDL_LABELS` fehlte `supersaw` → `padEnd`-Crash (+ defensiver Fallback).
    - **Layer C — DROP/Arrangement-Motor:** `buildDropForm` (v1) → **`buildArrangedForm` (32-Takt, mehrteilig):** Build(0–7)→DROP1(8)→Main→Breakdown(16–23)→DROP2(24)→Main. `arrangement: {dropBars:[8,24], breakdownStart:16, breakdownEnd:24}`. Bass nur in `arrPhase==='main'`; **Riser-Voice** (Noise-Sweep) + **Crash-Voice** vor jedem Drop; Kick läuft Build+Main, raus im Breakdown + 1 Takt vor jedem Drop (Pre-Drop-Break→Slam). Lead nach Drop1 + im Breakdown. Pad/Drum-Loops nutzen jetzt `algo.totalBars` (war hart 16). Genres: techno/proghouse/trance/dubstep. **Quirk:** Build ist RMS-mäßig lauter als Main (durchlaufender Four-on-Floor-Kick); Drop-*Gefühl* = Break+Slam, nicht Pegel.
    - **DRUM-KIT-SYSTEM (= 1. Hälfte User-Drum-Forderung):** `DRUM_KITS` (linn=gated Synthwave / 909=snappy Whip ungated / 808=Boom / dubstep=riesige Whip+Reverb). `buildAudioGraph` baut Drums aus `drumParams`; Gated-Reverb nur bei `snareGated`. Per-Genre: techno/proghouse/trance/acid→909, dubstep→dubstep, Basis→linn.
    - **DRUM-TWEAK-UI (= 2. Hälfte):** Panel „Drums · Kit & Voicing"; `drumParams`-State + `applyDrumParams(g)` LIVE; `buildDrumPanel`/`syncDrumUI`/`loadDrumKit`. Kit-Dropdown + Live-Knöpfe (Kick Decay/Boom, Snare Whip/Tone, Hat Decay) + Snare-Gate-Toggle. Genre-Klick + Boot rufen `loadDrumKit`.
    - **Factory-Presets KOLLABIERT:** kein separater Factory-Bereich mehr — jede Genre-Card *ist* ihr Preset (kuratierter `GENRE_SEED`). Factory-Panel raus, Boot lädt Outrun. `FACTORY_PRESETS`/`applyPreset`/`renderFactoryRow` als **toter Code** dringelassen (später aufräumen). User-Presets (Save) bleiben.
  - **NÄCHSTES (offen, User-Reihenfolge):** Feintuning (rollende Offbeat-Bässe Techno/Prog/Trance, Dubstep Sub-Layer + per-Takt-Wobble-Automation, Detroit-Stab, Drop-Timing) — alles im Audit-JSON konkret. Dann Lo-fi/Chillstep/DnB + Tier 3 Bach. WAV-Export-Bug (parked). **Public-facing In-App-Text in v0.1.1 GEFIXT** (Epigraph „Three algorithms"→„Nine engines", Footer „Outrun×Noir×Dreamwave"→„Nine genre engines", Header-Badge „v1.0 · Factory Presets"→akkurate Feature-Liste; Hero-Screenshot neu). Release v0.1.1 auf beiden Plattformen. **Tote-Code-Cleanup ERLEDIGT:** FACTORY_PRESETS/applyPreset/renderFactoryRow + zugehöriges CSS entfernt (−70 Zeilen; `scripts/fullsuite.mjs` Slice D mit entfernt; Suite 45/0, Runtime-Smoke 0 Fehler). Liegt in CHANGELOG `[Unreleased]` (bewusst noch kein eigener Release, da rein intern/kein Verhaltensänderung).
  - **HEADLESS-AUDIO-HARNESS:** Playwright via `NODE_PATH=~/.npm/_npx/e41f203b7505f1fb/node_modules node .remember/tmp/verify_*.cjs` (Chrome gecacht): lädt App, fängt Konsolen-Fehler, misst Output-RMS (Analyser/Offline) → Claude prüft „macht Klang / stumm / 0 Fehler" selbst. `fullsuite.mjs` = In-File-Tests headless. **Tone.js-Lehren:** cutoff≤0.04 ≈ 140Hz-Lowpass schaltet Bass stumm; neue Track-Modelle brauchen `MDL_LABELS`-Eintrag; Crash darf nicht die Open-Hat-Voice teilen (Schedule-Clash); riser via `makePart` (transport-synced, aufgeräumt).
- **Layer B**: 303-Mono-Bass (Portamento-Slide + Accent → Acid House), Extended-Jazz-Voicing (→ Lo-fi/DnB), Per-Track-Swing+Humanize, Lo-fi-Textur (Crackle/Bitcrush).
- **Layer C**: Arrangement/Builds/Drops (= das aufgeschobene „Song-Bogen"), Breakbeat-Sampling.
- **Tier 3 (eigener Track)**: Bach = polyphone Kontrapunkt-Engine + funktionale Stimmführung. Ehrlich: schwerstes generatives Problem, kein Note-für-Note-Bach. Motiv-Operatoren (invert/augment/diminish) sind ein Seed.
- **Roadmap-Doc**: `docs/superpowers/research/2026-06-04-genre-expansion-roadmap.md` (+ `2026-06-04-genre-dna.json`).

**Roadmap (übergeordnet):**
- Phase 1.5 (Sound/generative Qualität) — erledigt. Neufassung (settings-first) — erledigt & gemerged.
- **Genre-Expansion (Layer A→B→C, Bach als Tier 3)** — AKTUELL.
- Phase 2: Plugin-Migration (TS, Obsidian View, swdrum-Renderer). Phase 4: Kuro-Integration + Marketplace.

**Why:** Phase 1 legt das Fundament: SWMD als Brücken-Format, Multi-Phase-Presets als kuratierter Einstieg, externe API für Animation-Sync. Phase 1.5 macht den Sound gut bevor Plugin-Migration den Iteration-Speed verlangsamt.
**How to apply:** Phase 1.5 Cowork-Session mit Hörtest-Fokus starten. Kein neuer Plan-28-Tasks-Zyklus — direktes Tinkering + Commit per Sound-Fix.
