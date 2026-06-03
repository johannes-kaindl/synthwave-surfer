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

**Vereinbarter nächster großer Schritt — die NEUFASSUNG (Zielbild A, settings-first), eigener Brainstorm→Spec→Plan-Zyklus in frischer Session:**
- Verdrahtungs-Fakt (verifiziert): 3 Algo-Cards = Genre-Engines (`ALGORITHMS`, Komposition, KEINE Instrumente); 6 Presets = kuratierte Stücke (`algoName` + Voicing + frozen `fixedSwmd`). Nicht redundant, zwei Ebenen.
- Ziel: Genre = Engine + Default-Voicing (existiert jetzt); Preset = benannter Seed im Genre (+ Voicing-Deltas), KEIN fixedSwmd mehr → erbt Algo-Verbesserungen automatisch.
- Blade Runner ≠ Carpenter als zwei eigene Voicings in der Noir-Familie fassen (Unterschied ist Voicing+FX, nicht Komposition). Nutzer denkt evtl. an 4+ „Genres" = feinere Voicing-Granularität.
- Touch: Codec, alle 6 Presets, Test-Harness. Erst wenn mehr Algo-Dimensionen (Harmonie, Drum-Dynamik) tragen.

**Roadmap:**
- **Phase 1.5:** Sound + generative Qualität — Kern erledigt (s.o.); offen: Neufassung + restliche Musik-Dimensionen (Harmonie, Drum-Dynamik, Song-Bogen)
- **Neufassung (Zielbild A, settings-first):** Genre=Engine+Voicing, Preset=Seed, Blade Runner vs Carpenter als eigene Voicings — NÄCHSTER großer Schritt
- Phase 2: Plugin-Migration (TS, Obsidian View, swdrum-Codeblock-Renderer)
- Phase 3: Song-Form-Engine + Mood-Macros
- Phase 4: Kuro-Integration via Plugin-Events + Marketplace-Release

**Why:** Phase 1 legt das Fundament: SWMD als Brücken-Format, Multi-Phase-Presets als kuratierter Einstieg, externe API für Animation-Sync. Phase 1.5 macht den Sound gut bevor Plugin-Migration den Iteration-Speed verlangsamt.
**How to apply:** Phase 1.5 Cowork-Session mit Hörtest-Fokus starten. Kein neuer Plan-28-Tasks-Zyklus — direktes Tinkering + Commit per Sound-Fix.
