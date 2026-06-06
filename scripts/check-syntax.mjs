// Syntax gate for Synthwave Surfer — the mandatory pre-commit check.
//
//   node scripts/check-syntax.mjs
//
// The whole app is inline in synthwave_surfer.html, so `node --check` can't see
// it. This extracts every inline <script> block (those without a `src=`, i.e.
// not the Tone.js CDN tag) and parses each with the VM compiler — which validates
// syntax WITHOUT executing (so browser globals like `document`/`Tone` are fine).
// Exit code is non-zero iff a block fails to parse.
import fs from 'fs';
import vm from 'vm';

const src = fs.readFileSync(new URL('../synthwave_surfer.html', import.meta.url), 'utf8');
const blocks = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

if (!blocks.length) { console.error('no inline <script> blocks found'); process.exit(2); }

let ok = true;
blocks.forEach((code, i) => {
  try { new vm.Script(code, { filename: `inline-script-${i}.js` }); }
  catch (e) { ok = false; console.error(`✗ syntax error in inline script #${i}: ${e.message}`); }
});

console.log(ok ? `SYNTAX OK — ${blocks.length} inline script block(s) parse` : 'SYNTAX FAILED');
process.exit(ok ? 0 : 1);
