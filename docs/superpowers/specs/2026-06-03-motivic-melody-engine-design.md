# Spec: Motiv-Entwicklungs-Engine für Lead-Melodien

- **Datum:** 2026-06-03
- **Status:** Design freigegeben, bereit für Implementierungsplan
- **Phase:** 1.5 → generative Musik-Qualität (Dimension 1: Melodie-Phrasierung)
- **Datei:** `synthwave_surfer.html` (single-file, Vanilla JS, Tone.js 14)

## Kontext & Ziel

Phase 1 erzeugte technisch korrekte, aber musikalisch schwache Leads: die `generate{Outrun,Noir,Dreamwave}Lead`-Funktionen sind **Random-Walks** (Note für Note zufällig ±1/±2/±3 mit zufälligen Pausen). Das Ergebnis wandert, hat keine Motive, keine Wiederholung, keinen Phrasen-Bogen — es klingt nicht *komponiert*.

**Ziel:** Eine Motiv-Entwicklungs-Engine, die pro Phrase ein kurzes Motiv erzeugt und es nach einer Phrasen-Grammatik entwickelt — geformt durch Kontur und Harmonie. Sie soll *einprägsame* (Motiv-Kohärenz) UND *vielfältige* (Entwicklung + Seed-Variation) Melodien liefern und damit die „Schönheit und Bandbreite generativer Musik" zeigen.

**Ziel-Architektur (bestätigt):** Presets werden langfristig zu generativen Seeds (`algo + seed + params`, kein `fixedSwmd`), sodass Algo-Verbesserungen automatisch in alle Presets fließen und sie musikalisch distinkter machen. **Reihenfolge:** zuerst Algo schön machen (dieser Spec), Presets bleiben als Sicherheitsnetz eingefroren; Preset→Seed-Umstellung ist ein separater Folgeschritt, sobald die Engine überzeugt.

## Non-Goals (bewusst NICHT in diesem Spec)

- Bass-Riffs / Ostinati (nächste Dimension; Engine soll dafür wiederverwendbar sein, aber hier nicht angefasst).
- Harmonie-/Akkord-Progressionen (`padProg`, `buildChordMap`) bleiben unverändert.
- Song-Bogen / Arrangement über Phasen hinweg.
- Preset→Seed-Umstellung und Re-Roll-Button (Folgeschritt).
- Instrument-/Timbre-Arbeit (spätere Phase-1.5-Dimension).
- Groove/Velocity/Humanization (eigene Dimension).

## Ansatz: Motiv & Entwicklung

Reine, deterministische Funktion: `rng + Genre-Profil + chordMap → Melodie-Events`. Output-Format **unverändert** gegenüber heute, daher Drop-in:

```
{ degree: number, duration: number }   // degree = Skalenstufe (0-basiert), duration in 16teln
{ rest: true, duration: number }
```

### Komponenten

Jede Komponente ist klein, hat einen Zweck und ist isoliert testbar.

**1. `MELODY_PROFILES` (Daten)** — pro Genre ein Parameter-Set:

```
MELODY_PROFILES = {
  outrun: {
    motifLen: [3, 5],                 // min/max Töne im Keim-Motiv
    rhythmCells: [[4,4,4,4],[4,2,2,4],[2,2,4,8],[4,4,8],[2,2,2,2,8]],  // Dauern in 16teln
    stepBias: 0.7,                    // P(Schritt) vs. Sprung beim Motiv-Bau
    leapSizes: [2, 3, 4],             // mögliche Sprung-Weiten (Skalenstufen)
    restDensity: 0.12,                // ungefährer Pausen-Anteil der Phrase
    opWeights: { repeat:0.25, sequence:0.30, invert:0.10, varyRhythm:0.20, fragment:0.10, ornament:0.05 },
    contours: ['arch','wave','rise'],
    register: [0, 9],                 // erlaubte Skalenstufen-Spanne
    grammar: ['A','A2','B','A3'],     // Phrasen-Slots (4 Slots für 4 Takte)
    startDegree: 4,
  },
  noir: {
    motifLen: [2, 3], rhythmCells: [[8,8],[12,4],[8,4,4]],
    stepBias: 0.85, leapSizes: [2, 4], restDensity: 0.30,
    opWeights: { repeat:0.45, sequence:0.20, invert:0.05, varyRhythm:0.15, fragment:0.10, ornament:0.05 },
    contours: ['fall','arch'], register: [0, 7], grammar: ['A','A','A2','B'], startDegree: 2,
  },
  dreamwave: {
    motifLen: [3, 5], rhythmCells: [[2,2,4,2,6],[4,2,2,4,4],[2,2,2,2,8],[4,4,4,4]],
    stepBias: 0.75, leapSizes: [2, 3], restDensity: 0.15,
    opWeights: { repeat:0.20, sequence:0.25, invert:0.10, varyRhythm:0.25, fragment:0.10, ornament:0.10 },
    contours: ['wave','arch','rise'], register: [0, 9], grammar: ['A','A2','B','A2'], startDegree: 2,
  },
}
```

(Werte sind Startpunkte für die Hörtest-Iteration, nicht final.)

**2. `makeMotif(rng, scaleLen, profile, chordTones) → motif`**
Baut das Keim-Motiv als Array relativer Events `{ deg, dur }` (deg relativ zur Motiv-Wurzel, 0 = Wurzel):
- Rhythmus: eine `rhythmCells`-Zelle wählen (jede Zelle hat per Konstruktion eine Tonanzahl innerhalb `motifLen`); die Zellenlänge bestimmt die Tonanzahl.
- Tonhöhen: Start auf 0 (= Akkordton); jeder Folgeton per `stepBias` Schritt (±1) oder Sprung (aus `leapSizes`); Richtung gewichtet zufällig.

**3. Entwicklungs-Operatoren** (pure `motif → motif'`):
- `repeat(m)` — exakt.
- `sequence(m, iv)` — alle `deg += iv` (diatonische Transposition).
- `invert(m, axis)` — `deg = axis - (deg - axis)` (Intervall-Spiegelung).
- `varyRhythm(m, rng, profile)` — Tonhöhen behalten, andere `rhythmCells`-Zelle unterlegen (mit Längen-Angleich).
- `fragment(m, rng)` — Teilsegment des Motivs (Fragmentierung).
- `ornament(m, rng, scaleLen)` — Durchgangs-/Wechseltöne zwischen Motiv-Tönen einfügen.

**4. `pickContour(shape, nSlots) → offsets[]`**
Liefert pro Phrasen-Slot einen Register-Offset (Skalenstufen), der den Tonhöhen-Bogen formt:
- `arch` → z.B. `[0, +2, +3, 0]` (Höhepunkt Mitte)
- `rise` → `[0, +1, +2, +3]`
- `fall` → `[+3, +2, +1, 0]`
- `wave` → `[0, +2, 0, +2]`

**5. Harmonie-Lander `landOnHarmony(events, chordMap, scaleLen, startBar, rng) → events`**
Erweitert die heutige `snapDegree`-Logik: Töne auf **starken** Positionen (Zellanfang / Position % 8 == 0) werden auf den nächsten Akkordton gesnappt; **schwache** Positionen dürfen Durchgangstöne sein. Löst das heutige „in `natural`-Mode 50% zufällig dissonant".

**6. `generateMelody(rng, scaleLen, bars, ctx) → events[]`** (Phrasen-Assembler)
`ctx = { chordMap, profile, startBar, harmonicMode }`. Ablauf:
1. `total = bars * 16`; `motif = makeMotif(...)`; `contourOffsets = pickContour(gewählteKontur, profile.grammar.length)`.
2. Für jeden Grammatik-Slot `i`:
   - Operator(en) nach Slot-Semantik wählen: `A` = `repeat`; `A2/A3` = leichte Variation (`varyRhythm`/`ornament`, gewichtet via `opWeights`); `B` = Kontrast (`invert` oder `sequence`).
   - Motiv-Instanz erzeugen, Register-Offset = `contourOffsets[i]`, Wurzel = `profile.startDegree + offset`.
   - Relative `{deg,dur}` → absolute `{degree,duration}` umrechnen; an aktueller Position platzieren.
   - Ggf. Pause zwischen Slots einfügen (gesteuert über `restDensity` / Slot-Grenzen).
3. Falls `pos < total`: mit Pause oder Halteton auffüllen. Falls Überschuss: letzte `duration` kürzen → Summe der Dauern == `total`.
4. `landOnHarmony(...)` anwenden; Stufen auf `register` clampen.

### Integration & Datenfluss

- Neuer Code im Algo-Block (~Z. 360–505): `MELODY_PROFILES` + Engine-Funktionen.
- `ALGORITHMS.{outrun,noir,dreamwave}.leadGenA/B` (Z. 906–931) rufen `generateMelody(rng, sl, 4, { chordMap, profile: MELODY_PROFILES.<genre>, startBar })` statt `generate{Outrun,Noir,Dreamwave}Lead`.
- Die alten `generate*Lead`-Funktionen bleiben zunächst stehen (Fallback / A-B-Vergleich), bis die Engine im Hörtest überzeugt; danach Entfernung in separatem Schritt.
- `chordMap` kommt unverändert aus `buildChordMap(padProg, totalBars)`; `scheduleAll`, Codec, Preset-Pipeline bleiben unberührt (Format identisch).

### Determinismus & Constraints

- Ausschließlich über das übergebene `rng` (mulberry32-Seed) randomisieren — kein `Date.now`/`Math.random`. Gleicher Seed ⇒ identische Melodie (Voraussetzung für die spätere Preset-Seed-Architektur).
- Single-file, keine externen Libs, kein Build-Step.
- Stufen immer auf `register` geclampt; Phrase immer exakt `bars*16` lang.

## Test & Validierung

**Inline-Tests** (`synthwave_surfer.html?test=1`, bestehendes Harness):
1. **Determinismus:** gleicher Seed → identischer Output (deep-equal).
2. **Format-Validität:** jedes Event ist `{degree,duration}` oder `{rest,duration}`; Summe aller `duration` == `bars*16`.
3. **Harmonie:** Töne auf starken Positionen sind Akkordtöne (gegen einen Test-`chordMap`).
4. **Motiv-Präsenz:** die Phrase enthält mind. eine erkennbare Wiederholung oder Transformation des Keim-Motivs (strukturelle Assertion über die Slot-Herkunft).
5. **Register:** alle `degree` innerhalb `profile.register`.

- Die bestehenden 28 Tests bleiben grün (Output-Format unverändert; Tests prüfen nur den Codec-Parser, nicht generierte Melodien).
- **Ground Truth = Ohr:** im Generativ-Modus hören (HTTP-Server, nicht `file://`), A/B gegen die alten Funktionen. Iteration der Profil-Werte per Hörtest (Phase-1.5-Modus: hören → Parameter anpassen → committen).

## Rollout / Reihenfolge

1. Engine + Profile + Inline-Tests implementieren; alte `generate*Lead` als Fallback behalten.
2. `leadGenA/B` auf die Engine umstellen.
3. Im Generativ-Modus hören, Profil-Werte per Hörtest tunen, committen.
4. (Später, separat) alte `generate*Lead` entfernen; Engine für Bass-Riffs wiederverwenden; Presets auf Seed-Architektur umstellen.

## Offene Punkte / getroffene Entscheidungen

- **Grammatik-Slots = Takte:** je 1 Slot pro Takt (4 Slots bei `bars=4`). Falls sich im Hörtest zeigt, dass feinere Phrasierung nötig ist, kann ein Slot mehrere Takte oder Halbtakte umfassen — bewusst offen für Iteration.
- **Operator-Auswahl pro Slot:** Slot-Semantik (A/A2/B) gibt die Kategorie vor, `opWeights` die konkrete Auswahl — so bleibt Struktur erhalten und trotzdem Seed-Variation.
- **Profil-Werte sind Startpunkte**, final über Hörtest justiert.
