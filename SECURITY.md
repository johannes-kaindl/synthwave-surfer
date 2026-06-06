<!--
SPDX-FileCopyrightText: 2026 Johannes Kaindl
SPDX-License-Identifier: CC-BY-SA-4.0
-->

# Security reports

Synthwave Surfer is a **hobby project** with no security team, no SLA, and no
bug bounty. That said, I'm happy to receive reports about security-relevant
issues and try to address them promptly.

## In scope

- **Cross-site scripting** in any UI control — the seed/BPM inputs, preset
  names, or anything rendered from imported files or `localStorage`.
- **Malicious `.swmd` / preset / state-JSON import** — parsing an untrusted
  imported file in a way that could execute code or corrupt unrelated state.
- **`localStorage` poisoning** — saved presets (`synthwave_surfer_presets_v1`)
  influencing the page beyond their intended data.
- **CSP / same-origin bypass** when the live demo is embedded into third-party
  sites.

If you're not sure whether something belongs here, please err on the side of
reporting.

## Out of scope

- General bug reports without security impact — please file a public issue:
  <https://codeberg.org/jkaindl/synthwave-surfer/issues>.
- Browser / Web Audio quirks with no security implication — those belong with
  the vendors.
- General hardening suggestions without a concrete attack scenario — fine as a
  normal issue with the `enhancement` label.

## How to report

**Preferred:** private Codeberg issue in this repo, or DM via Codeberg to
[@jkaindl](https://codeberg.org/jkaindl). Codeberg supports private issues —
tick the privacy box when filing.

**Alternative:** email to the address listed on the
[Codeberg profile](https://codeberg.org/jkaindl).

PGP isn't set up; for sensitive reports I can publish a key on request.

## What to expect

- **Acknowledgement** within 7 days.
- **First assessment** (reproduction, severity, planned approach) within 14 days.
- **Fix or documented workaround** as quickly as is realistic for a hobby
  project — critical: days, normal: weeks.
- **Credit** in `CHANGELOG.md` and release notes if you'd like.

## Scope and threat model

Synthwave Surfer is **fully client-side**:

- No backend, no server calls, no external API keys.
- No auth, no sessions, no multi-user data.
- The only runtime fetch is the [Tone.js](https://tonejs.github.io/) library
  from a CDN; everything else is in the single HTML file.
- Presets and settings live in the browser's `localStorage`.
- Audio rendering and all exports (MIDI / `.swmd` / JSON; WAV is currently
  disabled) happen entirely in the browser.

Reports that violate these assumptions (covert network calls, tracking, synced
data) are very much in scope and especially welcome.

## Known design decisions that aren't bugs

- **No CSP header on the live demo.** Codeberg Pages serves pages without custom
  headers. Mitigation: no `eval`, no inline construction of script from user
  input.
- **Imports are trusted to the extent of the current tab.** A `.swmd` / preset /
  state file you import can set any composition parameter — that's the point.
  It runs only in your tab and cannot reach the filesystem or network.
- **No migration for stored presets.** Presets saved under an older schema may
  lack newer fields — deliberate, to avoid migration complexity.
