---
name: Synthwave Surfer – Projektstand
description: Single-file Musikgenerator – Vision, Roadmap, aktueller Stand, nächster Schritt
type: project
---

**Synthwave Surfer** ist ein single-file HTML/JS Musikgenerator unter `/Users/Shared/code/synthwave-surfer/synthwave_surfer.html`, gebaut mit Tone.js 14. Git-Repo (Branch `main`).

**Echte Vision (Brainstorming-Session 2026-05-14):**
Synthwave Surfer ist die Audio-Schicht des **Kuro-Universums**: Theme + Companion-Plugin + Synthwave Surfer als zusammengehöriges Obsidian-Ökosystem. `.swmd` ist die didaktische Markdown-Brücke zu Obsidian. Original-Use-Case: Carpenter-Soundtracks für 3D-Animationen (insbesondere Kuro-Screensaver). Ziel: Standalone Obsidian-Plugin, optional gekoppelt mit Kuro Companion via Plugin-Events.

**Was bisher in der HTML implementiert ist:**
- Harmonic Binding: `buildChordMap()`, Bass Root-Lock, `snapDegree()` für Lead
- Natural/Strict-Toggle im UI
- 6 Factory-Presets (generativ, ohne fixedSwmd noch)
- Preview-Server-Config unter `.claude/launch.json`

**Doku-Foundation (committed):**
- `docs/superpowers/specs/2026-05-14-synthwave-foundations-design.md` — Phase-1-Spec, 13 Sections, inkl. Roadmap (Phase 1-4)
- `docs/superpowers/plans/2026-05-14-synthwave-foundations-phase1.md` — 28-Task-Implementierungsplan (TDD-style, Inline-Test-Harness via `?test=1`)
- `docs/superpowers/plans/2026-05-14-swmd-codec-fixed-patterns.md` — alter Single-Phase-Plan (superseded vom Phase-1-Plan, NICHT ausführen)

**Nächster Schritt (Phase 1):** Den Phase-1-Plan ausführen — am besten über Cowork oder Dispatch in einer eigenen Session, weil das Repo direkt im Vault entwickelt werden soll. Plan-Datei ist self-contained (alle Code-Snippets vollständig, keine Placeholder).

**Roadmap nach Phase 1:**
- Phase 2: Plugin-Migration nach `<vault>/.obsidian/plugins/synthwave-surfer/` (TS, Obsidian View, swdrum-Codeblock-Renderer)
- Phase 3: Song-Form-Engine + Mood-Macros (löst Length/Control vollständig)
- Phase 4: Kuro-Integration via Plugin-Events + Marketplace-Release

**Why:** Generativer Ansatz klingt random; curated Multi-Phase-Presets + externe API für Animation-Sync sind das eigentliche Fundament für die größere Vision.
**How to apply:** Vor Weiterarbeit Spec UND Phase-1-Plan lesen, dann Cowork-Session aufsetzen oder Dispatch losschicken. Tests laufen über `synthwave_surfer.html?test=1`.
