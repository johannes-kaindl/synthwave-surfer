# Neufassung (Zielbild A, settings-first) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Note:** all edits touch the SINGLE file `synthwave_surfer.html`; tasks are interdependent → execute SEQUENTIALLY (not parallel subagents on the same file).

**Goal:** Presets werden generativ (Engine + kuratierter Seed + sparse Voicing-Deltas, kein `fixedSwmd`) und erben Engine-Verbesserungen automatisch; Carpenter bekommt eine eigene 4/4-Ostinato-Engine getrennt vom atmosphärischen Noir.

**Architecture:** 2-Schicht-Modell. `ALGORITHMS[engine]` = Komposition; `ENGINE_VOICINGS[engine]` = kanonische Instrumente+FX; `FACTORY_PRESETS[name]` = `{ engine, seed, bpm?, mode?, tag, voicing? }` mit sparsen Deltas. `mergeVoicing(default, deltas)` → trackParams+masterState. `applyPreset` setzt Engine, merged Voicing, setzt Seed, `patternMode='generative'`, ruft `generate()`.

**Tech Stack:** Single-file HTML/JS, Tone.js 14, deterministisches `mulberry32(seed)`. Tests: in-file `tests`-Array (`?test=1`) + headless via Node-Extraktion zwischen Sentinels.

**Spec:** `docs/superpowers/specs/2026-06-04-neufassung-settings-first-design.md`

---

## Datei-Struktur

Alles in `synthwave_surfer.html`. Betroffene Bereiche (Zeilen ~Stand 2026-06-04):
- `MELODY_PROFILES` (518), `BASS_PROFILES` (680) — Carpenter-Profile ergänzen (im Sentinel-Block 505–718).
- Form-Builder (1077–1115) — `buildCarpenterForm` ergänzen.
- `ALGORITHMS` (1120) — `carpenter`-Eintrag.
- Drum-Switch live (1616–1644) + MIDI (1890–1910) + `defaultDrumGridForAlgo` (3429) — `'carpenter'`-Zweig.
- Algo-Card-UI (209–225) — 4. Card.
- `ENGINE_VOICINGS` + `mergeVoicing` (NEU, ~vor 3272, Sentinel-Block).
- `GENRE_REF`/`GENRE_BASS`/`applyGenreVoicing` (3275–3294) — auf `ENGINE_VOICINGS` umstellen.
- `FACTORY_PRESETS` (2210–~2960) — neues Schema, `fixedSwmd` raus.
- `applyFactoryPreset` (3117–3164) → `applyPreset`.
- Test-Harness (`tests`-Array endet 4134) — Carpenter-/Voicing-Tests rein, fixedSwmd-Content-Tests raus.

**Headless-Verify-Befehl** (nach Tasks mit pure-function-Tests): extrahiere die nötigen Zeilenbereiche + das `tests`-Array in `.remember/tmp/` und führe mit `node` aus. Muster siehe `.remember/tmp/run.js` (von der Verifikations-Session). Erwartung: alle Nicht-`[PROBE]`-Tests grün.

---

## Task 1: Carpenter MELODY/BASS-Profile

**Files:** Modify `synthwave_surfer.html` (MELODY_PROFILES ~542, BASS_PROFILES ~683), Test im `tests`-Array (~4134).

- [ ] **Step 1: Failing test** — vor `];` bei Zeile 4134 einfügen:

```js
    ['carpenter: BASS_PROFILES groove sums to one bar + deterministic', () => {
      assert(BASS_PROFILES.carpenter.grooves.every(g => g.reduce((s,d)=>s+d,0)===16), 'groove sums 16');
      const a = generateRiff(mulberry32(11), 7, BASS_PROFILES.carpenter);
      const b = generateRiff(mulberry32(11), 7, BASS_PROFILES.carpenter);
      assert(JSON.stringify(a)===JSON.stringify(b), 'deterministic');
      assert(a.reduce((s,e)=>s+e.duration,0)===16, 'one bar');
    }],
    ['carpenter: MELODY_PROFILES sparse + narrow register', () => {
      const p = MELODY_PROFILES.carpenter;
      assert(p.restDensity >= 0.4, 'high rest density');
      assert(p.register[0] >= 3 && p.register[1] <= 12, 'high narrow register');
      const ev = generateMelody(mulberry32(7), SCALES.phrygian.length, 4, { profile: p, startBar: 0 });
      assert(ev.reduce((s,e)=>s+e.duration,0)===64, 'fills 4 bars');
    }],
```

- [ ] **Step 2: Run, verify FAIL** — Node-Extraktion + run. Expected: FAIL `BASS_PROFILES.carpenter is undefined`.

- [ ] **Step 3: Implement** — in `BASS_PROFILES` (nach der `dreamwave`-Zeile, ~683) ergänzen:

```js
  carpenter: { grooves: [[2,2,2,2,2,2,2,2]],                                       octaveProb: 0.0,  moveProb: 0.25 },
```

In `MELODY_PROFILES` (nach dem `dreamwave`-Block, vor der schließenden `};` bei ~542) ergänzen:

```js
  carpenter: {
    motifLen: [2, 3],
    rhythmCells: [[8,8],[8,4,4],[4,4,8]],
    stepBias: 0.9, leapSizes: [2, 4], restDensity: 0.5,
    opWeights: { repeat:0.55, sequence:0.15, invert:0.10, varyRhythm:0.10, fragment:0.05, ornament:0.05 },
    contours: ['fall','arch'], register: [3, 11],
    grammar: ['A','A','A2','A'], startDegree: 5,
  },
```

- [ ] **Step 4: Run, verify PASS.**

- [ ] **Step 5: Commit** — `git add synthwave_surfer.html && git commit -m "feat(algo): carpenter melody+bass profiles (inert)"`

---

## Task 2: buildCarpenterForm

**Files:** Modify `synthwave_surfer.html` (nach `buildDreamwaveForm`, ~1115).

- [ ] **Step 1: Failing test** — im `tests`-Array ergänzen:

```js
    ['carpenter: buildCarpenterForm — relentless bass (no fill), late lead', () => {
      const rng = mulberry32(5), sl = SCALES.phrygian.length;
      const mat = { riff: generateRiff(mulberry32(5), sl, BASS_PROFILES.carpenter),
                    melodyA: generateMelody(mulberry32(6), sl, 4, { profile: MELODY_PROFILES.carpenter, startBar: 6 }),
                    melodyB: generateMelody(mulberry32(7), sl, 4, { profile: MELODY_PROFILES.carpenter, startBar: 12 }) };
      const form = buildCarpenterForm(rng, mat, { chordMap: null });
      const bassParts = form.parts.filter(p => p.voice === 'bass');
      assert(bassParts.length === 16, '16 bass bars');
      assert(bassParts.every(p => JSON.stringify(p.line) === JSON.stringify(mat.riff)), 'every bar = unfilled riff');
      const leadStarts = form.parts.filter(p => p.voice === 'lead').map(p => p.startBar);
      assert(leadStarts.includes(6) && leadStarts.includes(12), 'lead enters late');
    }],
```

- [ ] **Step 2: Run, verify FAIL** — `buildCarpenterForm is not defined`.

- [ ] **Step 3: Implement** — nach `buildDreamwaveForm` (Zeile 1115) einfügen:

```js
function buildCarpenterForm(rng, material, opts) {
  const { riff, melodyA, melodyB } = material;
  const chordMap = opts && opts.chordMap;
  const parts = [];
  for (let b = 0; b < 16; b++) {
    const rootOffset = chordMap ? chordMap[b].root : 0;
    parts.push({ voice: 'bass', line: transpose(riff, rootOffset), startBar: b }); // relentless ostinato — NO bassFill
  }
  parts.push({ voice: 'lead', line: melodyA, startBar: 6 });
  parts.push({ voice: 'lead', line: melodyB, startBar: 12 });
  return { parts, riff, melodyA, melodyB };
}
```

- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(algo): buildCarpenterForm (relentless ostinato, late sparse lead)"`

---

## Task 3: ALGORITHMS.carpenter

**Files:** Modify `synthwave_surfer.html` (`ALGORITHMS`, nach `dreamwave` ~1156).

- [ ] **Step 1: Implement** — nach dem `dreamwave`-Eintrag (vor der schließenden `};` Zeile 1157) einfügen:

```js
  carpenter: {
    totalBars: 16, buildForm: buildCarpenterForm,
    riffGen: (rng, sl) => generateRiff(rng, sl, BASS_PROFILES.carpenter),
    leadGenA: (rng, sl, ctx) => generateMelody(rng, sl, 4, { ...ctx, profile: MELODY_PROFILES.carpenter, startBar: 6 }),
    leadGenB: (rng, sl, ctx) => generateMelody(rng, sl, 4, { ...ctx, profile: MELODY_PROFILES.carpenter, startBar: 12 }),
    padProg: [[0,2,4], [-1,1,3]],
    padStartBar: 0, padEndBar: 16, padRoot: 60,
    drumStartBar: 4, drumEndBar: 16, drumIntenseFrom: 999, drumBreakFrom: 999, drumBreakTo: 0,
    drumPattern: 'carpenter',
    swing: 0, sidechain: false,
    defaultBpm: 92, defaultMode: 'phrygian',
  },
```

- [ ] **Step 2: Test** — im `tests`-Array:

```js
    ['carpenter: ALGORITHMS entry wired', () => {
      const a = ALGORITHMS.carpenter;
      assert(a.buildForm === buildCarpenterForm, 'buildForm');
      assert(a.defaultMode === 'phrygian' && a.defaultBpm === 92, 'defaults');
      assert(a.drumPattern === 'carpenter' && a.swing === 0 && a.sidechain === false, 'drum/feel');
    }],
```

- [ ] **Step 3: Run headless, verify PASS** (ALGORITHMS extraction nötig — Zeilenbereich ~1120–1157 mit ergänzen).
- [ ] **Step 4: Commit** — `git commit -am "feat(algo): ALGORITHMS.carpenter (4/4 horror ostinato engine)"`

---

## Task 4: Carpenter-Drum-Pattern (3 Stellen)

**Files:** Modify `synthwave_surfer.html` (live ~1642, MIDI ~1909, `defaultDrumGridForAlgo` ~3440).

- [ ] **Step 1: Live-Audio-Switch** — in der Kette bei Zeile 1631 (`} else if (pattern === 'shuffle') {`) DAVOR einfügen (nach dem `sparse`-Block, der bei `}` Zeile 1631 endet):

```js
      } else if (pattern === 'carpenter') {
        if (beat === 0) drumEvents.push({ time: beatT, type: 'kick' });
        if (beat === 2 && bar % 2 === 1) drumEvents.push({ time: beatT, type: 'snare', vel: 0.4 });
        // no hats — tension from space
```

- [ ] **Step 2: MIDI-Export-Switch** — bei Zeile 1905 (`} else if (algo.drumPattern === 'shuffle') {`) DAVOR einfügen:

```js
      } else if (algo.drumPattern === 'carpenter') {
        if (beat === 0) drumEvents.push({ start: tBeat, duration: TPQ/4, note: 36, vel: 100 });
        if (beat === 2 && bar % 2 === 1) drumEvents.push({ start: tBeat, duration: TPQ/4, note: 38, vel: 50 });
```

- [ ] **Step 3: defaultDrumGridForAlgo** — bei Zeile 3440 (`} else { // shuffle / dreamy / other`) DAVOR einfügen:

```js
      } else if (algo.drumPattern === 'carpenter') {
        [0].forEach(i => { K[i] = true; });
        [8].forEach(i => { S[i] = true; });
        // no hihat
```

- [ ] **Step 4: Manuelle Verifikation** — `?test=1` lädt ohne JS-Fehler (Konsole sauber); Carpenter-Engine erzeugt Drums ohne Crash. (Kein Unit-Test — DOM/Audio-Pfad.)
- [ ] **Step 5: Commit** — `git commit -am "feat(algo): carpenter minimal drum pattern (live+midi+grid)"`

---

## Task 5: 4. Algo-Card UI (carpenter)

**Files:** Modify `synthwave_surfer.html` (Algo-Row, nach Zeile 224).

- [ ] **Step 1: Implement** — nach dem `dreamwave`-`</label>` (Zeile 224) einfügen:

```html
      <label class="algo-card" data-algo="carpenter">
        <input type="radio" name="algo" value="carpenter">
        <div class="algo-name">Carpenter</div>
        <div class="algo-desc">92 BPM · phrygian · relentless 8th ostinato · sparse high motif · minimal drums · horror tension</div>
      </label>
```

> Der bestehende `.algo-card`-Click-Handler (3296) bindet via `querySelectorAll('.algo-card')` + `dataset.algo` automatisch — keine weitere Verdrahtung nötig.

- [ ] **Step 2: Verifikation** — App im Browser: 4. Card „Carpenter" erscheint, Klick setzt BPM 92/Mode phrygian und generiert ohne Fehler.
- [ ] **Step 3: Commit** — `git commit -am "feat(ui): carpenter algo card"`

---

## Task 6: ENGINE_VOICINGS + mergeVoicing (NEU, pure)

**Files:** Modify `synthwave_surfer.html` (neuer Block direkt vor `GENRE_REF`, Zeile 3272). Test im `tests`-Array.

> `ENGINE_VOICINGS` ist KANONISCH (kopiert Werte inline, referenziert KEINE Presets). Werte-Quellen: `outrun` = heutige Miami-Nights-Objekte (2212–2215); `noir` = Blade-Runner-Rain (2515–2518); `dreamwave` = VHS-Sunset (2936–2939). Beim Implementieren diese Objekte 1:1 hineinkopieren. `carpenter` = neue Werte unten.

- [ ] **Step 1: Failing test** — im `tests`-Array:

```js
    ['voicing: ENGINE_VOICINGS complete for all 4 engines', () => {
      for (const e of ['outrun','noir','dreamwave','carpenter']) {
        const v = ENGINE_VOICINGS[e];
        assert(v && v.bass && v.lead && v.pad && v.master, e + ' has all tracks');
        for (const t of ['bass','lead','pad']) assert(typeof v[t].model === 'string' && 'cutoff' in v[t], e+'.'+t+' shape');
        assert('reverbWet' in v.master && 'masterGain' in v.master, e + ' master shape');
      }
    }],
    ['voicing: mergeVoicing applies deltas, does not mutate source', () => {
      const base = ENGINE_VOICINGS.outrun;
      const out = mergeVoicing(base, { bass: { cutoff: 0.99 }, master: { masterGain: 0.5 } });
      assert(out.trackParams.bass.cutoff === 0.99, 'bass delta applied');
      assert(out.trackParams.bass.model === base.bass.model, 'untouched field inherited');
      assert(out.masterState.masterGain === 0.5, 'master delta applied');
      assert(base.bass.cutoff !== 0.99, 'source not mutated');
      const empty = mergeVoicing(base, undefined);
      assert(empty.trackParams.lead.model === base.lead.model, 'no deltas = default');
    }],
```

- [ ] **Step 2: Run, verify FAIL** — `ENGINE_VOICINGS is not defined`.

- [ ] **Step 3: Implement** — vor Zeile 3272 (`/* Genre-Voicing ... */`) einfügen:

```js
// <<VOICING_START>>
/* Canonical per-engine default voicing (instruments + FX). Presets store SPARSE
   deltas over these via mergeVoicing — so engine voicing improvements propagate. */
const ENGINE_VOICINGS = {
  outrun: {
    bass:   { /* COPY Miami Nights bass  (line ~2212) */ },
    lead:   { /* COPY Miami Nights lead  (line ~2213) */ },
    pad:    { /* COPY Miami Nights pad   (line ~2214) */ },
    master: { /* COPY Miami Nights master(line ~2215) */ },
  },
  noir: {
    bass:   { /* COPY Blade Runner Rain bass   (line ~2515) */ },
    lead:   { /* COPY Blade Runner Rain lead   (line ~2516) */ },
    pad:    { /* COPY Blade Runner Rain pad    (line ~2517) */ },
    master: { /* COPY Blade Runner Rain master (line ~2518) */ },
  },
  dreamwave: {
    bass:   { /* COPY VHS Sunset bass   (line ~2936) */ },
    lead:   { /* COPY VHS Sunset lead   (line ~2937) */ },
    pad:    { /* COPY VHS Sunset pad    (line ~2938) */ },
    master: { /* COPY VHS Sunset master (line ~2939) */ },
  },
  carpenter: {
    bass:   { model: 'alkali', volume: 0.72, detune: 0, attack: 0.004, decay: 0.22, sustain: 0.85, release: 0.18, cutoff: 0.32, resonance: 0.4, fenvAmount: 0.25, fenvDecay: 0.2, character: 0.45, lfoTarget: 'off', lfoRate: 0.1, lfoDepth: 0.2, arp: 'off', send: false },
    lead:   { model: 'crystal', volume: 0.4, detune: 0, attack: 0.005, decay: 0.5, sustain: 0.15, release: 0.8, cutoff: 0.75, resonance: 0.25, fenvAmount: 0.3, fenvDecay: 0.4, character: 0.4, lfoTarget: 'off', lfoRate: 0.2, lfoDepth: 0.15, arp: 'off', send: true },
    pad:    { model: 'vapor', volume: 0.32, detune: 0, attack: 2.0, decay: 0.8, sustain: 0.9, release: 3.5, cutoff: 0.3, resonance: 0.2, fenvAmount: 0.2, fenvDecay: 0.7, character: 0.6, lfoTarget: 'filter', lfoRate: 0.05, lfoDepth: 0.25, arp: 'off', send: true },
    master: { reverbSize: 0.7, reverbWet: 0.5, delayTime: 0.6, delayFB: 0.35, delayWet: 0.3, sidechain: 0.0, tapeSat: 0.4, masterGain: 0.8 },
  },
};
function mergeVoicing(defaultVoicing, deltas) {
  const d = deltas || {};
  return {
    trackParams: {
      bass: { ...defaultVoicing.bass, ...(d.bass || {}) },
      lead: { ...defaultVoicing.lead, ...(d.lead || {}) },
      pad:  { ...defaultVoicing.pad,  ...(d.pad  || {}) },
    },
    masterState: { ...defaultVoicing.master, ...(d.master || {}) },
  };
}
// <<VOICING_END>>
```

- [ ] **Step 4: Run, verify PASS** (Headless: Sentinel-Block `VOICING_START/END` extrahieren).
- [ ] **Step 5: Commit** — `git commit -am "feat(voicing): ENGINE_VOICINGS + mergeVoicing (canonical per-engine defaults)"`

---

## Task 7: applyGenreVoicing → ENGINE_VOICINGS

**Files:** Modify `synthwave_surfer.html` (3275–3294).

- [ ] **Step 1: Implement** — `GENRE_REF`/`GENRE_BASS`/`applyGenreVoicing` (Zeilen 3275–3294) ersetzen durch:

```js
function applyGenreVoicing(algoName) {
  const v = ENGINE_VOICINGS[algoName];
  if (!v) return;
  const merged = mergeVoicing(v, null);
  Object.assign(trackParams.bass, merged.trackParams.bass);
  Object.assign(trackParams.lead, merged.trackParams.lead);
  Object.assign(trackParams.pad,  merged.trackParams.pad);
  Object.assign(masterState,      merged.masterState);
  for (const k of ['bass', 'lead', 'pad']) syncTrackUI(k);
  syncMasterUI();
  if (liveSynths) {
    setTrackModel(liveSynths, 'bass', trackParams.bass.model, trackParams.bass);
    setTrackModel(liveSynths, 'lead', trackParams.lead.model, trackParams.lead);
    setTrackModel(liveSynths, 'pad',  trackParams.pad.model,  trackParams.pad);
    applyAllToGraph(liveSynths);
  }
}
```

> Der `/* Genre-Voicing ... */`-Kommentarblock (3272–3274) kann entfernt werden (durch den VOICING-Block ersetzt). `GENRE_REF`/`GENRE_BASS` entfallen ersatzlos.

- [ ] **Step 2: Verifikation** — Browser: Klick auf jede Card lädt die jeweilige Default-Voicing; carpenter-Card lädt die dunkle Voicing; keine Konsolenfehler.
- [ ] **Step 3: Commit** — `git commit -am "refactor(voicing): applyGenreVoicing reads ENGINE_VOICINGS (retire GENRE_REF)"`

---

## Task 8: FACTORY_PRESETS aufs neue Schema

**Files:** Modify `synthwave_surfer.html` (`FACTORY_PRESETS`, 2210–~2960).

> Größter Edit. Jedes der 6 Presets von `{ tag, algoName, bpm, mode, seed, bass, lead, pad, master, fixedSwmd }` → `{ engine, seed, bpm, mode, tag, voicing }`. `voicing` = SPARSE Delta gegen `ENGINE_VOICINGS[engine]`. Beim primären Preset jeder Engine (gleiche Voicing wie Default) ist `voicing` leer/entfällt. `fixedSwmd` KOMPLETT entfernen.

Engine-Zuordnung + Voicing-Delta-Quelle:
| Preset | engine | voicing-Delta |
|---|---|---|
| Miami Nights | `outrun` | `{}` (= outrun-Default) |
| Highway Cruise | `outrun` | Differenz Highway(2339–2342) vs ENGINE_VOICINGS.outrun |
| Blade Runner Rain | `noir` | `{}` (= noir-Default) |
| Carpenter Synth | `carpenter` | `{}` (= carpenter-Default) |
| Mall Bliss | `dreamwave` | Differenz Mall(2806–2809) vs ENGINE_VOICINGS.dreamwave |
| VHS Sunset | `dreamwave` | `{}` (= dreamwave-Default) |

- [ ] **Step 1: Implement** — `FACTORY_PRESETS` durch das neue Objekt ersetzen. Beispiel-Form pro Eintrag:

```js
const FACTORY_PRESETS = {
  'Miami Nights':     { engine: 'outrun',    seed: 1986, bpm: 120, mode: 'aeolian',  tag: 'Outrun · classic' },
  'Highway Cruise':   { engine: 'outrun',    seed: 1984, bpm: 108, mode: 'aeolian',  tag: 'Outrun · chilled',  voicing: { /* nur abweichende Felder pro Spur */ } },
  'Blade Runner Rain':{ engine: 'noir',      seed: 2019, bpm: 80,  mode: 'aeolian',  tag: 'Noir · cinematic' },
  'Carpenter Synth':  { engine: 'carpenter', seed: 1978, bpm: 92,  mode: 'phrygian', tag: 'Carpenter · horror' },
  'Mall Bliss':       { engine: 'dreamwave', seed: 1985, bpm: 100, mode: 'aeolian',  tag: 'Dreamwave · hazy',  voicing: { /* nur abweichende Felder */ } },
  'VHS Sunset':       { engine: 'dreamwave', seed: 1989, bpm: 96,  mode: 'aeolian',  tag: 'Dreamwave · warm' },
};
```

> Für `Highway Cruise` und `Mall Bliss`: heutige `bass/lead/pad/master`-Objekte mit dem jeweiligen ENGINE_VOICINGS-Default vergleichen; nur die abweichenden Keys als `voicing: { bass:{...}, lead:{...}, pad:{...}, master:{...} }` eintragen. Seeds sind Platzhalter (heutige Werte) bis zur Kuratierung (Task 11).

- [ ] **Step 2: Verifikation** — Browser: Preset-Liste rendert 6 Einträge; kein `fixedSwmd`-Verweis mehr; `grep -c fixedSwmd synthwave_surfer.html` == 0 in Preset-Defs (der `applyFactoryPreset`-Branch wird in Task 9 entfernt).
- [ ] **Step 3: Commit** — `git commit -am "refactor(presets): settings-first schema (engine+seed+voicing-deltas, drop fixedSwmd)"`

---

## Task 9: applyFactoryPreset → applyPreset

**Files:** Modify `synthwave_surfer.html` (3117–3164).

- [ ] **Step 1: Implement** — gesamte `applyFactoryPreset`-Funktion (3117–3164) ersetzen durch:

```js
function applyPreset(name) {
  const p = FACTORY_PRESETS[name];
  if (!p) return;
  const algo = ALGORITHMS[p.engine];
  // select engine (radio + card)
  document.querySelectorAll('input[name="algo"]').forEach(r => r.checked = (r.value === p.engine));
  document.querySelectorAll('.algo-card').forEach(c => c.classList.toggle('active', c.dataset.algo === p.engine));
  // merge canonical voicing + sparse preset deltas
  const merged = mergeVoicing(ENGINE_VOICINGS[p.engine], p.voicing);
  Object.assign(trackParams.bass, merged.trackParams.bass);
  Object.assign(trackParams.lead, merged.trackParams.lead);
  Object.assign(trackParams.pad,  merged.trackParams.pad);
  Object.assign(masterState,      merged.masterState);
  if (trackParams.bass.lfoTarget === 'pwm' && trackParams.bass.model !== 'stratos') trackParams.bass.lfoTarget = 'off';
  // settings
  $('seed').value = p.seed;
  $('bpm').value  = p.bpm  ?? algo.defaultBpm;
  $('mode').value = p.mode ?? algo.defaultMode;
  for (const k of ['bass','lead','pad']) syncTrackUI(k);
  syncMasterUI();
  // presets are generative now — no fixedSwmd
  currentSwmd = null;
  patternMode = 'generative';
  const btn = $('pattern-toggle');
  if (btn) { btn.className = 'pattern-toggle generative'; btn.textContent = '⚙ Generativ'; }
  generate();
  if (liveSynths) {
    setTrackModel(liveSynths, 'bass', trackParams.bass.model, trackParams.bass);
    setTrackModel(liveSynths, 'lead', trackParams.lead.model, trackParams.lead);
    setTrackModel(liveSynths, 'pad',  trackParams.pad.model,  trackParams.pad);
    applyAllToGraph(liveSynths);
  }
  setStatus('✓ Preset loaded: ' + name + ' (generative · seed ' + p.seed + ')');
}
```

- [ ] **Step 2: Update call sites** — `grep -n "applyFactoryPreset" synthwave_surfer.html`. Jeden Aufruf (Preset-Liste-Renderer + Boot bei ~3627) auf `applyPreset` umbenennen.

- [ ] **Step 3: Verifikation** — Browser: jedes der 6 Presets laden → generativer Modus, Toggle zeigt „Generativ", Sound spielt, keine Fehler. Boot lädt Default-Preset generativ.
- [ ] **Step 4: Commit** — `git commit -am "refactor(presets): applyPreset (generative, mergeVoicing) replaces applyFactoryPreset"`

---

## Task 10: Test-Harness bereinigen

**Files:** Modify `synthwave_surfer.html` (`tests`-Array 3642–4134).

- [ ] **Step 1: Identify** — `grep -n "stratos\|fixedSwmd\|swmdSerialize\|swmdParse" synthwave_surfer.html` im `tests`-Bereich. Tests, die den EINGEFRORENEN Preset-`fixedSwmd`-Inhalt asserten (z.B. `s.model === 'stratos'` aus Preset-Roundtrips), entfernen — die Codec-Roundtrip-Tests mit EIGENEN Test-Strings BLEIBEN (User-File-Import/-Export).
- [ ] **Step 2: Implement** — nur die preset-fixedSwmd-abhängigen Assertions entfernen; generische Codec-Tests unangetastet lassen.
- [ ] **Step 3: Run full headless suite** — alle Nicht-`[PROBE]`-Tests grün, inkl. der neuen Carpenter-/Voicing-Tests.
- [ ] **Step 4: Browser `?test=1`** — Konsole: `X passed, 0 failed` (Probes wie gehabt).
- [ ] **Step 5: Commit** — `git commit -am "test: drop frozen-preset fixedSwmd assertions, keep codec roundtrip"`

---

## Task 11: Seed-Kuratierung (USER-Ohr-Phase — nicht autonom)

**Files:** Modify `synthwave_surfer.html` (`FACTORY_PRESETS[*].seed`).

- [ ] **Step 1: Server** — `python3 -m http.server 8745`, App auf `http://localhost:8745/synthwave_surfer.html`.
- [ ] **Step 2: Pro Preset** (Carpenter zuerst): Engine+Voicing via Preset laden, 5–8 Seeds durchhören (Random-Seed-Button / manuell), besten merken.
- [ ] **Step 3: Lock** — Claude trägt die von Johannes gewählten Seeds in `FACTORY_PRESETS[name].seed` ein.
- [ ] **Step 4: Commit** — `git commit -am "tune(presets): curate locked seeds per preset"`

---

## Task 12: Abschluss-Verifikation

- [ ] Headless: vollständige pure-function-Suite grün (Carpenter-Engine, mergeVoicing, ENGINE_VOICINGS, Codec).
- [ ] Browser-Hörtest: 4 Cards + 6 Presets klingen plausibel; Carpenter ≠ Blade Runner hörbar; Filter/Cutoff/Voicing intakt.
- [ ] `grep -c fixedSwmd synthwave_surfer.html` == 0.
- [ ] Memory aktualisieren (`project_synthwave_surfer`): Neufassung umgesetzt, 4 Engines, settings-first Presets.

---

## Self-Review (gegen Spec)

- **Spec §3 Engines/Voicings** → Tasks 1–6 (carpenter engine) + Task 6 (ENGINE_VOICINGS) ✓
- **Spec §4 Datenmodell** (mergeVoicing/applyPreset/Schema) → Tasks 6, 8, 9 ✓
- **Spec §5 Carpenter-Engine** → Tasks 1–5 ✓
- **Spec §6 Remap** → Task 8 (Carpenter Synth → carpenter) ✓
- **Spec §7 Codec/Fixed** → Task 9 (presets generativ; `fixed` bleibt für Import; `currentSwmd=null`) ✓
- **Spec §8 Tests** → Tasks 1,2,3,6 (neu) + Task 10 (raus) ✓
- **Spec §9 Kuratierung** → Task 11 ✓
- **Typkonsistenz:** `mergeVoicing` liefert `{trackParams,masterState}` — konsistent in Task 6 (Def), 7, 9 (Nutzung). `applyPreset`-Name konsistent Task 9 + Call-Sites. `ENGINE_VOICINGS[engine]` Keys = `bass/lead/pad/master` durchgängig. ✓
- **Placeholder-Scan:** Die `/* COPY ... */`-Marker in Task 6 sind bewusste „kopiere bestehende Objekte aus Zeile N"-Anweisungen (Werte existieren im Code), kein offenes TBD. Seeds in Task 8 sind explizit Platzhalter bis Task 11. ✓
