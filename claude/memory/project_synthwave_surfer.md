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

**Nächster Schritt (Phase 1.5 — Sound-Quality-Iteration):** Sound-Output auf 4 Achsen mies (Algo-Tuning, Synth-Klang-Color, Mix, Preset-Distinktion). Iteration-Cycle in single-file-HTML schneller als Plugin-Build-Cycle — vermeidet doppelte Arbeit auf neuer Code-Architektur. Phase 1.5 VOR Phase 2 Plugin-Migration. Basis: `ss-post-burst-c-presets-wav`.

**Roadmap:**
- **Phase 1.5:** Sound-Quality-Iteration (Algo-Tuning, Synth-Color, Mix, Preset-Distinktion) — nächste Cowork-Session
- Phase 2: Plugin-Migration (TS, Obsidian View, swdrum-Codeblock-Renderer) — NACH Phase 1.5
- Phase 3: Song-Form-Engine + Mood-Macros
- Phase 4: Kuro-Integration via Plugin-Events + Marketplace-Release

**Why:** Phase 1 legt das Fundament: SWMD als Brücken-Format, Multi-Phase-Presets als kuratierter Einstieg, externe API für Animation-Sync. Phase 1.5 macht den Sound gut bevor Plugin-Migration den Iteration-Speed verlangsamt.
**How to apply:** Phase 1.5 Cowork-Session mit Hörtest-Fokus starten. Kein neuer Plan-28-Tasks-Zyklus — direktes Tinkering + Commit per Sound-Fix.
