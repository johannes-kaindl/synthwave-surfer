<!--
SPDX-FileCopyrightText: 2026 Johannes Kaindl
SPDX-License-Identifier: CC-BY-SA-4.0
-->

# Licensing

Synthwave Surfer is **dual-licensed**.

## 1. Open-source license (default)

The source code is licensed under the **GNU Affero General Public License,
version 3 or later (AGPL-3.0-or-later)** — see [`LICENSE`](LICENSE). This is the
license that applies to everyone by default, and it is the right choice for the
overwhelming majority of uses: running it, studying it, modifying it,
self-hosting it, and building on it.

The AGPL's network-use clause (§13) is deliberate, not incidental: anything
published as a contribution to the commons should stay in the commons — even
when someone would otherwise reprivatise it behind a network service. If you
distribute Synthwave Surfer, or make a modified version available to users over
a network (for example, as a hosted web app), the AGPL requires that the
corresponding source — including your modifications — be offered to those users
under the same terms.

## 2. Commercial license (on request)

If the AGPL's copyleft and source-disclosure obligations do not fit your use
case — for example, embedding Synthwave Surfer in a **proprietary product, a
closed-source service, or an Apple App Store build** (App Store distribution
terms are incompatible with the AGPL) — a separate **commercial license** is
available.

A commercial license grants the same software under permissive terms (no
copyleft, no source-disclosure obligation) for a fee, optionally bundled with
support.

**To enquire:** email **Johannes Kaindl** at `code@jkaindl.de` with a short
description of your intended use.

## Your generated music

The license covers the **software**. Music you create with Synthwave Surfer —
rendered audio, exported MIDI, or `.swmd` files — is **yours**; the AGPL governs
the code, not your output, and you may use what you generate freely, including
commercially.

## Why this is possible

Synthwave Surfer is authored by a single copyright holder (Johannes Kaindl).
Because all copyright is held in one place — and because every external
contribution is made under the [Contributor License Agreement](CLA.md), which
grants the maintainer the right to relicense — the project can be offered under
both the AGPL and a commercial license simultaneously, without anyone else's
code blocking that option.

## Third-party components

Synthwave Surfer depends on [Tone.js](https://tonejs.github.io/) (MIT), loaded
at runtime from a CDN and **not** redistributed in this repository. Its MIT
license is permissive and compatible with both licensing options above.

---

*This document explains the licensing model in plain language; it is not itself
a license and is not legal advice. The binding terms are in [`LICENSE`](LICENSE)
(AGPL) and in the individual commercial-license agreement.*
