# Synthwave Surfer Phase 1 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `.swmd` codec with multi-phase support, the Phase Engine state machine, the external `window.synthwaveSurfer.*` API, six curated multi-phase factory presets, and fix the WAV export. Stays within `synthwave_surfer.html` (single-file, no build step).

**Architecture:** All code lives in `synthwave_surfer.html`. New JS code is inserted in clearly-defined regions (codec helpers after line 489 (before the line 491 Form Builders block), Phase Engine + API after FACTORY_PRESETS, UI hookups after existing event handlers). The codec is a set of pure functions (parsers + serializers) easy to unit-test with an inline test harness. The Phase Engine is a tiny state machine that hooks into the existing `generate()`. The external API is a frozen `window.synthwaveSurfer` object exposed at app init.

**Tech Stack:** Vanilla JS (ES2020), Tone.js 14 (already loaded via CDN), no build step, single HTML file. Tests are inline JS functions executed via a dev-only `?test=1` URL parameter that prints to console.

**Spec reference:** [`docs/superpowers/specs/2026-05-14-synthwave-foundations-design.md`](../specs/2026-05-14-synthwave-foundations-design.md)

---

## File Structure

Only one file is modified: `synthwave_surfer.html`.

New code is inserted in these regions (in order):

| Region | Insertion point | What goes there |
|---|---|---|
| **Codec helpers** | after line 489 (after `snapDegree`, before line 491 Form Builders block) | Frontmatter parser, section splitter, table parser, piano-roll parser/serializer, drum parser/serializer, pad parser/serializer, FX parser, instrument-settings parser, full SWMD parser/serializer |
| **Phase Engine** | after FACTORY_PRESETS (~line 1656) | State variables, `setPhase()`, `getCurrentPhaseObj()`, listener machinery |
| **buildFormFromSwmd** | right after Phase Engine | Builds a `form` object from a parsed `.swmd` for the current phase |
| **External API** | after Phase Engine | Frozen `window.synthwaveSurfer` object |
| **Modified `generate()`** | line 1695 | Branches on `patternMode === 'fixed' && currentSwmd` |
| **Modified `applyFactoryPreset()`** | line 1658 | Loads `fixedSwmd`, calls `swmdParse`, sets phase mode |
| **Modified `exportWav()`** | line 1356 | Pass `transport` from offline context destructured arg |
| **HTML — Tracks panel** | line 235 (after `harmonic-toggle`) | Pattern-mode toggle + Phase Selector container |
| **HTML — Export panel** | line 302 (after `export-wav`) | SWMD ⬇/⬆ buttons + State JSON button |
| **CSS** | line 104 (after `.harmonic-toggle.strict`) | `.pattern-toggle`, `.phase-pill` |
| **Test harness** | end of `<script>` (~line 1912) | `runCodecTests()` + `?test=1` URL trigger |

State variables added (~line 1432, near `let currentState = null;`):
```javascript
let patternMode = 'generative';        // 'generative' | 'fixed'
let currentSwmd = null;                // result of swmdParse() or null
let currentPhaseIndex = 0;             // index into currentSwmd.phases
const phaseChangeListeners = [];       // (phaseName: string) => void callbacks
```

---

## Test Strategy

This is a single-file HTML app with no test framework. We use a **lightweight inline test harness**: a `runCodecTests()` function with console output, triggered automatically when the URL contains `?test=1`. Each codec task adds a `test_*()` helper, which `runCodecTests()` calls in order. Tests use a tiny `assert(condition, message)` helper that throws on failure and logs success.

This gives us TDD-style red/green/refactor for the **pure** functions (parsers, serializers, phase engine). UI and audio behavior is verified manually per the checklist in §10 of the spec.

**Run tests:** open `synthwave_surfer.html?test=1` in a browser → check the console.

---

## Task 1: Test harness setup

**Files:**
- Modify: `synthwave_surfer.html` — append at end of `<script>` block (~line 1912)

- [x] **Step 1.1: Add `assert()` helper and empty `runCodecTests()`**

Append to the end of `<script>` (just before `</script>`):

```javascript
/* ═══════════════════════════════════════════════════════════════════
   Codec test harness (run with ?test=1)
   ═══════════════════════════════════════════════════════════════════ */
function assert(cond, msg) {
  if (cond) { console.log('  ✓ ' + msg); return; }
  console.error('  ✗ FAIL: ' + msg);
  throw new Error('Test failed: ' + msg);
}

function runCodecTests() {
  console.log('━━━ Synthwave Surfer Codec Tests ━━━');
  let passed = 0, failed = 0;
  const tests = [
    // Tests are added by subsequent tasks
  ];
  for (const [name, fn] of tests) {
    console.log('▸ ' + name);
    try { fn(); passed++; } catch (e) { failed++; console.error(e); }
  }
  console.log(`━━━ Done: ${passed} passed, ${failed} failed ━━━`);
}

if (new URLSearchParams(location.search).get('test') === '1') {
  window.addEventListener('load', () => setTimeout(runCodecTests, 100));
}
```

- [x] **Step 1.2: Verify harness runs**

Open `synthwave_surfer.html?test=1` in browser. Open DevTools console.

Expected output:
```
━━━ Synthwave Surfer Codec Tests ━━━
━━━ Done: 0 passed, 0 failed ━━━
```

- [x] **Step 1.3: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add inline codec test harness with ?test=1 trigger"
```

---

## Task 2: YAML frontmatter parser

**Files:**
- Modify: `synthwave_surfer.html` — insert after line 489 (after `snapDegree` function, before the line 491 Form Builders block)

- [x] **Step 2.1: Add failing test**

In `runCodecTests()`, add to the `tests` array:

```javascript
['parseYamlFrontmatter — extracts flat fields', () => {
  const text = '---\nname: Test\nbpm: 120\nmood: brooding\n---\n\n## Body';
  const m = parseYamlFrontmatter(text);
  assert(m.name === 'Test', 'name parsed');
  assert(m.bpm === '120', 'bpm parsed (string, not coerced)');
  assert(m.mood === 'brooding', 'mood parsed');
}],
['parseYamlFrontmatter — empty for no frontmatter', () => {
  const m = parseYamlFrontmatter('## Just a heading');
  assert(Object.keys(m).length === 0, 'empty object');
}],
['parseYamlFrontmatter — strips quoted strings', () => {
  const text = '---\nsynthwave-surfer: "1.0"\n---';
  const m = parseYamlFrontmatter(text);
  assert(m['synthwave-surfer'] === '1.0', 'quotes stripped');
}],
```

- [x] **Step 2.2: Run tests, verify they fail**

Open `synthwave_surfer.html?test=1` → console should show:
```
▸ parseYamlFrontmatter — extracts flat fields
  ✗ FAIL: ... ReferenceError: parseYamlFrontmatter is not defined
```

- [x] **Step 2.3: Implement `parseYamlFrontmatter`**

Insert after line 489 (after `snapDegree`, before the line 491 Form Builders block):

```javascript
/* ═══════════════════════════════════════════════════════════════════
   .swmd Codec — Markdown-based pattern format
   ═══════════════════════════════════════════════════════════════════ */

function parseYamlFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([\w-]+):\s*"?([^"]*)"?\s*$/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}
```

- [x] **Step 2.4: Run tests, verify they pass**

Reload `synthwave_surfer.html?test=1`. Console should show:
```
▸ parseYamlFrontmatter — extracts flat fields
  ✓ name parsed
  ✓ bpm parsed (string, not coerced)
  ✓ mood parsed
[etc., all green]
```

- [x] **Step 2.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add YAML frontmatter parser for .swmd codec"
```

---

## Task 3: Markdown table parser (helper)

**Files:**
- Modify: `synthwave_surfer.html` — append after `parseYamlFrontmatter`

- [x] **Step 3.1: Add failing test**

Add to `tests` in `runCodecTests()`:

```javascript
['parseMarkdownTable — basic 2-row table', () => {
  const text = '| Param | Value |\n|-------|-------|\n| volume | 0.7 |\n| model | stratos |';
  const rows = parseMarkdownTable(text);
  assert(rows.length === 2, 'two rows');
  assert(rows[0].Param === 'volume', 'col 1 of row 0');
  assert(rows[0].Value === '0.7', 'col 2 of row 0');
  assert(rows[1].Param === 'model', 'col 1 of row 1');
}],
['parseMarkdownTable — returns [] for no table', () => {
  assert(parseMarkdownTable('just text').length === 0, 'empty array');
}],
```

- [x] **Step 3.2: Run tests, verify they fail (parseMarkdownTable undefined)**

- [x] **Step 3.3: Implement `parseMarkdownTable`**

Append after `parseYamlFrontmatter`:

```javascript
function parseMarkdownTable(text) {
  const lines = text.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return [];
  const headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
    const row = {};
    headers.forEach((h, j) => { row[h] = cells[j] ?? ''; });
    rows.push(row);
  }
  return rows;
}
```

- [x] **Step 3.4: Run tests, verify they pass**

- [x] **Step 3.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add markdown table parser for .swmd codec"
```

---

## Task 4: SWMD section splitter (with multi-phase awareness)

**Files:**
- Modify: `synthwave_surfer.html` — append after `parseMarkdownTable`

The splitter is the routing layer. It splits a `.swmd` document by `## Phase: name` headings (or top-level `## Bass` / `## Lead` / etc. for single-phase backwards-compat).

- [x] **Step 4.1: Add failing tests**

```javascript
['splitSwmdSections — single phase (no "Phase:" prefix)', () => {
  const text = '---\nx: y\n---\n\n## Bass · Stratos\nstuff\n\n## Lead · Crystal\nmore stuff\n\n## FX Bus\nfx';
  const sections = splitSwmdSections(text);
  assert(Array.isArray(sections.phases), 'phases is an array');
  assert(sections.phases.length === 1, 'one implicit phase');
  assert(sections.phases[0].name === 'default', 'implicit phase name');
  assert('Bass' in sections.phases[0].sections, 'phase has Bass');
  assert('Lead' in sections.phases[0].sections, 'phase has Lead');
  assert('FX Bus' in sections.fileSections, 'FX Bus is file-level');
}],
['splitSwmdSections — multi-phase', () => {
  const text = '---\nx: y\n---\n\n## Phase: calm\n\n### Bass · Stratos\n\n[bass]\n\n### Lead · Crystal\n\n[lead]\n\n## Phase: intense\n\n### Bass · Stratos\n\n[bass2]\n\n## FX Bus\n[fx]';
  const sections = splitSwmdSections(text);
  assert(sections.phases.length === 2, 'two phases');
  assert(sections.phases[0].name === 'calm', 'first phase named');
  assert(sections.phases[1].name === 'intense', 'second phase named');
  assert('FX Bus' in sections.fileSections, 'FX Bus is file-level');
}],
```

- [x] **Step 4.2: Run tests, verify they fail (splitSwmdSections undefined)**

- [x] **Step 4.3: Implement `splitSwmdSections`**

Append after `parseMarkdownTable`:

```javascript
function splitSwmdSections(text) {
  // Strip frontmatter if present so it doesn't pollute section splitting
  const body = text.replace(/^---\n[\s\S]+?\n---\n?/, '');

  // First-level split: ## headings
  const parts = body.split(/\n## /);
  // parts[0] is anything before first ## — ignored

  const phases = [];
  const fileSections = {};
  let currentPhase = null;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const nlIdx = part.indexOf('\n');
    const header = (nlIdx >= 0 ? part.slice(0, nlIdx) : part).trim();
    const body = nlIdx >= 0 ? part.slice(nlIdx + 1) : '';

    if (header.startsWith('Phase:')) {
      const name = header.slice('Phase:'.length).trim();
      currentPhase = { name, sections: {} };
      phases.push(currentPhase);
      // Body of a "## Phase: X" heading contains the ### Bass / ### Lead / ### Pad / ### Drums sections
      const phaseSubparts = body.split(/\n### /);
      // phaseSubparts[0] is whitespace before first ###
      for (let j = 1; j < phaseSubparts.length; j++) {
        const subPart = phaseSubparts[j];
        const subNl = subPart.indexOf('\n');
        const subHeader = (subNl >= 0 ? subPart.slice(0, subNl) : subPart).trim();
        const subBody = subNl >= 0 ? subPart.slice(subNl + 1) : '';
        const key = subHeader.split(' ·')[0].trim();
        currentPhase.sections[key] = subBody;
      }
    } else {
      // File-level section (e.g. "FX Bus", "Routing") OR backwards-compat single-phase top-level (Bass, Lead, etc.)
      const key = header.split(' ·')[0].trim();
      const isPhaseLevelKey = ['Bass', 'Lead', 'Pad', 'Drums'].includes(key);
      if (isPhaseLevelKey) {
        // Backwards-compat: no explicit phase, use implicit "default"
        if (!currentPhase || currentPhase.name !== 'default') {
          currentPhase = { name: 'default', sections: {} };
          phases.push(currentPhase);
        }
        currentPhase.sections[key] = body;
      } else {
        fileSections[key] = body;
      }
    }
  }

  return { phases, fileSections };
}
```

- [x] **Step 4.4: Run tests, verify they pass**

- [x] **Step 4.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add SWMD section splitter with multi-phase support"
```

---

## Task 5: Piano roll parser

**Files:**
- Modify: `synthwave_surfer.html` — append after `splitSwmdSections`

- [x] **Step 5.1: Add failing tests**

```javascript
['parsePianoRoll — basic single note', () => {
  const text = '### Pattern\n| Grad |  1 |  2 |  3 |  4 |\n|------|----|----|----|----|\n|  0   |  ● |  ─ |    |    |';
  const notes = parsePianoRoll(text);
  assert(notes.length === 2, 'two segments (note + rest)');
  assert(notes[0].degree === 0, 'degree 0');
  assert(notes[0].duration === 2, 'duration 2 (● + ─)');
  assert(notes[1].rest === true, 'rest segment');
  assert(notes[1].duration === 2, 'rest duration 2');
}],
['parsePianoRoll — multiple degrees in 16 steps', () => {
  const text = '### Pattern\n' +
    '| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |\n' +
    '|------|----|----|----|----|----|----|----|----|\n' +
    '|  4   |    |    |    |    |  ● |  ─ |    |    |\n' +
    '|  0   |  ● |  ─ |    |    |    |    |  ● |  ─ |';
  const notes = parsePianoRoll(text);
  assert(notes.length === 4, 'four segments: note rest note note');
  assert(notes[0].degree === 0 && notes[0].duration === 2, 'note 1: deg 0 dur 2');
  assert(notes[1].rest === true && notes[1].duration === 2, 'rest of dur 2');
  assert(notes[2].degree === 4 && notes[2].duration === 2, 'note 2: deg 4 dur 2');
  assert(notes[3].degree === 0 && notes[3].duration === 2, 'note 3: deg 0 dur 2');
}],
['parsePianoRoll — empty when no Pattern subsection', () => {
  assert(parsePianoRoll('### Settings\n| x | y |').length === 0, 'empty');
}],
```

- [x] **Step 5.2: Run tests, verify they fail (parsePianoRoll undefined)**

- [x] **Step 5.3: Implement `parsePianoRoll`**

Append after `splitSwmdSections`:

```javascript
function parsePianoRoll(sectionText) {
  const patternMatch = sectionText.match(/### Pattern\n([\s\S]+?)(?=\n###|\n##|$)/);
  if (!patternMatch) return [];
  const tableText = patternMatch[1];
  const lines = tableText.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 3) return [];

  const headerCells = lines[0].split('|').slice(1, -1);
  const stepCount = headerCells.length - 1; // first column is "Grad"
  const stepGrid = new Array(stepCount).fill(null);

  for (let r = 2; r < lines.length; r++) {
    const cells = lines[r].split('|').slice(1, -1);
    const degree = parseInt(cells[0].trim());
    if (Number.isNaN(degree)) continue;
    for (let s = 0; s < stepCount; s++) {
      const cell = (cells[s + 1] || '').trim();
      if (cell === '●') stepGrid[s] = { degree, starting: true };
      else if (cell === '─' && stepGrid[s] === null) stepGrid[s] = { degree, starting: false };
    }
  }

  const notes = [];
  let i = 0;
  while (i < stepGrid.length) {
    if (!stepGrid[i]) {
      let dur = 1;
      while (i + dur < stepGrid.length && !stepGrid[i + dur]) dur++;
      notes.push({ rest: true, duration: dur });
      i += dur; continue;
    }
    const degree = stepGrid[i].degree;
    let dur = 1;
    while (i + dur < stepGrid.length
        && stepGrid[i + dur]
        && !stepGrid[i + dur].starting
        && stepGrid[i + dur].degree === degree) dur++;
    notes.push({ degree, duration: dur });
    i += dur;
  }
  return notes;
}
```

- [x] **Step 5.4: Run tests, verify they pass**

- [x] **Step 5.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add piano-roll parser for .swmd codec"
```

---

## Task 6: Piano roll serializer

**Files:**
- Modify: `synthwave_surfer.html` — append after `parsePianoRoll`

- [x] **Step 6.1: Add failing tests, including a round-trip**

```javascript
['serializePianoRoll — single note round-trip', () => {
  const notes = [{ degree: 0, duration: 2 }, { rest: true, duration: 2 }];
  const text = serializePianoRoll(notes);
  assert(text.includes('|'), 'output is a markdown table');
  assert(text.includes(' ● '), 'has note marker');
  assert(text.includes(' ─ '), 'has hold marker');
  // Round-trip via parser
  const reparsed = parsePianoRoll('### Pattern\n' + text);
  assert(reparsed.length === 2, 'round-trip preserves segment count');
  assert(reparsed[0].degree === 0 && reparsed[0].duration === 2, 'note preserved');
  assert(reparsed[1].rest === true && reparsed[1].duration === 2, 'rest preserved');
}],
['serializePianoRoll — multi-degree round-trip', () => {
  const notes = [
    { degree: 0, duration: 2 },
    { degree: 4, duration: 2 },
    { degree: 0, duration: 2 },
    { rest: true, duration: 2 },
  ];
  const text = serializePianoRoll(notes);
  const reparsed = parsePianoRoll('### Pattern\n' + text);
  assert(reparsed.length === 4, 'four segments preserved');
  assert(reparsed[0].degree === 0 && reparsed[2].degree === 0, 'low degree preserved');
  assert(reparsed[1].degree === 4, 'high degree preserved');
}],
```

- [x] **Step 6.2: Run tests, verify they fail (serializePianoRoll undefined)**

- [x] **Step 6.3: Implement `serializePianoRoll`**

Append after `parsePianoRoll`:

```javascript
function serializePianoRoll(notes) {
  // Expand notes back into a step grid
  const steps = [];
  for (const n of notes) {
    if (n.rest) { for (let i = 0; i < n.duration; i++) steps.push(null); continue; }
    steps.push({ degree: n.degree, start: true });
    for (let i = 1; i < n.duration; i++) steps.push({ degree: n.degree, start: false });
  }
  const S = steps.length;
  if (S === 0) return '';

  // Find degrees to render (used degrees only; sort high → low)
  const degreesUsed = [...new Set(steps.filter(Boolean).map(s => s.degree))].sort((a, b) => b - a);
  if (degreesUsed.length === 0) return '';

  const gradW = 6;
  const header = `| ${'Grad'.padEnd(gradW)} |` +
    Array.from({ length: S }, (_, i) => ` ${String(i + 1).padStart(2)} `).join('|') + '|';
  const sep = `|${'-'.repeat(gradW + 2)}|` +
    Array.from({ length: S }, () => '----').join('|') + '|';
  const rows = degreesUsed.map(d => {
    const cells = steps.map(s => {
      if (!s || s.degree !== d) return '   ';
      return s.start ? ' ● ' : ' ─ ';
    });
    return `| ${String(d).padStart(gradW)} |` + cells.join('|') + '|';
  });
  return [header, sep, ...rows].join('\n');
}
```

- [x] **Step 6.4: Run tests, verify they pass**

- [x] **Step 6.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add piano-roll serializer with round-trip test coverage"
```

---

## Task 7: Drum parser + serializer

**Files:**
- Modify: `synthwave_surfer.html` — append after `serializePianoRoll`

- [x] **Step 7.1: Add failing tests**

```javascript
['parseDrums — basic 16-step', () => {
  const text = '### Pattern\n```swdrum\nkick:  x . . . x . . . x . . . x . . .\nsnare: . . . . x . . . . . . . x . . .\nhihat: x . x . x . x . x . x . x . x .\nopen:  . . . . . . . x . . . . . . . x\n```';
  const drums = parseDrums(text);
  assert(drums !== null, 'drums parsed');
  assert(drums.kick.length === 16, 'kick has 16 steps');
  assert(drums.kick[0] === true && drums.kick[1] === false, 'kick step 0 on, 1 off');
  assert(drums.snare[4] === true, 'snare on step 4');
  assert(drums.open[15] === true, 'open hat on step 15');
}],
['parseDrums — null for no swdrum block', () => {
  assert(parseDrums('### Pattern\nno block here') === null, 'null when no swdrum');
}],
['serializeDrums — round-trip', () => {
  const grid = {
    kick:  [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false],
    snare: [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],
    hihat: [true,false,true,false, true,false,true,false, true,false,true,false, true,false,true,false],
    open:  [false,false,false,false, false,false,false,true, false,false,false,false, false,false,false,true],
  };
  const text = serializeDrums(grid);
  assert(text.startsWith('```swdrum'), 'starts with code fence');
  const reparsed = parseDrums('### Pattern\n' + text);
  assert(reparsed.kick[0] === true, 'kick preserved');
  assert(reparsed.snare[4] === true, 'snare preserved');
  assert(reparsed.open[15] === true, 'open preserved');
}],
```

- [x] **Step 7.2: Run tests, verify they fail**

- [x] **Step 7.3: Implement `parseDrums` and `serializeDrums`**

Append after `serializePianoRoll`:

```javascript
function parseDrums(sectionText) {
  const blockMatch = sectionText.match(/```swdrum\n([\s\S]+?)```/);
  if (!blockMatch) return null;
  const result = { kick: [], snare: [], hihat: [], open: [] };
  for (const line of blockMatch[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (!(key in result)) continue;
    result[key] = m[2].trim().split(/\s+/).map(c => c === 'x');
  }
  for (const k of Object.keys(result)) {
    while (result[k].length < 16) result[k].push(false);
    result[k] = result[k].slice(0, 16);
  }
  return result;
}

function serializeDrums(grid) {
  const fmt = a => a.slice(0, 16).map(b => b ? 'x' : '.').join(' ');
  return '```swdrum\nkick:  ' + fmt(grid.kick || [])
       + '\nsnare: ' + fmt(grid.snare || [])
       + '\nhihat: ' + fmt(grid.hihat || [])
       + '\nopen:  ' + fmt(grid.open || [])
       + '\n```';
}
```

- [x] **Step 7.4: Run tests, verify they pass**

- [x] **Step 7.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add swdrum parser/serializer with round-trip test"
```

---

## Task 8: Pad progression parser + serializer

**Files:**
- Modify: `synthwave_surfer.html` — append after `serializeDrums`

- [x] **Step 8.1: Add failing tests**

```javascript
['parsePadProgression — 4-bar progression', () => {
  const text = '### Progression\n| Bar     |  1   |  2   |  3   |  4   |\n|---------|------|------|------|------|\n| Degrees | 0,2,4 | -2,0,2 | 2,4,6 | -1,1,3 |';
  const prog = parsePadProgression(text);
  assert(prog !== null, 'progression parsed');
  assert(prog.length === 4, 'four bars');
  assert(prog[0].length === 3 && prog[0][0] === 0 && prog[0][2] === 4, 'bar 1: [0,2,4]');
  assert(prog[1][0] === -2, 'bar 2: negative degree');
}],
['parsePadProgression — null for no Degrees row', () => {
  assert(parsePadProgression('### Progression\n| Bar | 1 |\n|-----|---|\n| Other | x |') === null, 'null without Degrees');
}],
['serializePadProgression — round-trip', () => {
  const prog = [[0, 2, 4], [-2, 0, 2], [2, 4, 6], [-1, 1, 3]];
  const text = serializePadProgression(prog);
  const reparsed = parsePadProgression('### Progression\n' + text);
  assert(reparsed.length === 4, 'four bars round-tripped');
  assert(reparsed[0][2] === 4 && reparsed[1][0] === -2, 'values preserved');
}],
```

- [x] **Step 8.2: Run tests, verify they fail**

- [x] **Step 8.3: Implement parser and serializer**

Append after `serializeDrums`:

```javascript
function parsePadProgression(sectionText) {
  const progMatch = sectionText.match(/### Progression\n([\s\S]+?)(?=\n###|\n##|$)/);
  const tableText = progMatch ? progMatch[1] : sectionText;
  const rows = parseMarkdownTable(tableText);
  const degreeRow = rows.find(r => r['Bar'] === 'Degrees' || r['Bar'] === 'Degree');
  if (!degreeRow) return null;
  const chords = [];
  for (let i = 1; i <= 8; i++) {
    const val = degreeRow[String(i)];
    if (val === undefined || val === '') break;
    chords.push(val.split(',').map(s => parseInt(s.trim(), 10)));
  }
  return chords.length > 0 ? chords : null;
}

function serializePadProgression(prog) {
  const N = prog.length;
  const header = `| Bar     |` + prog.map((_, i) => `  ${i + 1}   |`).join('');
  const sep    = `|---------|` + prog.map(() => '------|').join('');
  const degrees = `| Degrees |` + prog.map(c => ` ${c.join(',')} |`).join('');
  return `${header}\n${sep}\n${degrees}`;
}
```

- [x] **Step 8.4: Run tests, verify they pass**

- [x] **Step 8.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add pad progression parser/serializer for .swmd codec"
```

---

## Task 9: FX Bus parser + Instrument settings parser

**Files:**
- Modify: `synthwave_surfer.html` — append after `serializePadProgression`

- [x] **Step 9.1: Add failing tests**

```javascript
['parseFx — extracts master state shape', () => {
  const text = '| Effect | Param | Value |\n|--------|-------|-------|\n| reverb | size | 0.6 |\n| reverb | wet | 0.5 |\n| delay | time | 0.55 |\n| sidechain | depth | 0.7 |\n| master | gain | 0.8 |';
  const fx = parseFx(text);
  assert(fx.reverbSize === 0.6, 'reverbSize mapped');
  assert(fx.reverbWet === 0.5, 'reverbWet mapped');
  assert(fx.delayTime === 0.55, 'delayTime mapped');
  assert(fx.sidechain === 0.7, 'sidechain depth mapped');
  assert(fx.masterGain === 0.8, 'master gain mapped');
}],
['parseInstrumentSettings — coerces numerics', () => {
  const text = '### Settings\n| Param | Value |\n|-------|-------|\n| model | stratos |\n| volume | 0.7 |\n| character | 0.5 |\n| lfoTarget | pwm |';
  const s = parseInstrumentSettings(text);
  assert(s.model === 'stratos', 'string preserved');
  assert(s.volume === 0.7, 'volume coerced to number');
  assert(s.character === 0.5, 'character coerced');
  assert(s.lfoTarget === 'pwm', 'lfoTarget string preserved');
}],
```

- [x] **Step 9.2: Run tests, verify they fail**

- [x] **Step 9.3: Implement both parsers**

Append after `serializePadProgression`:

```javascript
function parseFx(sectionText) {
  const rows = parseMarkdownTable(sectionText);
  const ms = {};
  const map = {
    reverb:    { size: 'reverbSize', wet: 'reverbWet' },
    delay:     { time: 'delayTime', feedback: 'delayFB', wet: 'delayWet' },
    sidechain: { depth: 'sidechain' },
    tapesat:   { drive: 'tapeSat' },
    master:    { gain: 'masterGain' },
  };
  for (const row of rows) {
    const effect = (row['Effect'] || '').toLowerCase();
    const param = (row['Param'] || '').toLowerCase();
    const value = parseFloat(row['Value']);
    if (Number.isNaN(value)) continue;
    if (map[effect] && map[effect][param]) ms[map[effect][param]] = value;
  }
  return ms;
}

const NUMERIC_INSTRUMENT_KEYS = new Set([
  'volume','detune','attack','decay','sustain','release',
  'cutoff','resonance','fenvAmount','fenvDecay','character',
  'lfoRate','lfoDepth'
]);
const BOOL_INSTRUMENT_KEYS = new Set(['send']);

function parseInstrumentSettings(sectionText) {
  const settingsMatch = sectionText.match(/### Settings\n([\s\S]+?)(?=\n###|\n##|$)/);
  const tableText = settingsMatch ? settingsMatch[1] : sectionText;
  const rows = parseMarkdownTable(tableText);
  const result = {};
  for (const row of rows) {
    const key = row['Param']; const val = row['Value'];
    if (!key || val === undefined) continue;
    if (NUMERIC_INSTRUMENT_KEYS.has(key)) result[key] = parseFloat(val);
    else if (BOOL_INSTRUMENT_KEYS.has(key)) result[key] = (val === 'true');
    else result[key] = val;
  }
  return result;
}
```

- [x] **Step 9.4: Run tests, verify they pass**

- [x] **Step 9.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add FX and instrument settings parsers for .swmd codec"
```

---

## Task 10: Full SWMD parser (multi-phase aware)

**Files:**
- Modify: `synthwave_surfer.html` — append after `parseInstrumentSettings`

- [x] **Step 10.1: Add failing tests**

```javascript
['swmdParse — minimal single-phase document', () => {
  const text = `---
synthwave-surfer: "1.0"
name: Test
algo: outrun
bpm: 120
mode: aeolian
pattern-mode: fixed
bass-root: 48
lead-root: 60
mood: nostalgic
energy: medium
---

## Bass · Stratos

### Settings
| Param | Value |
|-------|-------|
| model | stratos |
| volume | 0.7 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |
|------|----|----|----|----|
|  0   |  ● |  ─ |    |    |

## FX Bus
| Effect | Param | Value |
|--------|-------|-------|
| master | gain | 0.8 |
`;
  const parsed = swmdParse(text);
  assert(parsed.meta.name === 'Test', 'meta name');
  assert(parsed.meta.mood === 'nostalgic', 'meta mood');
  assert(parsed.phases.length === 1, 'one implicit phase');
  assert(parsed.phases[0].name === 'default', 'default phase name');
  assert(parsed.phases[0].bassPattern.length === 2, 'bass pattern parsed');
  assert(parsed.phases[0].bassSettings.model === 'stratos', 'bass settings');
  assert(parsed.fxSettings.masterGain === 0.8, 'fx parsed');
}],
['swmdParse — multi-phase document', () => {
  const text = `---
synthwave-surfer: "1.0"
name: MultiTest
algo: noir
bpm: 80
mode: aeolian
pattern-mode: fixed
default-phase: calm
---

## Phase: calm

### Bass · Stratos

#### Pattern (replaced inline below since #### is not parsed; pattern lives under ### Pattern in real spec)

### Pattern
| Grad |  1 |  2 |
|------|----|----|
|  0   |  ● |  ─ |

## Phase: intense

### Bass · Stratos

### Pattern
| Grad |  1 |  2 |
|------|----|----|
|  4   |  ● |  ─ |

## FX Bus
| Effect | Param | Value |
|--------|-------|-------|
| reverb | wet | 0.5 |
`;
  const parsed = swmdParse(text);
  assert(parsed.phases.length === 2, 'two phases parsed');
  assert(parsed.phases[0].name === 'calm', 'first phase name');
  assert(parsed.phases[1].name === 'intense', 'second phase name');
  assert(parsed.meta['default-phase'] === 'calm', 'default-phase meta');
}],
```

- [x] **Step 10.2: Run tests, verify they fail**

- [x] **Step 10.3: Implement `swmdParse`**

Append after `parseInstrumentSettings`:

```javascript
function swmdParse(text) {
  const meta = parseYamlFrontmatter(text);
  const split = splitSwmdSections(text);

  const phases = split.phases.map(phase => {
    const bassSection = phase.sections['Bass'] || '';
    const leadSection = phase.sections['Lead'] || '';
    const padSection  = phase.sections['Pad']  || '';
    const drumSection = phase.sections['Drums'] || '';
    return {
      name: phase.name,
      bassPattern:  parsePianoRoll(bassSection),
      leadPattern:  parsePianoRoll(leadSection),
      bassSettings: parseInstrumentSettings(bassSection),
      leadSettings: parseInstrumentSettings(leadSection),
      padSettings:  parseInstrumentSettings(padSection),
      padChords:    parsePadProgression(padSection),
      drumGrid:     parseDrums(drumSection),
    };
  });

  const fxSection = split.fileSections['FX Bus'] || '';
  return {
    meta,
    phases,
    fxSettings: parseFx(fxSection),
  };
}
```

- [x] **Step 10.4: Run tests, verify they pass**

- [x] **Step 10.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add full SWMD parser combining all sub-parsers (multi-phase)"
```

---

## Task 11: Full SWMD serializer (multi-phase output)

**Files:**
- Modify: `synthwave_surfer.html` — append after `swmdParse`

- [ ] **Step 11.1: Add round-trip test**

```javascript
['swmdSerialize — single-phase round-trip', () => {
  const original = {
    meta: { name: 'RoundTrip', algo: 'outrun', bpm: '120', mode: 'aeolian',
            'pattern-mode': 'fixed', 'bass-root': '48', 'lead-root': '60',
            mood: 'test', energy: 'medium', 'default-phase': 'default',
            'synthwave-surfer': '1.0' },
    phases: [{
      name: 'default',
      bassPattern: [{ degree: 0, duration: 2 }, { rest: true, duration: 2 }],
      leadPattern: [{ degree: 4, duration: 4 }],
      bassSettings: { model: 'stratos', volume: 0.7 },
      leadSettings: { model: 'crystal', volume: 0.45 },
      padSettings:  { model: 'vapor', volume: 0.4 },
      padChords:    [[0, 2, 4]],
      drumGrid: {
        kick:  Array(16).fill(false).map((_, i) => i % 4 === 0),
        snare: Array(16).fill(false).map((_, i) => i === 4 || i === 12),
        hihat: Array(16).fill(false).map((_, i) => i % 2 === 0),
        open:  Array(16).fill(false),
      },
    }],
    fxSettings: { reverbSize: 0.6, reverbWet: 0.5, masterGain: 0.8 },
  };
  const text = swmdSerialize(original);
  const reparsed = swmdParse(text);
  assert(reparsed.meta.name === 'RoundTrip', 'meta round-tripped');
  assert(reparsed.phases.length === 1, 'one phase');
  assert(reparsed.phases[0].bassPattern.length === 2, 'bass pattern length');
  assert(reparsed.phases[0].bassPattern[0].degree === 0, 'bass first note');
  assert(reparsed.phases[0].bassSettings.volume === 0.7, 'bass volume');
  assert(reparsed.fxSettings.masterGain === 0.8, 'master gain');
}],
['swmdSerialize — multi-phase round-trip', () => {
  const original = {
    meta: { name: 'TwoPhases', algo: 'noir', bpm: '80', mode: 'aeolian',
            'pattern-mode': 'fixed', 'bass-root': '48', 'lead-root': '60',
            mood: 'cinematic', energy: 'low', 'default-phase': 'calm',
            'synthwave-surfer': '1.0' },
    phases: [
      { name: 'calm',
        bassPattern: [{ degree: 0, duration: 16 }],
        leadPattern: [], bassSettings: { model: 'stratos', volume: 0.4 },
        leadSettings: { model: 'crystal', volume: 0.3 },
        padSettings:  { model: 'vapor', volume: 0.5 },
        padChords:    [[0, 2, 4]],
        drumGrid: { kick: Array(16).fill(false), snare: Array(16).fill(false),
                    hihat: Array(16).fill(false), open: Array(16).fill(false) }},
      { name: 'rising',
        bassPattern: [{ degree: 0, duration: 4 }, { degree: 2, duration: 4 },
                      { degree: 4, duration: 4 }, { degree: 5, duration: 4 }],
        leadPattern: [{ degree: 6, duration: 8 }, { degree: 4, duration: 8 }],
        bassSettings: { model: 'stratos', volume: 0.6 },
        leadSettings: { model: 'crystal', volume: 0.5 },
        padSettings:  { model: 'vapor', volume: 0.5 },
        padChords:    [[0, 2, 4]],
        drumGrid: { kick: Array(16).fill(false).map((_, i) => i % 4 === 0),
                    snare: Array(16).fill(false), hihat: Array(16).fill(false),
                    open: Array(16).fill(false) }},
    ],
    fxSettings: { masterGain: 0.75 },
  };
  const text = swmdSerialize(original);
  const reparsed = swmdParse(text);
  assert(reparsed.phases.length === 2, 'two phases round-tripped');
  assert(reparsed.phases[0].name === 'calm', 'phase 1 name');
  assert(reparsed.phases[1].name === 'rising', 'phase 2 name');
  assert(reparsed.phases[1].bassPattern.length === 4, 'rising bass count');
}],
```

- [ ] **Step 11.2: Run tests, verify they fail (swmdSerialize undefined)**

- [ ] **Step 11.3: Implement `swmdSerialize`**

Append after `swmdParse`:

```javascript
function swmdSerialize(parsed) {
  const m = parsed.meta || {};
  const fmFields = [
    'synthwave-surfer','name','algo','bpm','mode','pattern-mode',
    'bass-root','lead-root','mood','energy','default-phase',
  ];
  const fmLines = ['---'];
  for (const k of fmFields) {
    if (m[k] === undefined || m[k] === '') continue;
    const needsQuote = k === 'synthwave-surfer';
    fmLines.push(`${k}: ${needsQuote ? '"' + m[k] + '"' : m[k]}`);
  }
  fmLines.push('---');
  const frontmatter = fmLines.join('\n');

  const phaseSections = parsed.phases.map(phase => {
    const isDefault = phase.name === 'default';
    const phaseHeader = isDefault ? '' : `## Phase: ${phase.name}\n\n`;
    const headingPrefix = isDefault ? '## ' : '### ';

    const bassSettings = serializeInstrumentSettingsTable(phase.bassSettings);
    const bassPattern = serializePianoRoll(phase.bassPattern);
    const bassBlock = `${headingPrefix}Bass · ${phase.bassSettings.model || 'stratos'}\n\n` +
                      `${isDefault ? '###' : '####'} Settings\n${bassSettings}\n\n` +
                      `${isDefault ? '###' : '####'} Pattern\n${bassPattern}`;

    const leadSettings = serializeInstrumentSettingsTable(phase.leadSettings);
    const leadPattern = serializePianoRoll(phase.leadPattern);
    const leadBlock = `${headingPrefix}Lead · ${phase.leadSettings.model || 'crystal'}\n\n` +
                      `${isDefault ? '###' : '####'} Settings\n${leadSettings}\n\n` +
                      `${isDefault ? '###' : '####'} Pattern\n${leadPattern}`;

    const padSettings = serializeInstrumentSettingsTable(phase.padSettings);
    const padProg = phase.padChords ? serializePadProgression(phase.padChords) : '';
    const padBlock = `${headingPrefix}Pad · ${phase.padSettings.model || 'vapor'}\n\n` +
                     `${isDefault ? '###' : '####'} Settings\n${padSettings}\n\n` +
                     `${isDefault ? '###' : '####'} Progression\n${padProg}`;

    const drumBlock = `${headingPrefix}Drums\n\n` +
                      `${isDefault ? '###' : '####'} Pattern\n${serializeDrums(phase.drumGrid || {})}`;

    return phaseHeader + [bassBlock, leadBlock, padBlock, drumBlock].join('\n\n');
  });

  const fx = parsed.fxSettings || {};
  const fxRows = [
    ['reverb','size',     fx.reverbSize],
    ['reverb','wet',      fx.reverbWet],
    ['delay','time',      fx.delayTime],
    ['delay','feedback',  fx.delayFB],
    ['delay','wet',       fx.delayWet],
    ['sidechain','depth', fx.sidechain],
    ['tapeSat','drive',   fx.tapeSat],
    ['master','gain',     fx.masterGain],
  ].filter(r => r[2] !== undefined)
   .map(r => `| ${r[0]} | ${r[1]} | ${typeof r[2] === 'number' ? r[2].toFixed(2) : r[2]} |`)
   .join('\n');
  const fxBlock = `## FX Bus\n| Effect | Param | Value |\n|--------|-------|-------|\n${fxRows}`;

  return [frontmatter, ...phaseSections, fxBlock].join('\n\n') + '\n';
}

function serializeInstrumentSettingsTable(settings) {
  const rows = Object.entries(settings)
    .map(([k, v]) => {
      const valStr = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2))
                   : typeof v === 'boolean' ? String(v)
                   : v;
      return `| ${k} | ${valStr} |`;
    })
    .join('\n');
  return `| Param | Value |\n|-------|-------|\n${rows}`;
}
```

**Note for plan reader:** The serializer above uses `###` headings inside multi-phase mode. The parser in Task 4 uses `### Bass · ...` for multi-phase (under `## Phase:`). The `####` levels here in some sub-headings (Settings, Pattern) are deliberately one level deeper to fit under `### Bass`. Verify by reading the round-trip test pass — if it fails, adjust heading depth on either parser or serializer for consistency. The parser only matches on `### Pattern`, `### Settings`, `### Progression` regexes (pattern: `/### Pattern\n/`), so adjust the serializer to use `###` everywhere if needed.

**Resolution for ambiguity:** Use `### Pattern`, `### Settings`, `### Progression` consistently (level 3) regardless of phase context. Multi-phase uses `## Phase: name` (level 2) with `### Bass · ...` (level 3) as the instrument header. This means the original (single-phase) format must use `## Bass · ...` (level 2) — but for serializer simplicity, **always emit multi-phase form**: every output has at least one `## Phase: default` heading. Modify the serializer accordingly:

Replace the implementation above with this **simpler always-multi-phase form**:

```javascript
function swmdSerialize(parsed) {
  const m = parsed.meta || {};
  const fmFields = [
    'synthwave-surfer','name','algo','bpm','mode','pattern-mode',
    'bass-root','lead-root','mood','energy','default-phase',
  ];
  const fmLines = ['---'];
  for (const k of fmFields) {
    if (m[k] === undefined || m[k] === '') continue;
    const needsQuote = k === 'synthwave-surfer';
    fmLines.push(`${k}: ${needsQuote ? '"' + m[k] + '"' : m[k]}`);
  }
  fmLines.push('---');
  const frontmatter = fmLines.join('\n');

  const phaseSections = parsed.phases.map(phase => {
    const bassModel = phase.bassSettings?.model || 'stratos';
    const leadModel = phase.leadSettings?.model || 'crystal';
    const padModel  = phase.padSettings?.model  || 'vapor';

    const bassBlock = `### Bass · ${bassModel}\n\n` +
                      `### Settings\n${serializeInstrumentSettingsTable(phase.bassSettings)}\n\n` +
                      `### Pattern\n${serializePianoRoll(phase.bassPattern)}`;
    const leadBlock = `### Lead · ${leadModel}\n\n` +
                      `### Settings\n${serializeInstrumentSettingsTable(phase.leadSettings)}\n\n` +
                      `### Pattern\n${serializePianoRoll(phase.leadPattern)}`;
    const padProg = phase.padChords ? serializePadProgression(phase.padChords) : '';
    const padBlock = `### Pad · ${padModel}\n\n` +
                     `### Settings\n${serializeInstrumentSettingsTable(phase.padSettings)}\n\n` +
                     `### Progression\n${padProg}`;
    const drumBlock = `### Drums\n\n` +
                      `### Pattern\n${serializeDrums(phase.drumGrid || {})}`;

    return `## Phase: ${phase.name}\n\n${bassBlock}\n\n${leadBlock}\n\n${padBlock}\n\n${drumBlock}`;
  });

  const fx = parsed.fxSettings || {};
  const fxRows = [
    ['reverb','size',     fx.reverbSize],
    ['reverb','wet',      fx.reverbWet],
    ['delay','time',      fx.delayTime],
    ['delay','feedback',  fx.delayFB],
    ['delay','wet',       fx.delayWet],
    ['sidechain','depth', fx.sidechain],
    ['tapeSat','drive',   fx.tapeSat],
    ['master','gain',     fx.masterGain],
  ].filter(r => r[2] !== undefined)
   .map(r => `| ${r[0]} | ${r[1]} | ${typeof r[2] === 'number' ? r[2].toFixed(2) : r[2]} |`)
   .join('\n');
  const fxBlock = `## FX Bus\n| Effect | Param | Value |\n|--------|-------|-------|\n${fxRows}`;

  return [frontmatter, ...phaseSections, fxBlock].join('\n\n') + '\n';
}

function serializeInstrumentSettingsTable(settings) {
  const rows = Object.entries(settings || {})
    .map(([k, v]) => {
      const valStr = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2))
                   : typeof v === 'boolean' ? String(v)
                   : v;
      return `| ${k} | ${valStr} |`;
    })
    .join('\n');
  return `| Param | Value |\n|-------|-------|\n${rows}`;
}
```

**Important:** The parser in Task 4 must accept the splitter's `## Phase:` form. We chose to always emit multi-phase form (each file always has at least `## Phase: default`). This is what the round-trip tests in Step 11.1 already assume — single-phase serialization produces a `## Phase: default` block which the parser splits correctly.

- [ ] **Step 11.4: Run tests, verify they pass**

- [ ] **Step 11.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add SWMD serializer always emitting multi-phase form"
```

---

## Task 12: Phase Engine state + setPhase

**Files:**
- Modify: `synthwave_surfer.html`
  - Add state vars near line 1432
  - Add Phase Engine functions after FACTORY_PRESETS (~line 1656)

- [ ] **Step 12.1: Add failing tests**

```javascript
['Phase Engine — getPhases / getCurrentPhase with no swmd', () => {
  currentSwmd = null;
  patternMode = 'generative';
  assert(getPhases().length === 0, 'no phases when no swmd');
  assert(getCurrentPhase() === null, 'no current phase');
  assert(setPhase('foo') === false, 'setPhase fails when generative');
}],
['Phase Engine — setPhase switches index', () => {
  currentSwmd = {
    meta: {},
    phases: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
    fxSettings: {},
  };
  patternMode = 'fixed';
  currentPhaseIndex = 0;
  assert(getPhases().join(',') === 'a,b,c', 'phases listed');
  assert(getCurrentPhase() === 'a', 'starts at a');
  let notified = null;
  const unsub = onPhaseChange(name => { notified = name; });
  assert(setPhase('b') === true, 'setPhase succeeds');
  assert(currentPhaseIndex === 1, 'index updated');
  assert(getCurrentPhase() === 'b', 'current phase is b');
  assert(notified === 'b', 'listener fired');
  unsub();
  assert(setPhase('nonexistent') === false, 'invalid phase rejected');
  // cleanup
  currentSwmd = null;
  currentPhaseIndex = 0;
}],
```

- [ ] **Step 12.2: Run tests, verify they fail (functions undefined)**

- [ ] **Step 12.3: Add state variables near line 1432 (next to `let currentState = null;`)**

```javascript
let patternMode = 'generative';
let currentSwmd = null;
let currentPhaseIndex = 0;
const phaseChangeListeners = [];
```

- [ ] **Step 12.4: Add Phase Engine functions right after `FACTORY_PRESETS` (~line 1656)**

```javascript
/* ═══════════════════════════════════════════════════════════════════
   Phase Engine — multi-phase pattern playback state machine
   ═══════════════════════════════════════════════════════════════════ */

function getPhases() {
  if (patternMode !== 'fixed' || !currentSwmd) return [];
  return currentSwmd.phases.map(p => p.name);
}

function getCurrentPhase() {
  if (patternMode !== 'fixed' || !currentSwmd) return null;
  return currentSwmd.phases[currentPhaseIndex]?.name || null;
}

function getCurrentPhaseObj() {
  if (patternMode !== 'fixed' || !currentSwmd) return null;
  return currentSwmd.phases[currentPhaseIndex] || null;
}

function setPhase(name) {
  if (patternMode !== 'fixed' || !currentSwmd) {
    console.warn('[synthwaveSurfer] setPhase ignored: not in fixed mode');
    return false;
  }
  const idx = currentSwmd.phases.findIndex(p => p.name === name);
  if (idx === -1) {
    console.warn('[synthwaveSurfer] setPhase ignored: unknown phase ' + name);
    return false;
  }
  if (idx === currentPhaseIndex) return true;
  currentPhaseIndex = idx;
  // Re-generate the form with the new phase's pattern
  if (currentState) generate();
  // Notify listeners
  for (const cb of phaseChangeListeners) {
    try { cb(name); } catch (e) { console.error('[synthwaveSurfer] listener error', e); }
  }
  return true;
}

function onPhaseChange(cb) {
  phaseChangeListeners.push(cb);
  return () => {
    const i = phaseChangeListeners.indexOf(cb);
    if (i >= 0) phaseChangeListeners.splice(i, 1);
  };
}
```

- [ ] **Step 12.5: Run tests, verify they pass**

The test uses `currentSwmd` and `patternMode` as global; the test sets them directly and resets after. This is intentional — these are file-level `let` declarations, accessible from anywhere in the script.

- [ ] **Step 12.6: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add Phase Engine state machine (setPhase, listeners)"
```

---

## Task 13: External API surface (window.synthwaveSurfer)

**Files:**
- Modify: `synthwave_surfer.html` — append after Phase Engine functions

- [ ] **Step 13.1: Add test**

```javascript
['External API — exposed and frozen', () => {
  assert(typeof window.synthwaveSurfer === 'object', 'API exposed');
  assert(typeof window.synthwaveSurfer.setPhase === 'function', 'setPhase fn');
  assert(typeof window.synthwaveSurfer.getPhases === 'function', 'getPhases fn');
  assert(typeof window.synthwaveSurfer.getCurrentPhase === 'function', 'getCurrentPhase fn');
  assert(typeof window.synthwaveSurfer.onPhaseChange === 'function', 'onPhaseChange fn');
  assert(typeof window.synthwaveSurfer.getMeta === 'function', 'getMeta fn');
  assert(Object.isFrozen(window.synthwaveSurfer), 'API is frozen');
}],
```

- [ ] **Step 13.2: Run test, verify it fails**

- [ ] **Step 13.3: Implement API surface**

Append right after the Phase Engine functions:

```javascript
window.synthwaveSurfer = Object.freeze({
  setPhase,
  getPhases,
  getCurrentPhase,
  onPhaseChange,
  getMeta: () => (patternMode === 'fixed' && currentSwmd) ? { ...currentSwmd.meta } : null,
});
```

- [ ] **Step 13.4: Run test, verify it passes**

- [ ] **Step 13.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: expose frozen window.synthwaveSurfer API surface"
```

---

## Task 14: buildFormFromSwmd — produce form from current phase

**Files:**
- Modify: `synthwave_surfer.html` — append after Phase Engine + API (around line 1700ish, before `generate()`)

This function takes the parsed `.swmd` + algo metadata and produces the `form` object that `scheduleAll()` consumes.

- [ ] **Step 14.1: Add failing test**

```javascript
['buildFormFromSwmd — produces form with bass/lead parts', () => {
  const swmd = {
    meta: {},
    phases: [{
      name: 'default',
      bassPattern: [{ degree: 0, duration: 4 }, { degree: 2, duration: 4 },
                    { degree: 4, duration: 4 }, { degree: 5, duration: 4 }],
      leadPattern: [{ degree: 6, duration: 8 }, { degree: 4, duration: 8 }],
      bassSettings: { model: 'stratos' },
      leadSettings: { model: 'crystal' },
      padSettings:  { model: 'vapor' },
      padChords: [[0, 2, 4]],
      drumGrid: { kick: Array(16).fill(false).map((_,i)=>i%4===0),
                  snare: Array(16).fill(false), hihat: Array(16).fill(false),
                  open: Array(16).fill(false) },
    }],
    fxSettings: {},
  };
  const algo = ALGORITHMS.outrun;
  const phase = swmd.phases[0];
  const form = buildFormFromSwmd(swmd, phase, algo);
  assert(Array.isArray(form.parts), 'form.parts is array');
  assert(form.parts.some(p => p.voice === 'bass'), 'has bass parts');
  assert(form.parts.some(p => p.voice === 'lead'), 'has lead parts');
  assert(Array.isArray(form.padProg), 'padProg is array');
  assert(Array.isArray(form.drumGrid && form.drumGrid.kick), 'drumGrid.kick array');
}],
```

- [ ] **Step 14.2: Run test, verify it fails**

- [ ] **Step 14.3: Implement `buildFormFromSwmd`**

Append right before `function generate()` (line 1695):

```javascript
function buildFormFromSwmd(swmd, phase, algo) {
  const padProg = phase.padChords || algo.padProg;
  const chordMap = buildChordMap(padProg, algo.totalBars);
  const bassLine = phase.bassPattern.length > 0
    ? phase.bassPattern
    : algo.riffGen(mulberry32(1), SCALES.aeolian.length);
  const leadLine = phase.leadPattern.length > 0
    ? phase.leadPattern
    : [];

  const parts = [];
  // Bass: loop bassLine every bar, transposed to chord root
  for (let b = 0; b < algo.totalBars; b++) {
    const rootOffset = chordMap[b]?.root ?? 0;
    parts.push({ voice: 'bass', line: transpose(bassLine, rootOffset), startBar: b });
  }
  // Lead: loop in 4-bar blocks starting at bar 4
  if (leadLine.length > 0) {
    for (let b = 4; b < algo.totalBars; b += 6) {
      parts.push({ voice: 'lead', line: leadLine, startBar: b });
    }
  }

  return {
    parts,
    riff: bassLine,
    melodyA: leadLine,
    melodyB: leadLine,
    padProg,
    drumGrid: phase.drumGrid,
  };
}
```

- [ ] **Step 14.4: Run test, verify it passes**

- [ ] **Step 14.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add buildFormFromSwmd to convert parsed phase into form"
```

---

## Task 15: Modify generate() to branch on patternMode

**Files:**
- Modify: `synthwave_surfer.html` — replace existing `generate()` body (lines 1695-1717)

- [ ] **Step 15.1: Read current `generate()` body to confirm shape**

Open `synthwave_surfer.html`, view lines 1695-1717 to confirm the current implementation matches the snippet below. Adjust the line numbers in Step 15.2 if it has changed.

- [ ] **Step 15.2: Replace `generate()` body**

Find:
```javascript
function generate() {
  const seed = parseInt($('seed').value) || 1;
  const mode = $('mode').value;
  const bpm = Math.max(60, Math.min(200, parseInt($('bpm').value) || 110));
  const algoName = document.querySelector('input[name="algo"]:checked').value;
  const algo = ALGORITHMS[algoName];
  $('bpm').value = bpm;
  const rng = mulberry32(seed);
  const scale = SCALES[mode];
  const chordMap = buildChordMap(algo.padProg, algo.totalBars);
  const ctx = { chordMap, harmonicMode };
  const material = {
    riff:    algo.riffGen(rng, scale.length),
    melodyA: algo.leadGenA(rng, scale.length, ctx),
    melodyB: algo.leadGenB(rng, scale.length, ctx),
  };
  const form = algo.buildForm(rng, material, { modeName: mode, chordMap });
  currentState = { seed, mode, bpm, material, form, algoName };
  $('log').innerHTML = buildLog(currentState);
  drawRoll(form, scale, algo, 0, muteState);
  $('play').disabled = false; $('export-midi').disabled = false; $('export-wav').disabled = false;
  setStatus('✓ generated · ' + algoName + ' · seed ' + seed);
}
```

Replace with:
```javascript
function generate() {
  const seed = parseInt($('seed').value) || 1;
  const mode = $('mode').value;
  const bpm = Math.max(60, Math.min(200, parseInt($('bpm').value) || 110));
  const algoName = document.querySelector('input[name="algo"]:checked').value;
  const algo = ALGORITHMS[algoName];
  $('bpm').value = bpm;
  const scale = SCALES[mode];

  let form, material;
  if (patternMode === 'fixed' && currentSwmd) {
    const phase = getCurrentPhaseObj();
    form = buildFormFromSwmd(currentSwmd, phase, algo);
    material = form;  // form already has riff / melodyA / melodyB shape
  } else {
    const rng = mulberry32(seed);
    const chordMap = buildChordMap(algo.padProg, algo.totalBars);
    const ctx = { chordMap, harmonicMode };
    material = {
      riff:    algo.riffGen(rng, scale.length),
      melodyA: algo.leadGenA(rng, scale.length, ctx),
      melodyB: algo.leadGenB(rng, scale.length, ctx),
    };
    form = algo.buildForm(rng, material, { modeName: mode, chordMap });
  }

  currentState = { seed, mode, bpm, material, form, algoName };
  $('log').innerHTML = buildLog(currentState);
  drawRoll(form, scale, algo, 0, muteState);
  $('play').disabled = false; $('export-midi').disabled = false; $('export-wav').disabled = false;
  $('export-swmd').disabled = false;
  $('state-export').disabled = false;
  syncPhaseSelector();
  setStatus('✓ generated · ' + algoName + ' · ' + (patternMode === 'fixed' ? 'fixed: ' + (getCurrentPhase() || 'default') : 'seed ' + seed));
}
```

The `syncPhaseSelector` function and the `export-swmd` / `state-export` buttons are added in later tasks. The reference here is forward-looking — Tasks 16, 18, 19, 22 add them. Until those land, opening the page will throw `ReferenceError: syncPhaseSelector is not defined`. Implement Tasks 16-22 in sequence to keep the app loadable.

**Recommendation:** Define a no-op stub now so the app stays loadable while later tasks land:

After replacing `generate()`, add this stub immediately above it:

```javascript
function syncPhaseSelector() { /* implemented in Task 19 */ }
```

And ensure `$('export-swmd')` and `$('state-export')` won't crash when called against missing elements — wrap with guards:

```javascript
const exSwmd = $('export-swmd'); if (exSwmd) exSwmd.disabled = false;
const stExp  = $('state-export'); if (stExp) stExp.disabled = false;
```

Use those guarded forms in `generate()` instead of the direct ones. Final body:

```javascript
function syncPhaseSelector() { /* implemented in Task 19 */ }

function generate() {
  const seed = parseInt($('seed').value) || 1;
  const mode = $('mode').value;
  const bpm = Math.max(60, Math.min(200, parseInt($('bpm').value) || 110));
  const algoName = document.querySelector('input[name="algo"]:checked').value;
  const algo = ALGORITHMS[algoName];
  $('bpm').value = bpm;
  const scale = SCALES[mode];

  let form, material;
  if (patternMode === 'fixed' && currentSwmd) {
    const phase = getCurrentPhaseObj();
    form = buildFormFromSwmd(currentSwmd, phase, algo);
    material = form;
  } else {
    const rng = mulberry32(seed);
    const chordMap = buildChordMap(algo.padProg, algo.totalBars);
    const ctx = { chordMap, harmonicMode };
    material = {
      riff:    algo.riffGen(rng, scale.length),
      melodyA: algo.leadGenA(rng, scale.length, ctx),
      melodyB: algo.leadGenB(rng, scale.length, ctx),
    };
    form = algo.buildForm(rng, material, { modeName: mode, chordMap });
  }

  currentState = { seed, mode, bpm, material, form, algoName };
  $('log').innerHTML = buildLog(currentState);
  drawRoll(form, scale, algo, 0, muteState);
  $('play').disabled = false; $('export-midi').disabled = false; $('export-wav').disabled = false;
  const exSwmd = $('export-swmd'); if (exSwmd) exSwmd.disabled = false;
  const stExp  = $('state-export'); if (stExp) stExp.disabled = false;
  syncPhaseSelector();
  setStatus('✓ generated · ' + algoName + ' · ' + (patternMode === 'fixed' ? 'fixed: ' + (getCurrentPhase() || 'default') : 'seed ' + seed));
}
```

- [ ] **Step 15.3: Verify in browser**

Open `synthwave_surfer.html` (no `?test=1`). Click **Generate**. Audio should play normally. No console errors.

- [ ] **Step 15.4: Verify with `?test=1`**

Open `synthwave_surfer.html?test=1`. Tests should still pass.

- [ ] **Step 15.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: branch generate() on patternMode (generative vs fixed-phase)"
```

---

## Task 16: Add Pattern Mode toggle UI

**Files:**
- Modify: `synthwave_surfer.html`
  - HTML: insert after `harmonic-toggle` div (~line 235)
  - CSS: insert after `.harmonic-toggle.strict` style (~line 104)
  - JS: append handler near other toggle handlers (~line 1747)

- [ ] **Step 16.1: Add CSS** (after line 104, the `.harmonic-toggle.strict` line)

```css
.pattern-toggle { padding: 10px 16px; border: 1px solid var(--rule); background: rgba(10, 6, 18, 0.4); cursor: pointer; font-family: inherit; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--steel); display: flex; align-items: center; gap: 10px; user-select: none; transition: all 0.15s ease; }
.pattern-toggle:hover { border-color: var(--purple); }
.pattern-toggle.generative { border-color: var(--steel); color: var(--steel); }
.pattern-toggle.fixed { border-color: var(--purple); color: var(--purple); background: rgba(160,106,255,0.08); }
```

If `--purple` is not defined, replace with an existing accent var (`--green` works as fallback). Verify by inspecting the CSS variables block at the top of `<style>`.

- [ ] **Step 16.2: Add HTML** — find the line containing `harmonic-toggle natural` (line 235) and add immediately after:

```html
      <div class="track-divider"></div>
      <div class="pattern-toggle generative" id="pattern-toggle">⚙ Generativ</div>
```

- [ ] **Step 16.3: Add handler** — find the `harmonic-toggle` click handler (~line 1747) and add this immediately after:

```javascript
$('pattern-toggle').addEventListener('click', () => {
  patternMode = patternMode === 'generative' ? 'fixed' : 'generative';
  const btn = $('pattern-toggle');
  btn.className = 'pattern-toggle ' + patternMode;
  btn.textContent = patternMode === 'generative' ? '⚙ Generativ' : '⚙ Fixed';
  if (patternMode === 'fixed' && !currentSwmd) {
    setStatus('⚠ No fixed pattern loaded — pick a Factory Preset or import .swmd', true);
  }
  if (currentState) generate();
});
```

- [ ] **Step 16.4: Verify in browser**

Open `synthwave_surfer.html`. Click the new toggle (it should switch text between "⚙ Generativ" and "⚙ Fixed"). With `currentSwmd === null`, switching to Fixed should show the warning status. Audio still plays in generative mode.

- [ ] **Step 16.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add Pattern Mode toggle (Generativ / Fixed) to Tracks panel"
```

---

## Task 17: Add SWMD Export/Import buttons + handlers

**Files:**
- Modify: `synthwave_surfer.html`
  - HTML: insert in Export panel (~line 302, after `export-wav` button)
  - JS: append handlers near other export wiring (~line 1798)

- [ ] **Step 17.1: Add HTML** — find the line `<button id="export-wav" class="export" disabled>⬇ WAV</button>` (line 302) and add immediately after:

```html
      <button id="export-swmd" class="export" disabled>⬇ SWMD</button>
      <label class="export" style="cursor:pointer; padding: 8px 14px; border: 1px solid var(--rule); display: inline-flex; align-items: center;">⬆ SWMD<input id="import-swmd-file" type="file" accept=".swmd,.md" style="display:none;"></label>
```

- [ ] **Step 17.2: Add `exportSwmd()` and `importSwmd()` and the input/click handlers**

Append after the line `$('export-wav').onclick = exportWav;` (~line 1798):

```javascript
function exportSwmd() {
  if (!currentState) { setStatus('⚠ Generate first', true); return; }
  let parsed = currentSwmd;
  if (!parsed) {
    // Build a one-phase swmd from current state for export
    parsed = buildSwmdFromCurrentState();
  }
  const text = swmdSerialize(parsed);
  const fname = `${currentState.algoName}_${parsed.meta.name || currentState.seed}.md`;
  download(new TextEncoder().encode(text), fname, 'text/markdown');
  setStatus('✓ SWMD exported');
}

function buildSwmdFromCurrentState() {
  const algo = ALGORITHMS[currentState.algoName];
  const bassPart = currentState.form.parts.find(p => p.voice === 'bass');
  const leadPart = currentState.form.parts.find(p => p.voice === 'lead');
  return {
    meta: {
      'synthwave-surfer': '1.0',
      name: currentState.algoName + '_' + currentState.seed,
      algo: currentState.algoName,
      bpm: String(currentState.bpm),
      mode: currentState.mode,
      'pattern-mode': 'fixed',
      'bass-root': '48',
      'lead-root': '60',
      'default-phase': 'default',
    },
    phases: [{
      name: 'default',
      bassPattern: bassPart ? bassPart.line : (currentState.material.riff || []),
      leadPattern: leadPart ? leadPart.line : (currentState.material.melodyA || []),
      bassSettings: { ...trackParams.bass },
      leadSettings: { ...trackParams.lead },
      padSettings:  { ...trackParams.pad },
      padChords:    algo.padProg,
      drumGrid:     defaultDrumGridForAlgo(algo),
    }],
    fxSettings: { ...masterState },
  };
}

function defaultDrumGridForAlgo(algo) {
  const K = Array(16).fill(false), S = Array(16).fill(false),
        H = Array(16).fill(false), O = Array(16).fill(false);
  if (algo.drumPattern === 'driving') {
    [0,4,8,12].forEach(i => { K[i] = true; });
    [4,12].forEach(i => { S[i] = true; });
    [0,2,4,6,8,10,12,14].forEach(i => { H[i] = true; });
  } else if (algo.drumPattern === 'sparse') {
    [0].forEach(i => { K[i] = true; });
    [8].forEach(i => { S[i] = true; });
    [0,4,8,12].forEach(i => { H[i] = true; });
  } else { // shuffle / dreamy / other
    [0,8].forEach(i => { K[i] = true; });
    [8].forEach(i => { S[i] = true; });
    [0,2,4,6,8,10,12,14].forEach(i => { H[i] = true; });
  }
  return { kick: K, snare: S, hihat: H, open: O };
}

function importSwmd(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = swmdParse(ev.target.result);
      currentSwmd = parsed;
      currentPhaseIndex = 0;
      // Apply meta
      if (parsed.meta.bpm)  $('bpm').value = parsed.meta.bpm;
      if (parsed.meta.mode) $('mode').value = parsed.meta.mode;
      if (parsed.meta.algo) {
        document.querySelectorAll('input[name="algo"]').forEach(r => r.checked = (r.value === parsed.meta.algo));
        document.querySelectorAll('.algo-card').forEach(c => c.classList.toggle('active', c.dataset.algo === parsed.meta.algo));
      }
      // Apply default-phase if set
      if (parsed.meta['default-phase']) {
        const dp = parsed.phases.findIndex(p => p.name === parsed.meta['default-phase']);
        if (dp >= 0) currentPhaseIndex = dp;
      }
      // Apply track + fx settings from current phase
      const phase = parsed.phases[currentPhaseIndex];
      if (phase.bassSettings) Object.assign(trackParams.bass, phase.bassSettings);
      if (phase.leadSettings) Object.assign(trackParams.lead, phase.leadSettings);
      if (phase.padSettings)  Object.assign(trackParams.pad, phase.padSettings);
      if (parsed.fxSettings)  Object.assign(masterState, parsed.fxSettings);
      for (const k of ['bass','lead','pad']) syncTrackUI(k);
      syncMasterUI();
      patternMode = 'fixed';
      $('pattern-toggle').className = 'pattern-toggle fixed';
      $('pattern-toggle').textContent = '⚙ Fixed';
      generate();
      setStatus('✓ SWMD imported: ' + (parsed.meta.name || file.name));
    } catch (e) {
      console.error(e);
      setStatus('⚠ SWMD parse error: ' + e.message, true);
    }
  };
  reader.readAsText(file);
}

$('export-swmd').onclick = exportSwmd;
$('import-swmd-file').addEventListener('change', e => {
  if (e.target.files[0]) { importSwmd(e.target.files[0]); e.target.value = ''; }
});
```

- [ ] **Step 17.3: Verify in browser**

1. Open `synthwave_surfer.html`. Click **Generate**.
2. Click **⬇ SWMD**. A `.md` file downloads. Open it in any text editor to confirm it has frontmatter, `## Phase: default`, instrument sections, and `## FX Bus`.
3. Click **⬆ SWMD** and pick the file you just exported. The toggle should switch to Fixed and audio should play (potentially with a different sound if track params changed).

- [ ] **Step 17.4: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add SWMD Export/Import buttons and handlers"
```

---

## Task 18: Add State JSON export button

**Files:**
- Modify: `synthwave_surfer.html`
  - HTML: insert in User Presets panel near `preset-export` (~line 278)
  - JS: append handler after preset-export wiring

- [ ] **Step 18.1: Add HTML** — find `<button id="preset-export" class="small">⬇ Export</button>` (line 278) and add immediately after:

```html
      <button id="state-export" class="small" disabled>⬇ State JSON</button>
```

- [ ] **Step 18.2: Add handler**

Find the existing `preset-export` handler (or just append near other UI wiring) and add:

```javascript
$('state-export').onclick = () => {
  if (!currentState) { setStatus('⚠ Generate first', true); return; }
  const state = {
    timestamp: new Date().toISOString(),
    seed: currentState.seed,
    mode: currentState.mode,
    bpm: currentState.bpm,
    algoName: currentState.algoName,
    patternMode,
    currentPhase: getCurrentPhase(),
    trackParams: { bass: { ...trackParams.bass }, lead: { ...trackParams.lead }, pad: { ...trackParams.pad } },
    masterState: { ...masterState },
    muteState: { ...muteState },
    swmd: currentSwmd ? swmdSerialize(currentSwmd) : null,
  };
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `synthwave_state_${currentState.algoName}_${currentState.seed}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setStatus('✓ State exported');
};
```

- [ ] **Step 18.3: Verify in browser**

Click **Generate** then **⬇ State JSON**. Open the downloaded file. It should be valid JSON with all keys above.

- [ ] **Step 18.4: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add State JSON export button"
```

---

## Task 19: Phase Selector UI

**Files:**
- Modify: `synthwave_surfer.html`
  - HTML: insert phase-selector container in Tracks panel (~line 235, after pattern-toggle)
  - CSS: add `.phase-pill` styles (after Task 16's CSS additions)
  - JS: replace the `function syncPhaseSelector()` stub from Task 15

- [ ] **Step 19.1: Add HTML** — find the line `<div class="pattern-toggle generative" id="pattern-toggle">⚙ Generativ</div>` (added in Task 16) and add immediately after:

```html
      <div class="phase-selector" id="phase-selector" style="display:none; gap: 6px;"></div>
```

- [ ] **Step 19.2: Add CSS** (right after `.pattern-toggle.fixed` rule from Task 16):

```css
.phase-selector { display: flex; gap: 6px; align-items: center; padding-left: 12px; border-left: 1px solid var(--rule); margin-left: 6px; }
.phase-pill { padding: 6px 12px; border: 1px solid var(--steel); border-radius: 12px; cursor: pointer; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--steel); user-select: none; transition: all 0.15s ease; }
.phase-pill:hover { border-color: var(--purple); }
.phase-pill.active { border-color: var(--purple); color: var(--purple); background: rgba(160,106,255,0.12); }
```

- [ ] **Step 19.3: Replace the `syncPhaseSelector` stub from Task 15 with full implementation**

Find the line `function syncPhaseSelector() { /* implemented in Task 19 */ }` and replace with:

```javascript
function syncPhaseSelector() {
  const container = $('phase-selector');
  if (!container) return;
  const phases = getPhases();
  if (phases.length <= 1) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  container.style.display = 'flex';
  container.innerHTML = '';
  const current = getCurrentPhase();
  for (const name of phases) {
    const pill = document.createElement('div');
    pill.className = 'phase-pill' + (name === current ? ' active' : '');
    pill.textContent = name;
    pill.addEventListener('click', () => { setPhase(name); });
    container.appendChild(pill);
  }
}
```

- [ ] **Step 19.4: Verify in browser**

Right now we don't have a multi-phase preset to load (those come in Tasks 20-25). To verify, paste this in the console after generating:

```javascript
currentSwmd = {
  meta: { name: 'Manual Test' },
  phases: [
    { name: 'a', bassPattern: [{degree:0,duration:16}], leadPattern: [],
      bassSettings:{model:'stratos'}, leadSettings:{model:'crystal'},
      padSettings:{model:'vapor'}, padChords:[[0,2,4]],
      drumGrid:{kick:Array(16).fill(false),snare:Array(16).fill(false),hihat:Array(16).fill(false),open:Array(16).fill(false)} },
    { name: 'b', bassPattern: [{degree:4,duration:16}], leadPattern: [],
      bassSettings:{model:'stratos'}, leadSettings:{model:'crystal'},
      padSettings:{model:'vapor'}, padChords:[[0,2,4]],
      drumGrid:{kick:Array(16).fill(false),snare:Array(16).fill(false),hihat:Array(16).fill(false),open:Array(16).fill(false)} },
  ],
  fxSettings: {},
};
patternMode = 'fixed';
generate();
```

Pills "a" and "b" should appear. Clicking them switches phase (audio re-renders if playing).

- [ ] **Step 19.5: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add Phase Selector UI (pill row, hidden when single phase)"
```

---

## Task 20: Modify applyFactoryPreset to handle fixedSwmd

**Files:**
- Modify: `synthwave_surfer.html` — extend `applyFactoryPreset()` (lines 1658-1680)

- [ ] **Step 20.1: Replace `applyFactoryPreset()` body**

Find:
```javascript
function applyFactoryPreset(name) {
  const p = FACTORY_PRESETS[name];
  if (!p) return;
  $('seed').value = p.seed;
  $('mode').value = p.mode;
  $('bpm').value = p.bpm;
  document.querySelectorAll('input[name="algo"]').forEach(r => r.checked = (r.value === p.algoName));
  document.querySelectorAll('.algo-card').forEach(c => c.classList.toggle('active', c.dataset.algo === p.algoName));
  Object.assign(trackParams.bass, p.bass);
  Object.assign(trackParams.lead, p.lead);
  Object.assign(trackParams.pad, p.pad);
  Object.assign(masterState, p.master);
  for (const k of ['bass','lead','pad']) syncTrackUI(k);
  syncMasterUI();
  generate();
  if (liveSynths) {
    setTrackModel(liveSynths, 'bass', trackParams.bass.model, trackParams.bass);
    setTrackModel(liveSynths, 'lead', trackParams.lead.model, trackParams.lead);
    setTrackModel(liveSynths, 'pad',  trackParams.pad.model,  trackParams.pad);
    applyAllToGraph(liveSynths);
  }
  setStatus('✓ Factory preset loaded: ' + name);
}
```

Replace with:
```javascript
function applyFactoryPreset(name) {
  const p = FACTORY_PRESETS[name];
  if (!p) return;
  $('seed').value = p.seed;
  $('mode').value = p.mode;
  $('bpm').value = p.bpm;
  document.querySelectorAll('input[name="algo"]').forEach(r => r.checked = (r.value === p.algoName));
  document.querySelectorAll('.algo-card').forEach(c => c.classList.toggle('active', c.dataset.algo === p.algoName));
  Object.assign(trackParams.bass, p.bass);
  Object.assign(trackParams.lead, p.lead);
  Object.assign(trackParams.pad, p.pad);
  Object.assign(masterState, p.master);
  for (const k of ['bass','lead','pad']) syncTrackUI(k);
  syncMasterUI();

  if (p.fixedSwmd) {
    try {
      currentSwmd = swmdParse(p.fixedSwmd);
      currentPhaseIndex = 0;
      if (currentSwmd.meta['default-phase']) {
        const dp = currentSwmd.phases.findIndex(ph => ph.name === currentSwmd.meta['default-phase']);
        if (dp >= 0) currentPhaseIndex = dp;
      }
      patternMode = 'fixed';
      const btn = $('pattern-toggle');
      if (btn) { btn.className = 'pattern-toggle fixed'; btn.textContent = '⚙ Fixed'; }
    } catch (e) {
      console.error('[applyFactoryPreset] swmd parse error', e);
      currentSwmd = null;
      patternMode = 'generative';
    }
  } else {
    currentSwmd = null;
    patternMode = 'generative';
    const btn = $('pattern-toggle');
    if (btn) { btn.className = 'pattern-toggle generative'; btn.textContent = '⚙ Generativ'; }
  }

  generate();
  if (liveSynths) {
    setTrackModel(liveSynths, 'bass', trackParams.bass.model, trackParams.bass);
    setTrackModel(liveSynths, 'lead', trackParams.lead.model, trackParams.lead);
    setTrackModel(liveSynths, 'pad',  trackParams.pad.model,  trackParams.pad);
    applyAllToGraph(liveSynths);
  }
  setStatus('✓ Factory preset loaded: ' + name + (p.fixedSwmd ? ' (fixed)' : ' (generative)'));
}
```

- [ ] **Step 20.2: Verify in browser**

Open the app. Click any of the existing 6 factory presets. They should still play (fall through the `else` branch — generative mode, no `fixedSwmd` yet).

- [ ] **Step 20.3: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: extend applyFactoryPreset to load .swmd template literal when present"
```

---

## Task 21: Curated preset — Miami Nights (multi-phase)

**Files:**
- Modify: `synthwave_surfer.html` — extend `'Miami Nights'` entry in `FACTORY_PRESETS` (line 1614)

- [ ] **Step 21.1: Add `fixedSwmd` field to Miami Nights**

Find the closing `},` of the `'Miami Nights'` entry (the line that ends with `master: { ... } }`) and add a `fixedSwmd: \`...\`` field before it. Replace:

```javascript
  'Miami Nights': {
    tag: 'Outrun · classic', algoName: 'outrun', bpm: 120, mode: 'pentatonic_minor', seed: 1986,
    bass: { ... },
    lead: { ... },
    pad:  { ... },
    master: { reverbSize: 0.6, reverbWet: 0.5, delayTime: 0.55, delayFB: 0.45, delayWet: 0.45, sidechain: 0.75, tapeSat: 0.35, masterGain: 0.8 }
  },
```

with (keeping the existing bass/lead/pad/master, adding `mode: 'aeolian'` and `fixedSwmd`):

```javascript
  'Miami Nights': {
    tag: 'Outrun · classic', algoName: 'outrun', bpm: 120, mode: 'aeolian', seed: 1986,
    bass: { model: 'stratos', volume: 0.7, detune: 0, attack: 0.005, decay: 0.25, sustain: 0.7, release: 0.3, cutoff: 0.5, resonance: 0.3, fenvAmount: 0.4, fenvDecay: 0.3, character: 0.5, lfoTarget: 'pwm', lfoRate: 0.15, lfoDepth: 0.4, arp: 'off', send: false },
    lead: { model: 'crystal', volume: 0.45, detune: 0, attack: 0.01, decay: 0.4, sustain: 0.25, release: 1.0, cutoff: 0.7, resonance: 0.2, fenvAmount: 0.3, fenvDecay: 0.5, character: 0.6, lfoTarget: 'off', lfoRate: 0.3, lfoDepth: 0.2, arp: 'off', send: true },
    pad:  { model: 'vapor', volume: 0.4, detune: 0, attack: 1.2, decay: 0.5, sustain: 0.85, release: 2.5, cutoff: 0.45, resonance: 0.15, fenvAmount: 0.3, fenvDecay: 0.6, character: 0.8, lfoTarget: 'filter', lfoRate: 0.08, lfoDepth: 0.3, arp: 'off', send: true },
    master: { reverbSize: 0.6, reverbWet: 0.5, delayTime: 0.55, delayFB: 0.45, delayWet: 0.45, sidechain: 0.75, tapeSat: 0.35, masterGain: 0.8 },
    fixedSwmd: `---
synthwave-surfer: "1.0"
name: Miami Nights
algo: outrun
bpm: 120
mode: aeolian
pattern-mode: fixed
bass-root: 48
lead-root: 60
mood: nostalgic
energy: high
default-phase: pumping
---

## Phase: calm

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.50 |
| character | 0.40 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  0   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |

### Lead · crystal
### Settings
| Param | Value |
|-------|-------|
| volume | 0.30 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |    |    |    |    |    |    |    |    |
|  2   |    |    |    |    |    |    |    |    |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.40 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | 5,0,2 | -2,2,4 | -3,2,4 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . . . . . x . . . . . . .
snare: . . . . x . . . . . . . x . . .
hihat: x . x . x . x . x . x . x . x .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## Phase: pumping

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.70 |
| character | 0.50 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |    |    |    |    |    |    |    |    |    |    |    |    |    |    |  ● |    |
|  2   |    |    |    |    |  ● |    |    |    |    |    |  ● |    |    |    |    |    |
|  0   |  ● |  ─ |    |    |    |    |  ● |  ─ |  ● |  ─ |    |    |  ● |  ─ |    |  ─ |

### Lead · crystal
### Settings
| Param | Value |
|-------|-------|
| volume | 0.45 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  6   |    |    |    |    |    |    |  ● |  ─ |    |    |    |    |    |    |    |    |
|  4   |  ● |  ─ |  ─ |  ─ |    |    |    |    |  ● |  ─ |  ─ |    |    |    |    |    |
|  2   |    |    |    |    |  ● |  ─ |    |    |    |    |    |    |  ● |  ─ |  ─ |  ─ |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.40 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | 5,0,2 | -2,2,4 | -3,2,4 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . x . . . x . . . x . . .
snare: . . . . x . . . . . . . x . . .
hihat: x . x . x . x . x . x . x . x .
open:  . . . . . . . x . . . . . . . x
\`\`\`

## FX Bus
| Effect | Param | Value |
|--------|-------|-------|
| reverb | size | 0.60 |
| reverb | wet | 0.50 |
| delay | time | 0.55 |
| delay | feedback | 0.45 |
| delay | wet | 0.45 |
| sidechain | depth | 0.75 |
| tapeSat | drive | 0.35 |
| master | gain | 0.80 |
`
  },
```

**Note about template literal escaping:** The triple-backticks inside the JS template literal must be escaped as `\`\`\`` (each backtick prefixed with `\`). The example above shows that. JavaScript template literals require this escaping for literal backticks within them.

- [ ] **Step 21.2: Verify in browser**

Open `synthwave_surfer.html`. Click **Miami Nights** in the factory row. The Pattern toggle should switch to "⚙ Fixed", the Phase Selector should show pills `calm` and `pumping`, and audio should play the `pumping` phase (the default). Click `calm` — audio should switch.

- [ ] **Step 21.3: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add multi-phase fixed pattern for Miami Nights preset"
```

---

## Task 22: Curated preset — Highway Cruise (multi-phase)

**Files:**
- Modify: `synthwave_surfer.html` — add `fixedSwmd` to `'Highway Cruise'` (line 1621)

- [ ] **Step 22.1: Add `fixedSwmd` field to Highway Cruise**

Find the `'Highway Cruise'` entry. After the `master: {...}` line, add a comma and the `fixedSwmd` field. Use this template literal:

```javascript
    fixedSwmd: `---
synthwave-surfer: "1.0"
name: Highway Cruise
algo: outrun
bpm: 108
mode: aeolian
pattern-mode: fixed
bass-root: 48
lead-root: 60
mood: nostalgic
energy: medium
default-phase: cruising
---

## Phase: cruising

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.65 |
| character | 0.30 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |    |    |    |    |    |    |    |    |    |    |    |    |    |  ● |    |    |
|  2   |    |    |    |    |  ● |  ─ |    |    |    |    |  ● |    |    |    |    |    |
|  0   |  ● |  ─ |  ─ |  ─ |    |    |    |    |  ● |  ─ |    |    |  ● |    |  ─ |  ─ |

### Lead · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.45 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  6   |    |    |    |    |    |    |    |    |  ● |  ─ |  ─ |  ─ |    |    |    |    |
|  4   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |    |    |    |    |    |  ● |  ─ |  ─ |  ─ |
|  2   |    |    |    |    |    |    |    |  ● |    |    |    |    |    |    |    |    |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.42 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | -3,0,2 | -2,2,4 | 0,4,5 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . . . . . x . . . . . . .
snare: . . . . x . . . . . . . x . . .
hihat: x . . . x . . . x . . . x . . .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## Phase: breakdown

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.45 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  0   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |

### Lead · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.30 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |    |    |    |    |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |    |    |    |    |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.50 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | -3,0,2 | -2,2,4 | 0,4,5 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . . . . . . . . . . . . .
snare: . . . . . . . . . . . . . . . .
hihat: . . . . . . . . . . . . . . . .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## Phase: lift

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.70 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |    |    |    |    |    |    |    |    |    |    |    |    |    |    |  ● |    |
|  2   |    |    |    |    |  ● |  ─ |    |    |    |    |  ● |  ─ |    |    |    |    |
|  0   |  ● |  ─ |    |    |    |    |  ● |  ─ |  ● |  ─ |    |    |  ● |  ─ |    |  ─ |

### Lead · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.55 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  7   |    |    |    |    |    |    |  ● |  ─ |    |    |    |    |    |    |    |    |
|  6   |    |    |    |    |  ● |  ─ |    |    |    |    |    |  ● |  ─ |  ─ |    |    |
|  4   |  ● |  ─ |  ─ |  ─ |    |    |    |    |  ● |  ─ |  ─ |    |    |    |    |    |
|  2   |    |    |    |    |    |    |    |    |    |    |    |    |    |    |  ● |  ─ |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.42 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | -3,0,2 | -2,2,4 | 0,4,5 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . x . . . x . . . x . . .
snare: . . . . x . . . . . . . x . . .
hihat: x . x . x . x . x . x . x . x .
open:  . . . . . . . x . . . . . . . x
\`\`\`

## FX Bus
| Effect | Param | Value |
|--------|-------|-------|
| reverb | size | 0.65 |
| reverb | wet | 0.55 |
| delay | time | 0.50 |
| delay | feedback | 0.40 |
| delay | wet | 0.50 |
| sidechain | depth | 0.50 |
| tapeSat | drive | 0.40 |
| master | gain | 0.78 |
`
```

Also change `mode: 'aeolian'` (was `'aeolian'` already — fine).

- [ ] **Step 22.2: Verify in browser**

Click **Highway Cruise**. Phase pills `cruising`, `breakdown`, `lift` should appear. Click each — audio switches.

- [ ] **Step 22.3: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add multi-phase fixed pattern for Highway Cruise preset"
```

---

## Task 23: Curated preset — Blade Runner Rain (multi-phase)

**Files:**
- Modify: `synthwave_surfer.html` — add `fixedSwmd` to `'Blade Runner Rain'` (line 1628)

- [ ] **Step 23.1: Add `fixedSwmd` field**

Append to the `'Blade Runner Rain'` entry, after `master: {...},`:

```javascript
    fixedSwmd: `---
synthwave-surfer: "1.0"
name: Blade Runner Rain
algo: noir
bpm: 80
mode: aeolian
pattern-mode: fixed
bass-root: 48
lead-root: 60
mood: cinematic
energy: low
default-phase: calm
---

## Phase: calm

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.55 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  0   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |

### Lead · crystal
### Settings
| Param | Value |
|-------|-------|
| volume | 0.30 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
|  2   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |    |    |    |    |    |    |    |    |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.55 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | 0,2,4 | -2,2,5 | -2,2,5 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . . . . . . . . . . . . .
snare: . . . . . . . . . . . . . . . .
hihat: . . . . . . . . . . . . . . . .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## Phase: rising

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.55 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  2   |    |    |    |    |    |    |    |    |    |    |    |    |  ● |  ─ |  ─ |  ─ |
|  0   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |    |    |    |    |

### Lead · crystal
### Settings
| Param | Value |
|-------|-------|
| volume | 0.40 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  6   |    |    |    |    |  ● |  ─ |  ─ |  ─ |    |    |    |    |    |    |    |    |
|  4   |    |    |  ● |  ─ |    |    |    |    |    |    |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |
|  2   |  ● |  ─ |    |    |    |    |    |    |  ● |  ─ |    |    |    |    |    |    |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.55 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | 0,2,4 | -2,2,5 | -2,2,5 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . . . . . x . . . . . . .
snare: . . . . . . . . . . . . . . . .
hihat: x . . . x . . . x . . . x . . .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## Phase: outro

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.40 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  0   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |

### Lead · crystal
### Settings
| Param | Value |
|-------|-------|
| volume | 0.20 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  2   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.40 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | 0,2,4 | 0,2,4 | 0,2,4 |

### Drums
### Pattern
\`\`\`swdrum
kick:  . . . . . . . . . . . . . . . .
snare: . . . . . . . . . . . . . . . .
hihat: . . . . . . . . . . . . . . . .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## FX Bus
| Effect | Param | Value |
|--------|-------|-------|
| reverb | size | 0.85 |
| reverb | wet | 0.75 |
| delay | time | 0.70 |
| delay | feedback | 0.55 |
| delay | wet | 0.50 |
| tapeSat | drive | 0.45 |
| master | gain | 0.75 |
`
```

- [ ] **Step 23.2: Verify in browser**

Click **Blade Runner Rain**. Phases `calm`, `rising`, `outro` should appear and switch correctly.

- [ ] **Step 23.3: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add multi-phase fixed pattern for Blade Runner Rain preset"
```

---

## Task 24: Curated preset — Carpenter Synth (multi-phase)

**Files:**
- Modify: `synthwave_surfer.html` — add `fixedSwmd` to `'Carpenter Synth'` (line 1635). Change `mode: 'phrygian'` to `mode: 'aeolian'` for harmonic consistency with the spec.

- [ ] **Step 24.1: Add `fixedSwmd` field and change mode to aeolian**

Find `mode: 'phrygian'` in the Carpenter Synth entry and change to `mode: 'aeolian'`. Then append `fixedSwmd`:

```javascript
    fixedSwmd: `---
synthwave-surfer: "1.0"
name: Carpenter Synth
algo: noir
bpm: 90
mode: aeolian
pattern-mode: fixed
bass-root: 48
lead-root: 60
mood: brooding
energy: medium
default-phase: tension
---

## Phase: tension

### Bass · alkali
### Settings
| Param | Value |
|-------|-------|
| volume | 0.70 |
| character | 0.60 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  0   |  ● |  ─ |  ─ |  ─ |  ● |  ─ |  ─ |  ─ |  ● |  ─ |  ─ |  ─ |  ● |  ─ |  ─ |  ─ |

### Lead · alkali
### Settings
| Param | Value |
|-------|-------|
| volume | 0.50 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  3   |    |    |    |    |  ● |  ─ |  ─ |  ─ |    |    |    |    |    |    |    |    |
|  1   |    |  ● |  ─ |  ─ |    |    |    |    |  ● |  ─ |  ─ |  ─ |    |    |    |    |
|  0   |  ● |    |    |    |    |    |    |    |    |    |    |    |  ● |  ─ |  ─ |  ─ |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.40 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | 0,2,4 | 0,2,4 | 0,2,4 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . x . . . x . . . x . . .
snare: . . . . . . . . . . . . . . . .
hihat: . . . . . . . . . . . . . . . .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## Phase: release

### Bass · alkali
### Settings
| Param | Value |
|-------|-------|
| volume | 0.55 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  0   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |

### Lead · alkali
### Settings
| Param | Value |
|-------|-------|
| volume | 0.45 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |    |    |    |    |    |    |    |    |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |
|  2   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |    |    |    |    |    |    |    |    |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.45 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | -3,0,2 | -2,2,4 | 0,2,4 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . . . . . x . . . . . . .
snare: . . . . x . . . . . . . x . . .
hihat: x . . . x . . . x . . . x . . .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## FX Bus
| Effect | Param | Value |
|--------|-------|-------|
| reverb | size | 0.75 |
| reverb | wet | 0.65 |
| delay | time | 0.45 |
| delay | feedback | 0.40 |
| delay | wet | 0.30 |
| tapeSat | drive | 0.50 |
| master | gain | 0.78 |
`
```

- [ ] **Step 24.2: Verify in browser**

Click **Carpenter Synth**. Phases `tension`, `release` should appear and switch.

- [ ] **Step 24.3: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add multi-phase fixed pattern for Carpenter Synth preset"
```

---

## Task 25: Curated preset — Mall Bliss (multi-phase)

**Files:**
- Modify: `synthwave_surfer.html` — add `fixedSwmd` to `'Mall Bliss'` (line 1642)

- [ ] **Step 25.1: Add `fixedSwmd` field**

Append to Mall Bliss after `master: {...},`:

```javascript
    fixedSwmd: `---
synthwave-surfer: "1.0"
name: Mall Bliss
algo: dreamwave
bpm: 100
mode: aeolian
pattern-mode: fixed
bass-root: 48
lead-root: 60
mood: dreamy
energy: medium
default-phase: floating
---

## Phase: floating

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.60 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |    |    |    |  ● |    |    |    |  ● |    |    |    |  ● |    |    |    |  ● |
|  2   |    |  ● |  ─ |    |    |  ● |  ─ |    |    |  ● |  ─ |    |    |  ● |  ─ |    |
|  0   |  ● |    |    |    |  ● |    |    |    |  ● |    |    |    |  ● |    |    |    |

### Lead · crystal
### Settings
| Param | Value |
|-------|-------|
| volume | 0.45 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  6   |    |    |    |  ● |  ─ |  ─ |  ─ |    |    |  ● |  ─ |    |    |    |    |    |
|  4   |  ● |  ─ |  ─ |    |    |    |    |  ● |    |    |    |  ● |  ─ |  ─ |  ─ |    |
|  2   |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |  ● |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.45 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | -3,0,2 | -2,2,5 | 0,4,5 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . . . . . x . . . . . . .
snare: . . . . x . . . . . . . x . . .
hihat: x . x . x . x . x . x . x . x .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## Phase: arrival

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.65 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |    |    |    |  ● |    |    |    |  ● |    |    |    |  ● |    |    |    |  ● |
|  2   |    |  ● |  ─ |    |    |  ● |  ─ |    |    |  ● |  ─ |    |    |  ● |  ─ |    |
|  0   |  ● |    |    |    |  ● |    |    |    |  ● |    |    |    |  ● |    |    |    |

### Lead · crystal
### Settings
| Param | Value |
|-------|-------|
| volume | 0.55 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  7   |    |    |    |    |    |    |    |    |  ● |  ─ |  ─ |  ─ |    |    |    |    |
|  6   |    |    |    |  ● |  ─ |  ─ |  ─ |    |    |    |    |    |  ● |  ─ |  ─ |    |
|  4   |  ● |  ─ |  ─ |    |    |    |    |    |    |    |    |    |    |    |    |  ● |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.45 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | -3,0,2 | -2,2,5 | 0,4,5 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . x . . . x . . . x . . .
snare: . . . . x . . . . . . . x . . .
hihat: x . x . x . x . x . x . x . x .
open:  . . . . . . . x . . . . . . . x
\`\`\`

## FX Bus
| Effect | Param | Value |
|--------|-------|-------|
| reverb | size | 0.70 |
| reverb | wet | 0.60 |
| delay | time | 0.60 |
| delay | feedback | 0.50 |
| delay | wet | 0.50 |
| sidechain | depth | 0.55 |
| tapeSat | drive | 0.40 |
| master | gain | 0.78 |
`
```

- [ ] **Step 25.2: Verify in browser**

Click **Mall Bliss**. Phases `floating`, `arrival` should appear and switch correctly.

- [ ] **Step 25.3: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add multi-phase fixed pattern for Mall Bliss preset"
```

---

## Task 26: Curated preset — VHS Sunset (multi-phase)

**Files:**
- Modify: `synthwave_surfer.html` — add `fixedSwmd` to `'VHS Sunset'` (line 1649). Change `mode: 'pentatonic_minor'` to `mode: 'aeolian'`.

- [ ] **Step 26.1: Add `fixedSwmd` field and change mode**

Find `mode: 'pentatonic_minor'` and change to `mode: 'aeolian'`. Append `fixedSwmd`:

```javascript
    fixedSwmd: `---
synthwave-surfer: "1.0"
name: VHS Sunset
algo: dreamwave
bpm: 96
mode: aeolian
pattern-mode: fixed
bass-root: 48
lead-root: 60
mood: warm
energy: medium
default-phase: glow
---

## Phase: glow

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.65 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |    |    |    |    |    |    |  ● |    |    |    |    |    |    |    |  ● |    |
|  2   |    |  ● |    |  ● |    |    |    |  ● |    |  ● |    |  ● |    |    |    |  ─ |
|  0   |  ● |    |  ─ |    |  ● |  ─ |    |    |  ● |    |  ─ |    |  ● |  ─ |    |    |

### Lead · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.50 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  5   |    |    |    |    |    |    |  ● |  ─ |  ─ |  ─ |    |    |    |    |    |    |
|  4   |    |    |  ● |  ─ |  ─ |  ─ |    |    |    |    |  ● |  ─ |  ─ |    |    |    |
|  2   |  ● |  ─ |    |    |    |    |    |    |    |    |    |    |    |  ● |  ─ |  ─ |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.45 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | -3,0,2 | 5,0,2 | -2,2,4 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . x . . . x . . . x . . .
snare: . . . . x . . . . . . . x . . .
hihat: x . x . x . x . x . x . x . x .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## Phase: fade

### Bass · stratos
### Settings
| Param | Value |
|-------|-------|
| volume | 0.40 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  0   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |

### Lead · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.30 |

### Pattern
| Grad |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
|  4   |  ● |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |  ─ |

### Pad · vapor
### Settings
| Param | Value |
|-------|-------|
| volume | 0.50 |

### Progression
| Bar     |  1   |  2   |  3   |  4   |
|---------|------|------|------|------|
| Degrees | 0,2,4 | 0,2,4 | -3,0,2 | -3,0,2 |

### Drums
### Pattern
\`\`\`swdrum
kick:  x . . . . . . . . . . . . . . .
snare: . . . . . . . . . . . . . . . .
hihat: . . . . . . . . . . . . . . . .
open:  . . . . . . . . . . . . . . . .
\`\`\`

## FX Bus
| Effect | Param | Value |
|--------|-------|-------|
| reverb | size | 0.70 |
| reverb | wet | 0.60 |
| delay | time | 0.55 |
| delay | feedback | 0.50 |
| delay | wet | 0.55 |
| sidechain | depth | 0.60 |
| tapeSat | drive | 0.55 |
| master | gain | 0.76 |
`
```

- [ ] **Step 26.2: Verify in browser**

Click **VHS Sunset**. Phases `glow`, `fade` should appear.

- [ ] **Step 26.3: Commit**

```bash
git add synthwave_surfer.html
git commit -m "feat: add multi-phase fixed pattern for VHS Sunset preset"
```

---

## Task 27: Fix WAV export (offline transport)

**Files:**
- Modify: `synthwave_surfer.html` — replace `exportWav()` body (lines 1356-1384)

- [ ] **Step 27.1: Replace `exportWav()` to use destructured `transport` from offline context**

Find the existing `async function exportWav() { ... }` (line 1356) and replace its body:

```javascript
async function exportWav() {
  if (!currentState) return;
  setStatus('⌛ rendering WAV...');
  $('export-wav').disabled = true;
  const bpm = currentState.bpm;
  const algo = ALGORITHMS[currentState.algoName];
  const totalSec = (algo.totalBars * 4 * 60 / bpm) + 3;
  try {
    const buffer = await Tone.Offline(({ transport }) => {
      const offGraph = buildAudioGraph();
      setTrackModel(offGraph, 'bass', trackParams.bass.model, trackParams.bass);
      setTrackModel(offGraph, 'lead', trackParams.lead.model, trackParams.lead);
      setTrackModel(offGraph, 'pad',  trackParams.pad.model,  trackParams.pad);
      applyAllToGraph(offGraph);
      const wasLoop = loopMode; loopMode = false;
      scheduleAll(currentState.form, SCALES[currentState.mode], bpm, offGraph, algo);
      loopMode = wasLoop;
      transport.start(0);
    }, totalSec);
    const audioBuf = buffer.get ? buffer.get() : buffer;
    const wavBytes = audioBufferToWav(audioBuf);
    download(wavBytes, `synthwave_${currentState.algoName}_${currentState.seed}_${currentState.mode}.wav`, 'audio/wav');
    setStatus('✓ WAV exported');
  } catch (e) {
    console.error(e); setStatus('⚠ Render error: ' + e.message, true);
  } finally {
    $('export-wav').disabled = false;
  }
}
```

The change is on the `Tone.Offline(...)` call: `({ transport }) => { ... transport.start(0); }` instead of `async () => { ... Tone.Transport.start(0); }`. This uses the **offline** transport (the one bound to `Tone.Offline`'s context) rather than the global live transport, which is the bug.

- [ ] **Step 27.2: Verify in browser**

1. Open `synthwave_surfer.html`. Click **Generate**, then **▶ Play** (verify audio works).
2. Click **■ Stop**.
3. Click **⬇ WAV**. After ~5-10 seconds, a `.wav` file downloads.
4. Open the WAV in a media player or audio editor. It should contain the audio you heard, not silence.
5. Repeat for a Factory Preset with `fixedSwmd` (e.g. Miami Nights). The exported WAV should match the fixed-pattern audio of the **current phase**.

- [ ] **Step 27.3: Commit**

```bash
git add synthwave_surfer.html
git commit -m "fix: WAV export uses offline transport from Tone.Offline destructured arg"
```

---

## Task 28: Final verification checklist

This task adds no code — it walks through the full Phase 1 acceptance criteria from the spec (§12) and verifies every success criterion.

**Files:** none modified.

- [ ] **Step 28.1: Codec round-trip tests**

Open `synthwave_surfer.html?test=1`. Console should show all tests passing (0 failures). If any fail, fix them before proceeding.

- [ ] **Step 28.2: Each preset plays multi-phase**

For each of: **Miami Nights**, **Highway Cruise**, **Blade Runner Rain**, **Carpenter Synth**, **Mall Bliss**, **VHS Sunset**:

- Click the preset chip
- Pattern toggle switches to **⚙ Fixed**
- Phase selector pills appear (2-3 pills depending on preset)
- Audio plays the default phase
- Click each phase pill — audio switches to that phase
- All notes are in C minor (no obvious wrong notes / clashes between voices)

- [ ] **Step 28.3: SWMD round-trip**

1. Load a preset (e.g. Miami Nights).
2. Click **⬇ SWMD** — file `Miami Nights.md` downloads.
3. Open the file in a text editor — it should be readable Markdown with frontmatter + 2 phases + FX bus.
4. Click **⬆ SWMD** and pick the file you just downloaded.
5. Audio should play the same as before. Phase pills should match.

- [ ] **Step 28.4: External API smoke test**

In browser console, with Miami Nights loaded and playing:

```javascript
window.synthwaveSurfer.getPhases();        // → ["calm", "pumping"]
window.synthwaveSurfer.getCurrentPhase();   // → "pumping" (or "calm" if you switched)
window.synthwaveSurfer.setPhase("calm");    // → true; audio switches at next bar
const meta = window.synthwaveSurfer.getMeta();
console.log(meta.mood, meta.energy);        // → "nostalgic" "high"
const unsub = window.synthwaveSurfer.onPhaseChange(p => console.log('phase →', p));
window.synthwaveSurfer.setPhase("pumping"); // logs "phase → pumping"
unsub();
window.synthwaveSurfer.setPhase("nope");    // → false; console.warn
```

- [ ] **Step 28.5: WAV export works**

Generate any state (preset or generative). Click **⬇ WAV**. Open the file — must contain audio matching what you heard.

- [ ] **Step 28.6: State JSON export**

Generate any state. Click **⬇ State JSON**. Open file — must be valid JSON with `seed`, `patternMode`, `currentPhase`, `swmd` (if fixed-mode) keys.

- [ ] **Step 28.7: Generative mode still works**

1. Click **⚙ Generativ** (or pick no preset).
2. Click **⚙ Generate**.
3. Audio plays. Phase pills are hidden.
4. WAV export still works.

- [ ] **Step 28.8: Update memory file**

Edit `claude/memory/project_synthwave_surfer.md` to reflect Phase 1 complete and Phase 2 (plugin migration) as the next step. Replace any reference to the old plan filename with the new one.

- [ ] **Step 28.9: Final commit + tag**

```bash
git add claude/memory/project_synthwave_surfer.md
git commit -m "docs: update memory — Phase 1 complete, Phase 2 plugin migration next"
git tag phase-1-foundations
```

---

## Self-Review

**1. Spec coverage:** Each spec section maps to plan tasks:

| Spec section | Tasks |
|---|---|
| §3.2 Modules | 2-13 (codec), 12-13 (engine + API), 14 (form builder) |
| §3.3 Data flow | 14-15 (buildFormFromSwmd + generate branch) |
| §3.4 Generative mode preserved | 12 (engine returns null in generative), 15 (generate branch) |
| §4 .swmd format spec | 2 (frontmatter), 4 (multi-phase splitter), 5-9 (sub-parsers), 10-11 (full parse + serialize) |
| §5 Phase Engine | 12 (state + setPhase) |
| §6 External API | 13 |
| §7 Curated presets | 21-26 (one per preset) |
| §8 UI changes | 16 (toggle), 17 (SWMD buttons), 18 (state JSON), 19 (phase selector), 20 (preset hookup) |
| §10 Testing | 1 (harness), tests embedded in 2-13, 28 (manual checklist) |
| §11.1 Risks (WAV bug) | 27 |
| §12 Success criteria | 28 (verification checklist) |

All covered.

**2. Placeholder scan:** No "TBD", "TODO", or "implement later" present. All code blocks are complete. The only forward-reference is in Task 15 which adds a `function syncPhaseSelector() { /* implemented in Task 19 */ }` stub — Task 19 replaces the stub. The comment is accurate; this is not a placeholder.

**3. Type consistency:**
- Phase object shape `{ name, bassPattern, leadPattern, bassSettings, leadSettings, padSettings, padChords, drumGrid }` is consistent across Tasks 10 (parser output), 11 (serializer input), 12 (engine consumes), 14 (buildFormFromSwmd consumes), 21-26 (presets use same shape via parser).
- `currentSwmd` shape `{ meta, phases: [...], fxSettings }` is consistent across 10, 11, 12, 13, 17, 20.
- `parsePianoRoll` returns `[{degree, duration} | {rest:true, duration}]` — consumed by `serializePianoRoll` (6), `buildFormFromSwmd` (14, via existing `transpose` which works on both shapes thanks to existing code).
- Drum grid shape `{kick, snare, hihat, open}` each `boolean[16]` — consistent across 7 (parser/serializer), 17 (defaultDrumGridForAlgo).

**4. Ambiguity check:**
- `generate()` in Task 15 references `syncPhaseSelector` and `$('export-swmd')`/`$('state-export')` which don't exist until Tasks 17, 18, 19. Resolved by adding stub `function syncPhaseSelector(){}` and guarded `if (exSwmd) ...` in Task 15.
- The serializer in Task 11 went through one revision because the section heading depth was inconsistent between phase context and file context. Resolved by always emitting multi-phase form (`## Phase: name` always present), with `### Bass / ### Settings / ### Pattern` consistently at level 3.
- Task 17 `defaultDrumGridForAlgo` is used inside `buildSwmdFromCurrentState` for **generative-state SWMD export**; multi-phase fixed presets supply their own drum grid in the embedded `.swmd`.

No remaining ambiguities.

**5. Missing tasks:** Spec §11.2 calls out three open questions all marked "Decision: …". No implementation work needed for those.

Self-review complete. Ready for execution.
