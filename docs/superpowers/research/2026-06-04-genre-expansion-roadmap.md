# Genre-Expansion — DNA-Matrix & Fähigkeits-Fahrplan

**Datum:** 2026-06-04
**Quelle:** 10-Genre-Web-Recherche (`2026-06-04-genre-dna.json`, 10 strukturierte Profile)
**Kontext:** Aufbauend auf der Neufassung (settings-first: Genre = Engine + Voicing). Diese definiert, wie wir die Engine erweitern, um viele Genres generativ-authentisch zu erzeugen.

## Kernerkenntnis

Die Genres clustern nicht nach „Schwierigkeit", sondern nach **welche Engine-Fähigkeit sie blockt**. Statt Genre-für-Genre zu bauen, bauen wir **Fähigkeits-Schichten** — jede Schicht „schaltet" mehrere Genres frei. Das ist DRY und maximiert den Hebel pro Aufwand.

## Was die aktuelle Engine schon kann (Stand Neufassung)

- 16-Step/Takt, 16-Takt-Form, **nur 4/4**; Drum-Pattern als if/else-Zweige (driving/sparse/shuffle/carpenter).
- Subtraktive + FM-Synths (alkali/crystal/vapor/ether) mit Filter+FilterEnv, ADSR, character (Chorus/Sat), Detune.
- Per-Track-LFO (**frei laufend, NICHT tempo-synchron**) auf filter/pwm/amp/pitch.
- **Sidechain** (`triggerSidechain` am Kick) ✅, **Gated Reverb** (`triggerGatedReverb`) ✅.
- Master: Reverb/Delay (Send-Busse), tapeSat, Compressor/Limiter.
- Motiv-Melodie-Engine (Skalengrad + Akkord-Snap), Bass-Ostinato-Engine, padProg→chordMap→Root-Lock.
- Globale Tonart (eine Skala pro Track, **keine Modulation**). Mono Lead, einzelne Bass-Stimme, Triaden-Pad.
- **`arp`-Feld existiert, wird aber nie gelesen** (dormant).
- Motiv-Operatoren: invert/sequence/fragment/augment-artig (Seed für Kontrapunkt).

## Fähigkeits-Schichten (nach Hebel × Kosten sortiert)

### Layer A — billig, hoher Fan-out (zuerst)
| # | Fähigkeit | Schaltet frei | Aufwand |
|---|---|---|---|
| A1 | **Half-Time-Drum-Grid** (Snare auf Step 9/Beat 3) + neue Pattern (909-four-on-floor+Offbeat-Openhat, two-step, boom-bap) | Dubstep, Chillstep, DnB-Feel, Techno, Prog House, Lo-fi | niedrig (gleicher Mechanismus wie carpenter-Drums) |
| A2 | **`arp`-Feld aktivieren** (tempo-synchroner Arpeggiator: up/down/octave, Rate) | Prog House, Trance, Techno, Synthwave | niedrig-mittel (Feld da, muss im Scheduling gelesen werden) |
| A3 | **Per-Track-Distortion + dedizierter Supersaw-Voice** (Unison-Saw, Cent-Spread) | Acid-Grit, Dubstep-Growl, Trance/DnB/Prog-Supersaw | niedrig (Tone.Distortion + fatsawtooth-Modell) |
| A4 | **LFO tempo-synchronisieren** + Filter-LFO-Rate in Beat-Teilern (1/4,1/8,1/16,…) | Dubstep-**Wobble**, DnB-Reese, Chillstep-Bewegung | mittel |

→ Nach Layer A klingen plausibel: **Techno, Progressive House (lite), Trance (lite), Dubstep (Basis-Wobble), Chillstep (Basis)** — plus Synthwave (fertig).

### Layer B — mittel, genre-definierende Techniken
| # | Fähigkeit | Schaltet frei | Aufwand |
|---|---|---|---|
| B1 | **303-Mono-Bass**: Portamento-Glide + Per-Step-**Slide**/**Accent** (Accent boostet Amp **und** Cutoff) + resonanter Lowpass + Distortion + ungerade Pattern-Länge (13/15) | **Acid House** (Identität), Techno-Rolling-Bass | mittel-hoch |
| B2 | **Extended-Chord-Voicing** (maj7/min7/9/11, ii-V-I-Turnarounds, rootless) statt nur Triaden | Lo-fi, DnB, Chillstep | mittel |
| B3 | **Per-Track-Swing + Micro-Timing-Humanisierung + Ghost-Note-Velocity-Tiers** | Lo-fi (Dilla), DnB-Shuffle, Garage-Feel | mittel |
| B4 | **Lo-fi-Textur-Stack**: Vinyl-Crackle + Bitcrush + Wow/Flutter (Pitch-LFO) | Lo-fi-„Dust" | mittel (v.a. FX-Nodes) |

→ Nach Layer B: **Acid House (voll), Lo-fi Hip Hop (voll), DnB (ohne authentischen Break), reichere Dubstep/Chillstep.**

### Layer C — groß (Arrangement + Sampling)
| # | Fähigkeit | Schaltet frei | Aufwand |
|---|---|---|---|
| C1 | **Arrangement-/Build-Engine**: längere Form, 8/16/32-Takt-Sektionen, Riser, Snare-Rolls, Filter-Sweeps, **Drop** | Prog House/Trance/Dubstep mit echtem Drop | groß (= das aufgeschobene „Song-Bogen"/Phase 3) |
| C2 | **Breakbeat-Sampling/Slicing** (oder hochwertiges Multisample-Acoustic-Kit mit Ghost-Hits) | authentischer DnB-Break | groß (Sample-Infrastruktur) |

### Tier 3 — eigene Engine, anderes Paradigma
| # | Fähigkeit | Schaltet frei | Aufwand |
|---|---|---|---|
| D1 | **Polyphone Kontrapunkt-Engine**: 2–4 unabhängige Stimmen, Subjekt/Antwort (Tonika/Dominante, tonale Antwort), invertierbarer Kontrapunkt, **funktionale Stimmführung** (keine Quint-/Oktavparallelen, Vorhalte, Leitton), Stretta, Modulation (Quintfall), Kadenzen, durchkomponiert (keine Loop) | **Bach-Fugen** / Barock-Kontrapunkt | sehr groß — eigener Track |

> Die Motiv-Operatoren (invert/augment/diminish/fragment) sind ein Seed für D1, aber Polyphonie + Stimmführung + Modulation fehlen komplett. Ehrlich: „echtes Bach" ist das schwerste generative Problem hier; wir bauen ein glaubwürdiges Bach-im-Stil, nicht Note-für-Note-Bach.

## Genre → benötigte Schichten (Übersicht)

| Genre | Tempo | Feel | Blockierende Fähigkeit | Frühestes Tier |
|---|---|---|---|---|
| Synthwave/Outrun | 80–140 | straight | — (fertig) | ✅ jetzt |
| Detroit/Minimal Techno | 122–135 | straight + light swing | A1(openhat)/A2(arp) | **Layer A** |
| Progressive House | 122–128 | straight | A2/A3, voll: C1 | **Layer A** (lite) |
| Uplifting Trance | 136–142 | straight | A2/A3, voll: C1 | **Layer A** (lite) |
| Dubstep | 140 (half) | half-time | **A1+A4** (Wobble) | **Layer A** |
| Chillstep/Future Garage | 130–145 (half) | half-time 2-step | A1+A4, B2/B3 | Layer A→B |
| Lo-fi Hip Hop | 60–90 | swung boom-bap | **B2+B3+B4** | **Layer B** |
| Acid House | 118–130 | four-on-floor | **B1** (303) | **Layer B** |
| Liquid DnB | 165–178 | rolling break | B2/B3, voll: **C2** | Layer B→C |
| Bach-Fuge | (implizit) | straight polyphon | **D1** | **Tier 3** |

## Empfohlene Reihenfolge

1. **Neufassung-Foundation nach `main`** (fertig, verifiziert) — das Substrat.
2. **Layer A** als erster Fähigkeits-Sprint + erster Genre-Batch (**Techno, Progressive House, Trance**) — billig, höchster Fan-out, beweist die „Genre hinzufügen"-Pipeline end-to-end mit risikoarmen Genres.
3. **Layer A vervollständigt Dubstep/Chillstep** (Wobble + Half-Time).
4. **Layer B**: erst **Acid House** (fokussierter 303-Vertikalschnitt, Identität in EINEM Instrument), dann **Lo-fi** (Swing+Textur).
5. **Layer C** (Arrangement/Drops + Break-Sampling) wenn die Genre-Breite steht.
6. **Tier 3 (Bach)** als eigener Forschungs-/Bau-Track — parallel oder zuletzt.

## Nicht-Ziele / Ehrlichkeit

- „Echtes Bach Note-für-Note" wird nicht versprochen — glaubwürdiger Stil, ehrlich gescoped (D1).
- Authentischer DnB-Break braucht Sampling (C2); bis dahin synthetisches Kit-Approximat.
- Layer C (Drops/Builds) ist das aufgeschobene Song-Bogen-Thema — bewusst nach der Genre-Breite.
