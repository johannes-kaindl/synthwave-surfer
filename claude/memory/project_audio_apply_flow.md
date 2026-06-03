---
name: Audio Apply-Flow – live vs tote Knöpfe
description: Welche Audio-Parameter in synthwave_surfer.html effektiv editierbar sind vs. von Override-Systemen überschrieben werden
type: project
---

In `synthwave_surfer.html` überschreiben ZWEI Apply-Systeme die Konstruktor-Defaults. Einen Konstruktor-Wert zu editieren wirkt NUR, wenn kein System diesen Parameter anfasst.

**1. `applyAllToGraph(g)` (~Z.1278) ← `masterState` / Preset-Master-Block (Z.1992 ff.):**
überschreibt `reverb.roomSize` (=reverbSize), `reverbSend.gain` (=reverbWet), `delay.delayTime/feedback`, `delaySend.gain` (=delayWet), `tapeSat.wet` + `tapeSat.distortion` (=tapeSat), `masterGain`. Läuft bei jedem Preset-Load + Slider. Boot lädt Miami Nights → `masterState`-Defaults (Z.1271-1273) sind für den gehörten Sound irrelevant; echter Hebel = **PRESET-Master-Blöcke**.

**2. `applyTrackParams(model,params)` (~Z.1063) ← Per-Track-Params (Preset-Tabellen):**
überschreibt Envelope (a/d/s/r), Filter-`Q` (=resonance·18), `filterEnvelope.baseFrequency` (=50+cutoff·4500), `octaves`, `decay`, `detune`, `character.wet` (=character·characterAmount). FMSynth (crystal/Lead) wird beim Filter ÜBERSPRUNGEN (`type !== 'crystal'`) → seine harmonicity/modulationIndex bleiben fest.

**FESTE Werte (kein Override → Konstruktor-Edit wirkt):** Master-Compressor (threshold/ratio/attack/release), Limiter, Kick/Snare/Hat-Synths inkl. deren Vol/Filter (Drums sind NICHT im Param-System), Gated-Reverb-Gate-Timing (`triggerGatedReverb` ~Z.1320), Sidechain-Floor-Koeffizienten (`triggerSidechain` ~Z.1307, padFloor 0.85 / bassFloor 0.3), `makeTrackBus` volume-Baseline (-6), FMSynth harmonicity/modulationIndex, Chorus delayTime/depth/frequency (NICHT wet), Oszillator-Typen/spread, `Tone.Transport.swing` (=algo.swing Z.912/936).

**Reverb/Delay sind SEND-Busse** mit parallelem Dry-Pfad (`dryGain→compressor`). `reverb.wet=1.0` ist KORREKT (Send-Return, 100% nass); die Reverb-MENGE steuert `reverbSend.gain`. „Sound ertrinkt in 100% Wet" ist ein Fehlschluss.

**Why:** Die Phase-1.5-Sound-Diagnose-Subagents zielten auf ~40% tote Defaults (baseFrequency, roomSize, tapeSat am Konstruktor), weil sie den Apply-Flow nicht tracten — technisch plausible, aber wirkungslose Edits. Verifiziert 2026-06-03.
**How to apply:** Vor JEDEM Sound-Param-Edit prüfen: greift `applyAllToGraph` oder `applyTrackParams` diesen Wert ab? Wenn ja → Preset-Master-Block / Param-Tabelle editieren, NICHT den Konstruktor. Siehe [[project_synthwave_surfer]].
