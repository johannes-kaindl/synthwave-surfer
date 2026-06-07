---
title: Public-Release + EDM-Feintuning (v0.1.0 → v0.2.0)
date: 2026-06-08
status: abgeschlossen
---

## Was erledigt wurde

- **Repo veröffentlicht** (vorher unpubliziert): Codeberg `jkaindl/synthwave-surfer`
  (remote `origin`) + GitHub-Mirror `johannes-kaindl/synthwave-surfer` (remote
  `github`), beide SSH. `genre-layer-a` per Fast-Forward in `main` gemerged.
  **Codeberg-Pages-Live-Demo** (`pages`-Branch + `index.html`-Redirect):
  https://jkaindl.codeberg.page/synthwave-surfer/
- **Umfassende EN-Doku** im Hausstil (Vorbild `perlin-studio`): README (Hero,
  Genre-Tabelle, Architektur-Diagramm, Quickstart, Roadmap), `docs/ARCHITECTURE.md`
  + `docs/USAGE.md`, CONTRIBUTING, CHANGELOG, SECURITY, LICENSING + CLA + LICENSE
  (AGPL-3.0 dual-licensed), `.editorconfig`. Committete Test-Scripts
  `scripts/{fullsuite,check-syntax}.mjs`. Doku reader-getestet (Sub-Agents).
- **Vier Releases** (je Codeberg + GitHub):
  - v0.1.0 — Publish + Doku.
  - v0.1.1 — veralteter In-App-Text (Epigraph/Footer/Header-Badge).
  - v0.1.2 — WAV-Export gefixt (Offline-Render via setContext+OfflineContext.render,
    getDestination/getTransport), Genre-Wechsel-während-Playback (generate→startPlayback),
    dubstep-halftime Same-time-Hat-Dedup; + Tote-Code-Cleanup (FACTORY_PRESETS).
  - v0.2.0 — **EDM-Feintuning**: rollende Offbeat-Bässe (Techno sustained+melodisch,
    Prog/Trance 16tel-Roll), **Techno-Detroit-Stab** statt Pad (`padStab` + `buildPadHits`),
    EDM-Pads leiser/dunkler/trockener, **Supersaw-Leads** (per-Genre `leadRoot:57` =
    Oktave tiefer, sustain 0.10, über Mains + Breakdown wiederholt), **Dubstep geparkt**
    (Card versteckt), Piano-Roll-Fix (geteiltes `buildPadHits`), **bassFill-Rest-Bug**
    gefixt (verlor rest-Flag → NaN-Noten → blanke Roll), Performance-Leak gefixt
    (disposeLive rekursiv + renderMeters RAF-Single-Loop), supersaw im Model-Dropdown.
- **Repo-Metadaten** (CORE-META-10): Beschreibung + Homepage + 15 Topics auf beiden.
- Suite **47/0**, jeder Schritt Playwright-verifiziert (RMS/Meter + Struktur).

## Offen für nächste Session

- [ ] Trance: „Pad/Lead nie solo im Breakdown" + Idee **Trance-Pad → `acid`-Modell**
  (kleinster Rest aus dem Hörtest-Feedback)
- [ ] **Layer B** — neue Genres: Lo-fi / Chillstep / DnB
- [ ] **Dubstep entparken**: echtes Wobble via dediziertem Filter-Knoten im Bass-Bus
  (Bus-LFO erreicht den `alkali`-PolySynth-per-Voice-Filter nicht)
- [ ] **Tier 3 — Bach** (polyphone Kontrapunkt-Engine)
- [ ] Offene Konventions-Punkte (AGENTS.md): CORE-META-03 (Hero→`docs/images/`),
  CORE-META-08 (LICENSE-DOCS CC-BY-SA), CORE-AGENT-01 (Abweichungen-Abschnitt),
  CORE-AGENT-05 (`.claude/` gitignoren)

## Merken

- **Sound-Workflow:** pro Increment implementieren → headless verifizieren
  (`fullsuite` + Playwright-RMS/Meter + Struktur-Dump) → **User-Hörtest** → erst dann
  committen. Sound-Authentizität entscheidet Jays Ohr; nie ungehörte Sound-Änderungen
  committen. Hörtest läuft über lokalen `python3 -m http.server 8745`.
- **Tone.js-Gotchas (neu):** Offline-Render nur via `getDestination()`/`getTransport()`
  + `setContext()` + `OfflineContext.render()` — das globale `Tone.Destination` folgt
  `setContext` NICHT. Ein Bus-LFO erreicht keinen PolySynth-per-Voice-Filter (Wobble
  braucht einen dedizierten Filter-Knoten im Signalweg). `bassFill` muss das `rest`-Flag
  erhalten (sonst NaN-Noten bei Rolling-Bässen).
- **Publishing:** `origin`=Codeberg / `github`=GitHub (SSH). Codeberg-Releases-Unit ggf.
  erst per `PATCH has_releases=true` aktivieren, sonst 404 auf `/releases`. Pages via
  `pages`-Branch. Tokens: `~/.codeberg-token`, `~/.github-token`.
- **Workspace-Konvention (neu, User/Linter):** Leitkonvention in
  `_docs/CONVENTIONS.md` (Workspace-Root `/Users/Shared/code/`), comply-or-explain;
  offene Repo-Punkte in AGENTS.md „Offene Konventions-Punkte".
