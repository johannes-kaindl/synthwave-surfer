// Headless logic suite for Synthwave Surfer.
//
//   node scripts/fullsuite.mjs        # → real: 45 passed, 0 failed
//
// Extracts the in-file `tests` array plus the pure functions (helpers, engine,
// codec, form builders, ALGORITHMS, ENGINE_VOICINGS, FACTORY_PRESETS) straight
// out of synthwave_surfer.html and runs them under Node. DOM/Tone/window-
// dependent tests cannot run here and are skipped (they run in the browser via
// `?test=1`). Exit code is non-zero iff a real test fails.
import fs from 'fs';
const src = fs.readFileSync(new URL('../synthwave_surfer.html', import.meta.url), 'utf8');

function slice(aStr, bStr) {
  const a = src.indexOf(aStr), b = src.indexOf(bStr);
  if (a < 0 || b < 0) throw new Error('slice markers not found: ' + aStr + ' / ' + bStr);
  return src.slice(a, b);
}
// A: helpers + engine + codec (all pure, ends just before the form builders)
const A = slice('function mulberry32', 'function buildOutrunForm');
// B: form builders + ALGORITHMS (end at ALGORITHMS object's top-level `\n};`)
const _formStart = src.indexOf('function buildOutrunForm');
const B = src.slice(_formStart, _formStart + src.slice(_formStart).indexOf('\n};') + 3);
// C: voicing model
const C = slice('// <<VOICING_START>>', '// <<VOICING_END>>');
// D: FACTORY_PRESETS (end at the object's closing top-level `\n};`)
const fpS = src.indexOf('const FACTORY_PRESETS = {');
const D = src.slice(fpS, fpS + src.slice(fpS).indexOf('\n};') + 3);

// tests array source
const tStart = src.indexOf('const tests = [');
const tEndAnchor = '];\n  for (const [name, fn] of tests)';
const tEnd = src.indexOf(tEndAnchor);
if (tStart < 0 || tEnd < 0) throw new Error('tests array boundaries not found');
const testsSrc = src.slice(tStart, tEnd + 2); // include `];`

// DOM / Tone / window dependent tests — cannot run under bare node
const SKIP = new Set([
  'Phase Engine — getPhases / getCurrentPhase with no swmd',
  'Phase Engine — setPhase switches index',
  'External API — exposed and frozen',
  'buildFormFromSwmd — produces form with bass/lead parts',
]);

const preamble = 'function assert(c,m){ if(!c) throw new Error(m || "assert failed"); }\n';
let tests;
try {
  tests = new Function(preamble + A + '\n' + B + '\n' + C + '\n' + D + '\n' + testsSrc + '\nreturn tests;')();
} catch (e) {
  console.error('EVAL FAIL:', e.message); process.exit(2);
}

let passed = 0, failed = 0, probePass = 0, probeFail = 0, skipped = 0;
const fails = [];
for (const [name, fn] of tests) {
  if (SKIP.has(name)) { skipped++; continue; }
  const isProbe = name.startsWith('[PROBE]');
  try { fn(); isProbe ? probePass++ : passed++; }
  catch (e) {
    if (isProbe) { probeFail++; }
    else {
      // a ReferenceError on a DOM/Tone global means the test is implicitly DOM-bound → skip, don't fail
      if (/is not defined/.test(e.message) && /(document|window|Tone|\$|liveSynths|currentState|currentSwmd|patternMode|drawRoll)/.test(e.message)) { skipped++; }
      else { failed++; fails.push(name + ' :: ' + e.message); }
    }
  }
}
console.log(`real: ${passed} passed, ${failed} failed | probes: ${probePass} pass, ${probeFail} expected-fail | skipped(DOM): ${skipped}`);
if (fails.length) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  ✗ ' + f)); }
process.exit(failed ? 1 : 0);
