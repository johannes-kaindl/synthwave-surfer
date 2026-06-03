# Motivic Melody Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the random-walk lead generators with a motif-development engine that produces memorable, harmony-aware, genre-distinct melodies.

**Architecture:** Pure, deterministic JS functions in the algo block of the single-file app. A genre profile drives a seed-motif generator, a set of development operators, a contour shaper, and a harmony-lander; a phrase assembler combines them. Output format is identical to today (`{degree,duration}`/`{rest,duration}`), so it drops into `ALGORITHMS.*.leadGenA/B` with no downstream changes.

**Tech Stack:** Vanilla JS (ES2017), Tone.js 14 (audio only — the melody engine itself uses no Tone/DOM), single-file `synthwave_surfer.html`, inline browser test harness (`?test=1`).

---

## Conventions for every task

- **All code lives in `synthwave_surfer.html`.** No new files.
- **Engine functions** go in the algo block: insert after the `snapDegree` function (closing `}` at ~line 503) and before the SWMD-codec comment banner (`/* ═══ ... ═══ */` at ~line 505). Append each task's function(s) to the bottom of this block, in task order.
- **Tests** go into the `tests` array inside `runCodecTests` (~lines 3393–3795). Add each new `[name, fn]` entry immediately before the closing `];` at ~line 3795. Functions under test are top-level and available by the time `runCodecTests` runs.
- **Running tests (no CLI runner — browser console):**
  1. Ensure an HTTP server serves the repo root: `python3 -m http.server 8090` (audio needs HTTP, but tests run fine too).
  2. Open `http://localhost:8090/synthwave_surfer.html?test=1`, open DevTools console.
  3. Read the final line: `━━━ Done: <N> passed, <M> failed | Probes: ... ━━━`.
  - Baseline before this plan: **28 passed, 0 failed**. Each task adds tests; the passed count grows and `failed` must stay `0`.
  - These melody functions are pure, so they may alternatively be verified headlessly by extracting the algo block into Node — but the canonical gate is the browser console count above.
- **Commit style:** conventional commits, e.g. `feat(algo): ...`. End commit messages with the project's `Co-Authored-By` trailer.

---

## File Structure

Only `synthwave_surfer.html` changes:

- **Algo block (~L360–504):** new `MELODY_PROFILES` data + engine functions (`weightedPick`, `makeMotif`, `opRepeat/opSequence/opInvert/opVaryRhythm/opFragment/opOrnament`, `applyNamedOp`, `pickContour`, `landOnHarmony`, `generateMelody`).
- **`ALGORITHMS` config (~L906–931):** `leadGenA/B` rewired to `generateMelody`. Old `generate*Lead` kept as fallback.
- **Test harness (~L3393–3795):** new `[name, fn]` entries.

---

## Task 1: Profiles + `weightedPick` helper

**Files:**
- Modify: `synthwave_surfer.html` (algo block ~L503; tests array ~L3795)

- [ ] **Step 1: Write the failing tests** — add to the `tests` array:

```javascript
['weightedPick — respects weights deterministically', () => {
  const rng = mulberry32(1);
  const counts = { a: 0, b: 0 };
  for (let i = 0; i < 1000; i++) counts[weightedPick(rng, { a: 0.9, b: 0.1 })]++;
  assert(counts.a > counts.b * 3, 'a chosen far more than b');
  assert(JSON.stringify([weightedPick(mulberry32(5), {x:1,y:1}), weightedPick(mulberry32(5), {x:1,y:1})]).split(',')[0] ===
         JSON.stringify([weightedPick(mulberry32(5), {x:1,y:1})]).split(',')[0], 'same seed → same pick');
}],
['MELODY_PROFILES — three genres with valid shape', () => {
  for (const g of ['outrun', 'noir', 'dreamwave']) {
    const p = MELODY_PROFILES[g];
    assert(Array.isArray(p.grammar) && p.grammar.length >= 1, g + ' has grammar');
    assert(p.rhythmCells.every(c => c.length >= p.motifLen[0] && c.length <= p.motifLen[1]), g + ' cells within motifLen');
    const wsum = Object.values(p.opWeights).reduce((s, w) => s + w, 0);
    assert(Math.abs(wsum - 1) < 1e-6, g + ' opWeights sum to 1');
  }
}],
```

- [ ] **Step 2: Run tests, verify they fail**

Open `http://localhost:8090/synthwave_surfer.html?test=1` → console shows the two new tests failing (`weightedPick is not defined`, `MELODY_PROFILES is not defined`). `failed` ≥ 2.

- [ ] **Step 3: Implement** — append to the algo block (after `snapDegree`, ~L503):

```javascript
/* ═══════════════════════════════════════════════════════════════════
   Motif-development melody engine
   ═══════════════════════════════════════════════════════════════════ */
function weightedPick(rng, weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
  return entries[entries.length - 1][0];
}

const MELODY_PROFILES = {
  outrun: {
    motifLen: [3, 5],
    rhythmCells: [[4,4,4,4],[4,2,2,4],[2,2,4,8],[4,4,8],[2,2,2,2,8]],
    stepBias: 0.7, leapSizes: [2, 3, 4], restDensity: 0.12,
    opWeights: { repeat:0.25, sequence:0.30, invert:0.10, varyRhythm:0.20, fragment:0.10, ornament:0.05 },
    contours: ['arch','wave','rise'], register: [0, 9],
    grammar: ['A','A2','B','A3'], startDegree: 4,
  },
  noir: {
    motifLen: [2, 3],
    rhythmCells: [[8,8],[12,4],[8,4,4]],
    stepBias: 0.85, leapSizes: [2, 4], restDensity: 0.30,
    opWeights: { repeat:0.45, sequence:0.20, invert:0.05, varyRhythm:0.15, fragment:0.10, ornament:0.05 },
    contours: ['fall','arch'], register: [0, 7],
    grammar: ['A','A','A2','B'], startDegree: 2,
  },
  dreamwave: {
    motifLen: [3, 5],
    rhythmCells: [[2,2,4,2,6],[4,2,2,4,4],[2,2,2,2,8],[4,4,4,4]],
    stepBias: 0.75, leapSizes: [2, 3], restDensity: 0.15,
    opWeights: { repeat:0.20, sequence:0.25, invert:0.10, varyRhythm:0.25, fragment:0.10, ornament:0.10 },
    contours: ['wave','arch','rise'], register: [0, 9],
    grammar: ['A','A2','B','A2'], startDegree: 2,
  },
};
```

- [ ] **Step 4: Run tests, verify they pass**

Reload `?test=1` → both new tests pass. `failed` back to `0`, `passed` = 30.

- [ ] **Step 5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat(algo): melody-engine profiles + weightedPick helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `makeMotif`

**Files:**
- Modify: `synthwave_surfer.html` (algo block; tests array)

- [ ] **Step 1: Write the failing test** — add to the `tests` array:

```javascript
['makeMotif — deterministic, correct length, relative format', () => {
  const a = makeMotif(mulberry32(42), MELODY_PROFILES.outrun);
  const b = makeMotif(mulberry32(42), MELODY_PROFILES.outrun);
  assert(JSON.stringify(a) === JSON.stringify(b), 'same seed → same motif');
  assert(a.length >= MELODY_PROFILES.outrun.motifLen[0] && a.length <= MELODY_PROFILES.outrun.motifLen[1], 'length within motifLen');
  assert(a.every(n => typeof n.deg === 'number' && typeof n.dur === 'number'), 'each note has deg+dur');
  assert(a[0].deg === 0, 'motif starts on relative root 0');
}],
```

- [ ] **Step 2: Run test, verify it fails**

Reload `?test=1` → `makeMotif is not defined`. `failed` ≥ 1.

- [ ] **Step 3: Implement** — append to the algo block:

```javascript
function makeMotif(rng, profile) {
  const cell = profile.rhythmCells[Math.floor(rng() * profile.rhythmCells.length)];
  const motif = [];
  let deg = 0;
  for (let i = 0; i < cell.length; i++) {
    motif.push({ deg, dur: cell[i] });
    if (rng() < profile.stepBias) {
      deg += rng() < 0.5 ? 1 : -1;
    } else {
      const leap = profile.leapSizes[Math.floor(rng() * profile.leapSizes.length)];
      deg += rng() < 0.5 ? leap : -leap;
    }
  }
  return motif;
}
```

- [ ] **Step 4: Run test, verify it passes**

Reload `?test=1` → passes. `passed` = 31, `failed` = 0.

- [ ] **Step 5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat(algo): makeMotif — seed-motif generator

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Development operators + `applyNamedOp`

**Files:**
- Modify: `synthwave_surfer.html` (algo block; tests array)

- [ ] **Step 1: Write the failing tests** — add to the `tests` array:

```javascript
['operators — sequence/invert/fragment preserve format & transform', () => {
  const m = [{deg:0,dur:4},{deg:2,dur:4},{deg:1,dur:4}];
  assert(JSON.stringify(opSequence(m, 2)) === JSON.stringify([{deg:2,dur:4},{deg:4,dur:4},{deg:3,dur:4}]), 'sequence +2');
  assert(JSON.stringify(opInvert(m, 0)) === JSON.stringify([{deg:0,dur:4},{deg:-2,dur:4},{deg:-1,dur:4}]), 'invert around 0');
  const frag = opFragment([{deg:0,dur:4},{deg:1,dur:4},{deg:2,dur:4},{deg:3,dur:4}], mulberry32(3));
  assert(frag.length >= 2 && frag.length <= 4, 'fragment 2..len notes');
  assert(opRepeat(m) !== m && JSON.stringify(opRepeat(m)) === JSON.stringify(m), 'repeat is a copy');
}],
['operators — varyRhythm/ornament keep valid format', () => {
  const m = [{deg:0,dur:4},{deg:2,dur:4},{deg:1,dur:4}];
  const vr = opVaryRhythm(m, mulberry32(9), MELODY_PROFILES.outrun);
  assert(vr.every(n => typeof n.deg === 'number' && n.dur >= 1), 'varyRhythm valid');
  const orn = opOrnament(m, mulberry32(9));
  assert(orn.length >= m.length && orn.every(n => typeof n.deg === 'number' && n.dur >= 1), 'ornament valid');
  assert(JSON.stringify(applyNamedOp('sequence', m, mulberry32(2), MELODY_PROFILES.outrun)) ===
         JSON.stringify(applyNamedOp('sequence', m, mulberry32(2), MELODY_PROFILES.outrun)), 'applyNamedOp deterministic');
}],
```

- [ ] **Step 2: Run tests, verify they fail**

Reload `?test=1` → `opSequence is not defined`. `failed` ≥ 1.

- [ ] **Step 3: Implement** — append to the algo block:

```javascript
function opRepeat(m) { return m.map(n => ({ deg: n.deg, dur: n.dur })); }
function opSequence(m, iv) { return m.map(n => ({ deg: n.deg + iv, dur: n.dur })); }
function opInvert(m, axis) { return m.map(n => ({ deg: axis - (n.deg - axis), dur: n.dur })); }
function opVaryRhythm(m, rng, profile) {
  const sameLen = profile.rhythmCells.filter(c => c.length === m.length);
  if (sameLen.length) {
    const cell = sameLen[Math.floor(rng() * sameLen.length)];
    return m.map((n, i) => ({ deg: n.deg, dur: cell[i] }));
  }
  const factor = rng() < 0.5 ? 2 : 0.5;
  return m.map(n => ({ deg: n.deg, dur: Math.max(1, Math.round(n.dur * factor)) }));
}
function opFragment(m, rng) {
  if (m.length <= 2) return m.map(n => ({ deg: n.deg, dur: n.dur }));
  const start = Math.floor(rng() * (m.length - 1));
  const len = Math.max(2, Math.floor(rng() * (m.length - start)) + 1);
  return m.slice(start, start + len).map(n => ({ deg: n.deg, dur: n.dur }));
}
function opOrnament(m, rng) {
  const out = [];
  for (let i = 0; i < m.length; i++) {
    const n = m[i];
    if (i < m.length - 1 && n.dur >= 4 && rng() < 0.4) {
      const half = Math.floor(n.dur / 2);
      const passing = m[i + 1].deg >= n.deg ? n.deg + 1 : n.deg - 1;
      out.push({ deg: n.deg, dur: n.dur - half });
      out.push({ deg: passing, dur: half });
    } else {
      out.push({ deg: n.deg, dur: n.dur });
    }
  }
  return out;
}
function applyNamedOp(name, motif, rng, profile) {
  switch (name) {
    case 'repeat':    return opRepeat(motif);
    case 'sequence':  return opSequence(motif, (rng() < 0.5 ? 1 : -1) * profile.leapSizes[Math.floor(rng() * profile.leapSizes.length)]);
    case 'invert':    return opInvert(motif, motif[0].deg);
    case 'varyRhythm':return opVaryRhythm(motif, rng, profile);
    case 'fragment':  return opFragment(motif, rng);
    case 'ornament':  return opOrnament(motif, rng);
    default:          return opRepeat(motif);
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

Reload `?test=1` → pass. `passed` = 33, `failed` = 0.

- [ ] **Step 5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat(algo): melody development operators + applyNamedOp

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `pickContour`

**Files:**
- Modify: `synthwave_surfer.html` (algo block; tests array)

- [ ] **Step 1: Write the failing test** — add to the `tests` array:

```javascript
['pickContour — one offset per grammar slot, deterministic', () => {
  const a = pickContour(mulberry32(11), MELODY_PROFILES.outrun);
  const b = pickContour(mulberry32(11), MELODY_PROFILES.outrun);
  assert(JSON.stringify(a) === JSON.stringify(b), 'same seed → same contour');
  assert(a.length === MELODY_PROFILES.outrun.grammar.length, 'one offset per slot');
  assert(a.every(v => Number.isInteger(v)), 'integer offsets');
}],
```

- [ ] **Step 2: Run test, verify it fails**

Reload `?test=1` → `pickContour is not defined`. `failed` ≥ 1.

- [ ] **Step 3: Implement** — append to the algo block:

```javascript
function pickContour(rng, profile) {
  const shape = profile.contours[Math.floor(rng() * profile.contours.length)];
  const n = profile.grammar.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    let v;
    if (shape === 'arch') v = Math.round(3 * Math.sin(Math.PI * t));
    else if (shape === 'rise') v = Math.round(3 * t);
    else if (shape === 'fall') v = Math.round(3 * (1 - t));
    else v = (i % 2) * 2; // wave
    out.push(v);
  }
  return out;
}
```

- [ ] **Step 4: Run test, verify it passes**

Reload `?test=1` → pass. `passed` = 34, `failed` = 0.

- [ ] **Step 5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat(algo): pickContour — phrase contour shaper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `landOnHarmony`

**Files:**
- Modify: `synthwave_surfer.html` (algo block; tests array)

Depends on the existing `nearestChordDegree` (~L485) and `SCALES` (~L343).

- [ ] **Step 1: Write the failing test** — add to the `tests` array:

```javascript
['landOnHarmony — snaps strong-beat notes to chord tones', () => {
  const scaleLen = SCALES.aeolian.length;            // 7
  const chordMap = [{ root: 0, tones: [0, 2, 4] }];  // Am triad as scale degrees
  // events: a strong-beat (pos 0) non-chord note (deg 1) followed by weak-beat notes
  const events = [{ degree: 1, duration: 8 }, { degree: 3, duration: 8 }];
  landOnHarmony(events, chordMap, scaleLen, 0);
  assert([0, 2, 4].includes(((events[0].degree % scaleLen) + scaleLen) % scaleLen), 'strong-beat note is a chord tone');
  assert(events[1].degree === 3, 'weak-beat note (pos 8 is also strong here) left or snapped consistently');
}],
```

Note: with `pos % 8 === 0`, both pos 0 and pos 8 are "strong". The second assert documents that; if you change strong-beat granularity later, update it.

- [ ] **Step 2: Run test, verify it fails**

Reload `?test=1` → `landOnHarmony is not defined`. `failed` ≥ 1.

- [ ] **Step 3: Implement** — append to the algo block:

```javascript
function landOnHarmony(events, chordMap, scaleLen, startBar) {
  let pos = 0;
  for (const e of events) {
    if (!e.rest && pos % 8 === 0) {
      const bar = Math.min(startBar + Math.floor(pos / 16), chordMap.length - 1);
      const tones = chordMap[bar].tones;
      const pc = ((e.degree % scaleLen) + scaleLen) % scaleLen;
      const chordPcs = tones.map(ct => ((ct % scaleLen) + scaleLen) % scaleLen);
      if (!chordPcs.includes(pc)) {
        e.degree = nearestChordDegree(e.degree, tones, scaleLen);
      }
    }
    pos += e.duration;
  }
  return events;
}
```

The test's second event lands at pos 8 (also strong); deg 3 is not in [0,2,4] so it snaps to nearest chord tone (2 or 4). Update the second assert to:

```javascript
  assert([0, 2, 4].includes(((events[1].degree % scaleLen) + scaleLen) % scaleLen), 'pos-8 note also snapped to chord tone');
```

- [ ] **Step 4: Run test, verify it passes**

Reload `?test=1` → pass. `passed` = 35, `failed` = 0.

- [ ] **Step 5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat(algo): landOnHarmony — strong-beat chord-tone snapping

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `generateMelody` assembler

**Files:**
- Modify: `synthwave_surfer.html` (algo block; tests array)

- [ ] **Step 1: Write the failing tests** — add to the `tests` array:

```javascript
['generateMelody — fills exactly bars*16, valid events, in register, deterministic', () => {
  const sl = SCALES.aeolian.length;
  const chordMap = buildChordMap([[0,2,4],[-2,0,2],[2,4,6],[-1,1,3]], 16);
  const ctx = { chordMap, profile: MELODY_PROFILES.outrun, startBar: 4 };
  const a = generateMelody(mulberry32(1986), sl, 4, ctx);
  const b = generateMelody(mulberry32(1986), sl, 4, ctx);
  assert(JSON.stringify(a) === JSON.stringify(b), 'same seed → same melody');
  assert(a.reduce((s, e) => s + e.duration, 0) === 4 * 16, 'durations sum to bars*16');
  assert(a.every(e => e.rest || (e.degree >= 0 && e.degree <= 9)), 'notes within outrun register');
  assert(a.some(e => !e.rest), 'has at least one note');
}],
['generateMelody — single-slot grammar reproduces the motif (motif presence)', () => {
  const prof = { ...MELODY_PROFILES.outrun, grammar: ['A'], contours: ['rise'], restDensity: 0 };
  const motif = makeMotif(mulberry32(7), prof);
  const ev = generateMelody(mulberry32(7), SCALES.aeolian.length, 4, { profile: prof });
  const clamp = d => Math.max(prof.register[0], Math.min(prof.register[1], d));
  assert(ev[0].degree === clamp(prof.startDegree + motif[0].deg), 'first note = motif root transposed');
  assert(ev[0].duration === motif[0].dur, 'first note duration from motif');
}],
```

- [ ] **Step 2: Run tests, verify they fail**

Reload `?test=1` → `generateMelody is not defined`. `failed` ≥ 1.

- [ ] **Step 3: Implement** — append to the algo block:

```javascript
function generateMelody(rng, scaleLen, bars, ctx = {}) {
  const { chordMap = null, profile, startBar = 0 } = ctx;
  const total = bars * 16;
  const motif = makeMotif(rng, profile);
  const contour = pickContour(rng, profile);
  const events = [];
  let pos = 0;

  for (let slot = 0; slot < profile.grammar.length && pos < total; slot++) {
    const label = profile.grammar[slot];
    let inst;
    if (label === 'A') {
      inst = opRepeat(motif);
    } else if (label === 'B') {
      inst = rng() < 0.5 ? opInvert(motif, motif[0].deg) : opSequence(motif, profile.leapSizes[0]);
    } else {
      inst = applyNamedOp(weightedPick(rng, profile.opWeights), motif, rng, profile);
    }
    const root = profile.startDegree + (contour[slot] || 0);
    for (const n of inst) {
      if (pos >= total) break;
      let dur = n.dur;
      if (pos + dur > total) dur = total - pos;
      let degree = root + n.deg;
      degree = Math.max(profile.register[0], Math.min(profile.register[1], degree));
      events.push({ degree, duration: dur });
      pos += dur;
    }
    if (pos < total && rng() < profile.restDensity * 2) {
      const r = Math.min(2, total - pos);
      events.push({ rest: true, duration: r });
      pos += r;
    }
  }
  if (pos < total) events.push({ rest: true, duration: total - pos });
  if (chordMap) landOnHarmony(events, chordMap, scaleLen, startBar);
  return events;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Reload `?test=1` → pass. `passed` = 37, `failed` = 0.

- [ ] **Step 5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat(algo): generateMelody — phrase assembler (motif + development + contour + harmony)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire engine into `ALGORITHMS` + ear validation

**Files:**
- Modify: `synthwave_surfer.html` (`ALGORITHMS` config ~L906–931)

The old `generate{Outrun,Noir,Dreamwave}Lead` functions stay in place as a fallback/reference; only the `leadGenA/B` wrappers change.

- [ ] **Step 1: Rewire `leadGenA/B`** — replace the three pairs of `leadGenA`/`leadGenB` lines:

`outrun` (~L906–907):

```javascript
    leadGenA: (rng, sl, ctx) => generateMelody(rng, sl, 4, { ...ctx, profile: MELODY_PROFILES.outrun, startBar: 4 }),
    leadGenB: (rng, sl, ctx) => generateMelody(rng, sl, 4, { ...ctx, profile: MELODY_PROFILES.outrun, startBar: 10 }),
```

`noir` (~L918–919):

```javascript
    leadGenA: (rng, sl, ctx) => generateMelody(rng, sl, 4, { ...ctx, profile: MELODY_PROFILES.noir, startBar: 4 }),
    leadGenB: (rng, sl, ctx) => generateMelody(rng, sl, 4, { ...ctx, profile: MELODY_PROFILES.noir, startBar: 8 }),
```

`dreamwave` (~L930–931):

```javascript
    leadGenA: (rng, sl, ctx) => generateMelody(rng, sl, 4, { ...ctx, profile: MELODY_PROFILES.dreamwave, startBar: 4 }),
    leadGenB: (rng, sl, ctx) => generateMelody(rng, sl, 4, { ...ctx, profile: MELODY_PROFILES.dreamwave, startBar: 10 }),
```

- [ ] **Step 2: Verify existing tests stay green**

Reload `?test=1` → still `0 failed` (all 28 original + new melody tests pass; the rewire doesn't touch tested codec paths).

- [ ] **Step 3: Ear validation in the browser (the real gate)**

1. Open `http://localhost:8090/synthwave_surfer.html` (no `?test=1`).
2. Switch the pattern toggle to **Generativ** (presets are still frozen `fixedSwmd` — to hear the new engine you must be in generative mode).
3. For each algo (Outrun / Noir / Dreamwave): generate, press Play, listen. Confirm the lead now sounds **motivic** (a recognizable idea that repeats/develops) rather than a random walk, with genre-appropriate character (flowing Outrun, sparse Noir, dreamy Dreamwave).
4. Re-generate a few times (new seeds) to hear the bandwidth/variety.

- [ ] **Step 4: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat(algo): wire motif engine into leadGenA/B (generative mode)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Hörtest-Iteration (project mode)**

Per Phase-1.5 mode (ear is ground truth): if a genre's melody feels off, tune that genre's `MELODY_PROFILES` values (e.g. `opWeights`, `restDensity`, `grammar`, `rhythmCells`, `register`), reload, listen, and commit each accepted tweak (`fix(algo): tune <genre> melody profile — <change>`). The inline tests guard the structural invariants while you tune freely.

---

## Self-Review (completed by plan author)

- **Spec coverage:** profiles (T1), makeMotif (T2), operators (T3), contour (T4), harmony-lander (T5), assembler (T6), integration + ear validation + fallback retention (T7), all five spec test categories covered (determinism T2/T4/T6, format/sum T6, harmony T5, motif-presence T6, register T6). ✓
- **Placeholders:** none — every step has runnable code/commands. ✓
- **Type/name consistency:** `weightedPick`, `makeMotif(rng, profile)`, `op*`, `applyNamedOp(name, motif, rng, profile)`, `pickContour(rng, profile)`, `landOnHarmony(events, chordMap, scaleLen, startBar)`, `generateMelody(rng, scaleLen, bars, ctx)` used identically across all tasks. ✓
- **Note:** `makeMotif` uses signature `(rng, profile)` — a deliberate refinement of the spec's `(rng, scaleLen, profile, chordTones)`; harmony handling moved entirely into `landOnHarmony`, so `scaleLen`/`chordTones` aren't needed in `makeMotif`.
