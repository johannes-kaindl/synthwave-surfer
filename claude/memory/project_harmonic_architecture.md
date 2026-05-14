---
name: Synthwave Surfer – Harmonische Architektur & Probleme
description: Kernproblem Dissonanz, Harmonic Binding, Pad/Bass Key-Clash, Lösung via Fixed Presets
type: project
---

**Kernproblem:** Generativer Random-Walk klingt mit allen Spuren dissonant, weil Tracks unabhängig erzeugt werden.

**Harmonischer Key-Clash (bekanntes Problem, noch nicht gefixt):**
- Pad: C-Aeolian, root=60 (C4), Scale=AEOLIAN — fix im Code
- Bass/Lead: A + user-selected Scale (z.B. A Pentatonic Minor) — user-wählbar
- Clash: C-Minor vs. A-Pentatonic teilen nur 3 von 5-7 Noten; Eb vs. E ist hörbare Dissonanz

**Was bereits implementiert ist:**
- `buildChordMap(padProg, totalBars)` — erzeugt Akkord-Map pro Bar aus padProg
- Bass Root-Lock in Form-Buildern — Bass-Riff startet auf Akkord-Root jedes Bars
- `snapDegree()` — Lead wird zu Akkordtönen hingezogen (Natural=50%, Strict=immer)
- Natural/Strict Toggle im UI

**Geplante Lösung (Fixed Presets):**
Alle curated Factory Presets nutzen aeolian mode und bass-root=48 (C3), lead-root=60 (C4) — dann spielen alle Tracks in C-Moll und harmonieren mit dem Pad. Kodiert im `.swmd`-Format.

**Why:** Generativer Ansatz allein reicht nicht für konsistent guten Klang.
**How to apply:** Bei Fixed-Pattern-Implementierung sicherstellen dass bass-root und lead-root im swmd-Frontmatter gesetzt werden und `scheduleAll()` diese übernimmt statt der hardcodierten Werte.
