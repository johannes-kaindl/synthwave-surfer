#!/usr/bin/env node
// Nimmt das README-Hero-Bild (docs/images/hero.png) reproduzierbar auf (CORE-META-03).
//
// Ablauf: statischer Node-Server auf einem freien Port -> Chromium (Playwright)
// -> Outrun-Karte laden (kuratierter Seed 1986) -> Generate -> Screenshot.
// "Generate" nutzt den Seed aus dem Eingabefeld (kein Zufall), die Komposition
// ist also dieselbe; Audio startet nicht, das Bild zeigt nur die Oberfläche.
// Animationen werden für die Aufnahme angehalten (animations: 'disabled'): ohne das
// hing das Bild von der Animationsphase ab (gemessen: 0,4 % der Pixel wichen ab).
//
// Voraussetzung: Playwright ist nicht Teil des Repos (kein Build, keine Abhängigkeiten).
// Auflösung über NODE_PATH, z. B.:
//   NODE_PATH=../kuro-screensaver/node_modules node scripts/shoot-hero.mjs
// Exit 0 nur, wenn die Seite ohne Skriptfehler geladen wurde und das Bild
// 2880x1920 Pixel hat (Hero-Breite im README: 820 px, readme_lint).

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'images', 'hero.png');
const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright nicht gefunden. NODE_PATH auf ein node_modules mit playwright setzen.');
  process.exit(2);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, rel === '/' ? 'synthwave_surfer.html' : rel);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    await stat(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

let browser;
let code = 0;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  await page.goto(`http://127.0.0.1:${port}/synthwave_surfer.html`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('.algo-card[data-algo="outrun"]', { timeout: 15000 });
  await page.click('.algo-card[data-algo="outrun"]');
  await page.click('#generate');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await mkdir(dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: false, animations: 'disabled' });
  const png = await readFile(out);
  const dim = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
  const seed = await page.inputValue('#seed');
  console.log(`hero.png geschrieben (${dim}, Seed ${seed}); Skriptfehler: ${errors.length}`);
  errors.slice(0, 5).forEach(e => console.log('  ', e));
  if (errors.length) code = 1;
  if (dim !== '2880x1920') { console.error(`Bildgröße ${dim} statt 2880x1920`); code = 1; }
  if (seed !== '1986') { console.error(`Seed ${seed} statt 1986 — Karte nicht geladen?`); code = 1; }
} catch (e) {
  console.error('SHOT ERROR:', e.message);
  code = 2;
} finally {
  if (browser) await browser.close();
  server.close();
}
process.exit(code);
