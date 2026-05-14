---
name: Synthwave Surfer – Projektstand
description: Single-file Musikgenerator – aktueller Stand, nächste Schritte, offene Plan-Datei
type: project
---

**Synthwave Surfer** ist ein single-file HTML/JS Musikgenerator unter `/Users/Shared/code/synthwave-surfer/synthwave_surfer.html`, gebaut mit Tone.js 14.

**Was in dieser Session implementiert wurde:**
- Harmonic Binding: `buildChordMap()`, Bass Root-Lock in Form-Buildern, `snapDegree()` für Lead-Generatoren
- Natural/Strict-Toggle im UI
- Preview-Server-Config unter `.claude/launch.json`

**Nächster Schritt:** `.swmd`-Codec + curated Preset-Patterns implementieren.
Plan liegt unter `docs/superpowers/plans/2026-05-14-swmd-codec-fixed-patterns.md` — 12 Tasks vollständig ausgearbeitet.

**Why:** Generativer Ansatz klingt oft dissonant; curated Patterns pro Preset sind der eigentliche Fix.
**How to apply:** Bei Weiterarbeit zuerst den Plan lesen und inline oder per Subagent ausführen.
