# Neufassung (Zielbild A, settings-first) — Design

**Datum:** 2026-06-04
**Status:** Ratifiziert (Brainstorming-Session), Implementierung autonom freigegeben
**Datei:** `synthwave_surfer.html` (single-file)
**Vorgänger-Kontext:** Phase 1.5 (Melodie-/Bass-Engine, Genre-Voicing, Stratos retired) abgeschlossen.

## 1. Problem & Ziel

**Problem:** Die 6 Factory-Presets sind eingefrorenes `fixedSwmd` (hand-geschriebenes Multi-Phase-Notenmaterial). Sie erben **keine** Engine-Verbesserungen — verbessere ich Melodie-, Bass- oder Voicing-Engine, bleiben die Presets stale. Außerdem teilen sich zwei kompositorisch unterschiedliche Identitäten (Blade Runner = atmosphärisches Noir, Carpenter = Horror-Ostinato) dieselbe `noir`-Engine und unterscheiden sich nur in Instrumenten — sie fühlen sich nicht eigenständig an.

**Ziel (Zielbild A, settings-first):**
- **Genre = Engine + Default-Voicing.** Engine = reine Komposition (`ALGORITHMS`); Default-Voicing = kanonische Instrumente+FX pro Engine.
- **Preset = benannter Seed im Genre + Voicing-Deltas.** Kein `fixedSwmd` mehr → Presets sind generativ, deterministisch über `mulberry32(seed)` reproduzierbar, und erben Engine- und Voicing-Verbesserungen automatisch.
- **Carpenter wird eine eigene Engine** (Horror-Ostinato in 4/4), getrennt vom atmosphärischen `noir`.

**Erfolgskriterium:** Eine Engine-Verbesserung wirkt automatisch auf alle Presets dieser Engine. Carpenter und Blade Runner klingen hörbar kompositorisch verschieden. Jedes der 6 Presets ist ein per Ohr kuratierter Seed, der gut klingt.

## 2. Ratifizierte Entscheidungen

| # | Entscheidung | Begründung |
|---|---|---|
| D1 | **Einphasig jetzt, Schema phasen-erweiterbar** | Mehrphasigkeit (Song-Bogen) ist Phase 3. Der eingebaute 16-Takt-Bogen (Intro/Build/Drop via `drumStartBar`, `padStartBar`, Lead A@4 / B@10) reicht vorerst. Schema soll ein späteres `phases[]` natürlich andocken lassen, ohne es jetzt zu bauen. |
| D2 | **Carpenter = eigene Engine in 4/4** | Carpenter-Charakter (karg, Ostinato, Halbton-/Tritonus-Spannung) ist Komposition, nicht Voicing. Echtes 5/4-Halloween (Scheduler-Umbau) ist eine spätere Verfeinerung. |
| D3 | **2-Schicht-Modell (Engine-Default-Voicing + sparse Preset-Deltas)** | Die separate „benannte Voicing"-Zwischenschicht ist YAGNI, seit Carpenter/Blade Runner auf Engine-Ebene getrennt sind. Sparse Deltas realisieren „Presets erben Voicing-Verbesserungen" wörtlich. |
| D4 | **Migration = frische, lebendige Interpretation** | Presets reproduzieren NICHT die alten eingefrorenen Noten. Jedes Preset = kuratierter Seed; Identität aus Engine+Voicing+Mood. |
| D5 | **Codec bleibt, repositioniert** | `.swmd`-Codec wird nicht fallengelassen: (1) Import authored Files → `fixed`-Modus; (2) „Freeze"/Export der generativen Ausgabe → `.swmd` zum Editieren in Obsidian. Der `fixed`/`generative`-Toggle bleibt bedeutsam. |

## 3. Engines (4) + Default-Voicings

`ENGINE_VOICINGS[engine] = { bass, lead, pad, master }` ersetzt das alte `GENRE_REF` (das auf ein Preset zeigte) durch eine **kanonische** Voicing pro Engine. `GENRE_BASS` entfällt (geht in `ENGINE_VOICINGS[*].bass.model` auf).

| Engine | Charakter | Default-Voicing (Quelle/Richtung) | BPM · Mode |
|---|---|---|---|
| `outrun` | treibend, klassisch | alkali Bass / crystal Lead / vapor Pad (≈ heutige Miami-Nights-Voicing) | 120 · aeolian |
| `noir` | atmosphärisch (Blade Runner) | warmer Sub / CS-80-artiger Lead / breiter Pad (≈ heutige Blade-Runner-Voicing) | 80 · aeolian |
| `dreamwave` | hazy / warm | weicher Bass / soft Lead / vapor-Pad (≈ heutige VHS-Sunset-Voicing) | 100 · aeolian |
| `carpenter` **(NEU)** | karg, Horror-Ostinato | dunkler Pulse-Bass / spärliches hohes Motiv / Drone-Pad | 92 · **phrygian** |

> **Hinweis Apply-Flow:** Die Default-Voicing muss die durch `applyAllToGraph` / `applyTrackParams` *effektiv* gehörten Parameter setzen (Preset-Master-Block + Per-Track-Param-Tabellen), nicht nur Konstruktor-Defaults. Siehe Memory `project_audio_apply_flow`.

## 4. Datenmodell

### 4.1 Preset-Schema (neu)

```js
'Miami Nights': {
  engine: 'outrun',           // Pflicht: ALGORITHMS-Key
  seed: 1986,                 // Pflicht: kuratierter Seed
  bpm: 120,                   // optional: Override von ALGORITHMS[engine].defaultBpm
  mode: 'aeolian',            // optional: Override von ALGORITHMS[engine].defaultMode
  tag: 'Outrun · classic',    // UI-Label
  voicing: {                  // optional, SPARSE: nur Abweichungen von ENGINE_VOICINGS[engine]
    bass:   { /* Partial */ },
    lead:   { /* Partial */ },
    pad:    { /* Partial */ },
    master: { /* Partial */ },
  },
  // KEIN fixedSwmd mehr
}
```

Phasen-Erweiterbarkeit (D1): Ein künftiges optionales `phases: [{ seed, voicing }]` kann ergänzt werden; fehlt es, gilt die einphasige Form `{ seed, voicing }`. Jetzt NICHT implementieren — nur nicht verbauen.

### 4.2 `mergeVoicing(defaultVoicing, deltas) → { trackParams, masterState }`

Reine Funktion (headless-testbar). Tiefe Merge je Spur:
```
für track in ['bass','lead','pad']:
  result[track] = { ...clone(defaultVoicing[track]), ...(deltas?.[track] || {}) }
masterState     = { ...clone(defaultVoicing.master), ...(deltas?.master || {}) }
```
Keine verschachtelten Objekte tiefer als eine Ebene (Param-Tabellen sind flach) → flacher Merge genügt.

### 4.3 `applyPreset(name)` (ersetzt `applyFactoryPreset`)

```
const p = FACTORY_PRESETS[name]; if (!p) return;
setEngine(p.engine);                                  // Radio + Algo-Card aktiv
const v = mergeVoicing(ENGINE_VOICINGS[p.engine], p.voicing);
Object.assign(trackParams.bass, v.trackParams.bass);
Object.assign(trackParams.lead, v.trackParams.lead);
Object.assign(trackParams.pad,  v.trackParams.pad);
Object.assign(masterState,      v.masterState);
$('bpm').value  = p.bpm  ?? ALGORITHMS[p.engine].defaultBpm;
$('mode').value = p.mode ?? ALGORITHMS[p.engine].defaultMode;
$('seed').value = p.seed;
patternMode = 'generative';                           // Presets sind generativ
syncTrackUI('bass'|'lead'|'pad'); syncMasterUI(); syncPatternToggle();
if (liveSynths) { setTrackModel ×3; applyAllToGraph(liveSynths); }   // live re-voice
generate();                                           // Engine erzeugt Noten
```
Die pwm→off-Normalisierung (Commit `d787004`) bleibt erhalten und greift weiter, falls eine Voicing `lfoTarget:'pwm'` auf nicht-Stratos trägt.

## 5. Carpenter-Engine

### 5.1 `ALGORITHMS.carpenter`
```
carpenter: {
  totalBars: 16, buildForm: buildCarpenterForm,
  riffGen: (rng, sl) => generateRiff(rng, sl, BASS_PROFILES.carpenter),
  leadGenA: (rng, sl, ctx) => generateMelody(rng, sl, 4, { ...ctx, profile: MELODY_PROFILES.carpenter, startBar: 6 }),
  leadGenB: (rng, sl, ctx) => generateMelody(rng, sl, 4, { ...ctx, profile: MELODY_PROFILES.carpenter, startBar: 12 }),
  padProg: [[0,2,4], [-1,1,3]],            // langsam, 1–2 Akkorde, phrygische Färbung
  padStartBar: 0, padEndBar: 16, padRoot: 60,
  drumStartBar: 4, drumEndBar: 16, drumIntenseFrom: 999, drumBreakFrom: 999, drumBreakTo: 0,
  drumPattern: 'carpenter',                 // neue, minimale Pattern-Variante
  swing: 0, sidechain: false,
  defaultBpm: 92, defaultMode: 'phrygian',
}
```

### 5.2 Musikalische Bausteine
- **Bass-Ostinato** (`BASS_PROFILES.carpenter`): unerbittliches 8tel-Pattern auf dem Akkord-Root, gelegentlicher Halbton-Obernachbar — das Signature-Element. Wenig rhythmische Variation, Determinismus erhalten.
- **Motiv** (`MELODY_PROFILES.carpenter`): enger Ambitus, Halbton-/Tritonus-Lean, hohe Pausen-Rate (spärlich, hoch). Nutzt die bestehenden Entwicklungs-Operatoren.
- **Pad:** minimal — gehaltener dunkler Drone; sehr langsame Akkordwechsel.
- **Drums** (`drumPattern: 'carpenter'`): Kick auf schwere Zählzeiten, gelegentlicher Rim, keine Hi-Hat-Betriebsamkeit — Spannung aus dem Raum.
- **Harmonie:** `phrygian` (b2 liefert die Halbton-Düsternis). Pad-Root 60, Bass lockt via `chordMap` auf Akkord-Roots wie in den anderen Engines.

### 5.3 `buildCarpenterForm(rng, material, ctx)`
Analog zu `buildNoirForm`, aber: Bass-Ostinato läuft durchgehend (kein Aussetzen), Lead-Motiv erst spät und spärlich, Pad-Drone von Takt 0. `chordMap` aus `ctx` für Root-Lock (wie bestehende Form-Builder, `rootOffset = chordMap[b].root`).

### 5.4 Phrygian-Scale
Falls `SCALES.phrygian` fehlt: ergänzen (`[0,1,3,5,7,8,10]`).

## 6. Preset → Engine-Remap

| Preset | bisher | neu |
|---|---|---|
| Miami Nights | outrun | `outrun` |
| Highway Cruise | outrun | `outrun` |
| Blade Runner Rain | noir | `noir` |
| **Carpenter Synth** | noir | **`carpenter`** |
| Mall Bliss | dreamwave | `dreamwave` |
| VHS Sunset | dreamwave | `dreamwave` |

Voicing-Deltas pro Preset = Differenz zwischen heutiger Preset-Voicing und der neuen `ENGINE_VOICINGS`-Default. Seeds werden in der Kuratierungs-Phase (§9) per Ohr final gesperrt; bis dahin Platzhalter = heutiger Preset-Seed.

## 7. Codec / Fixed-Modus

- `patternMode`: `generative` (Engine) | `fixed` (importiertes/authored `.swmd` verbatim).
- Factory-Presets sind alle `generative` (kein `fixedSwmd`).
- **Import:** `.swmd`/`.md` parsen → `fixed`. Unverändert.
- **Freeze/Export:** aktuelle generative Ausgabe → `.swmd` serialisieren (existiert via `swmdSerialize`; als bewusstes „Freeze"-Feature dokumentieren/anbieten).
- Der `fixed`/`generative`-Toggle bleibt; beim Laden eines Presets schaltet er auf `generative`.

## 8. Tests

- **Raus:** Assertions, die Frozen-Preset-`fixedSwmd`-Roundtrip-Inhalt prüfen (Presets tragen kein `fixedSwmd` mehr).
- **Bleibt:** Codec-Roundtrip-Tests (User-File-Import/-Export).
- **Neu (headless, Sentinel-Pattern `// <<…_START/END>>`, via Node):**
  - `ENGINE_VOICINGS`-Vollständigkeit: alle 4 Engines haben komplette `bass/lead/pad/master` mit allen Pflichtfeldern.
  - `mergeVoicing`: Default ohne Deltas = Default; Deltas überschreiben punktuell; Quelle wird nicht mutiert (Clone).
  - `applyPreset` (soweit ohne DOM testbar): erzeugte trackParams sind valide / Modelle existieren.
  - Carpenter-Generatoren: `generateRiff(.,.,BASS_PROFILES.carpenter)` deterministisch & Groove-Summe = 16; `MELODY_PROFILES.carpenter` Form-Constraints; Ambitus eng.
  - `SCALES.phrygian` korrekt.
- Headless-Verify-Harness erweitern (extrahiert Funktionen zwischen Sentinels, führt mit `node` aus).

## 9. Kuratierungs-Phase (braucht Ohr → User)

Nach Implementierung, pro Preset mit gelockter Engine+Voicing:
1. HTTP-Server (`python3 -m http.server`), App im `generative`-Modus.
2. Eine Handvoll Seeds durchhören (z.B. 5–8 Kandidaten).
3. Besten Seed in `FACTORY_PRESETS[name].seed` sperren.
4. Carpenter zuerst (neue Engine), dann die fünf migrierten Presets.

Diese Phase ist **nicht autonom** — Claude liefert die Kandidaten-Infrastruktur, Johannes wählt per Ohr.

## 10. Touch-Liste (Dateien/Bereiche in `synthwave_surfer.html`)

- `SCALES` — ggf. `phrygian` ergänzen.
- Melodie-Engine-Block (Sentinels ~505–718) — `MELODY_PROFILES.carpenter`, `BASS_PROFILES.carpenter`.
- Form-Builder — `buildCarpenterForm`.
- Drum-Pattern-Logik — `'carpenter'`-Variante.
- `ALGORITHMS` (~1120) — `carpenter`-Eintrag.
- `ENGINE_VOICINGS` (neu) — ersetzt `GENRE_REF`/`GENRE_BASS` (~3274).
- `applyGenreVoicing` (~3276) — auf `ENGINE_VOICINGS` umstellen.
- `FACTORY_PRESETS` (~2210) — 6 Presets aufs neue Schema, `fixedSwmd` raus.
- `applyFactoryPreset` (~3118) → `applyPreset` mit `mergeVoicing`.
- UI: 4. Algo-Card `carpenter` (~HTML 210), Preset-Liste, Boot-Default.
- `mergeVoicing` (neu, reine Funktion in Sentinel-Block für Headless-Test).
- Test-Harness (~3641–4133) — anpassen/erweitern.

## 11. Risiken

- **Carpenter-„Feel"** in 4/4 ist kreative Iteration — die Ostinato-/Motiv-Balance muss per Ohr stimmen (Kuratierung).
- **Voicing-Default-Ableitung:** Die `ENGINE_VOICINGS`-Defaults müssen die *gehörten* (apply-flow-effektiven) Werte treffen, sonst klingen Presets anders als erwartet.
- **Multi-Phase-Verlust** (akzeptiert, D1): migrierte Presets sind einphasig; Song-Bogen folgt in Phase 3.
- **Seed-Kuratierung** ist manuelle Ohr-Arbeit (User-abhängig).

## 12. Nicht-Ziele (YAGNI)

- Kein 5/4-/Meter-Umbau (Carpenter bleibt 4/4).
- Keine Song-Bogen-/Phasen-Engine (Phase 3).
- Keine benannte „Voicing"-Zwischenschicht (D3).
- Kein Match des alten eingefrorenen Klangs (D4).
