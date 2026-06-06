---
title: Genre-Expansion (Layer A→C) + Drum-System
date: 2026-06-06
status: offen
---

## Was erledigt wurde
Lange Multi-Day-Session (2026-06-03 → 06). Branch `genre-layer-a`, **18 Commits vor `main`** (noch nicht gemerged). Detail-Stand: `claude/memory/project_synthwave_surfer.md`.

- **Neufassung** (settings-first, 4 Engines, ENGINE_VOICINGS/mergeVoicing) — fertig & nach `main` gemerged (2026-06-04).
- **9 Genres** live: Outrun · Noir (Vangelis) · Dreamwave · Carpenter (Halloween-Arp) · Techno · Prog House · Trance · Dubstep · Acid (echtes 303).
- **Genre-Authentizitäts-Audit** (Workflow, `docs/.../2026-06-06-genre-authenticity-audit.json`) → Config-Genres waren zu flach (38–52/100); audit-getriebene Fixes (Supersaw-Lead, 303-Modell, Accent-Filter).
- **Layer C Drop/Arrangement**: 32-Takt mehrteilig (Build→Drop1→Main→Breakdown→Drop2→Main), Riser + Crash, Kick-Cut im Breakdown + Pre-Drop-Break.
- **Drum-Kit-System** (DRUM_KITS: linn/909/808/dubstep) + **Drum-Tweak-UI** (Panel mit Kit-Dropdown + Live-Knöpfen: Kick Decay/Boom, Snare Whip/Tone, Hat Decay, Snare-Gate) — beide Hälften der User-Drum-Forderung erfüllt.
- **Factory-Presets kollabiert** → jede Genre-Card *ist* ihr Preset (GENRE_SEED).
- **Headless-Audio-Harness** (Playwright, `.remember/tmp/verify_*.cjs`) — Claude prüft Klang/Fehler selbst.
- AGENTS.md neu angelegt.

## Offen für nächste Session (User-Reihenfolge)
- [ ] **Feintuning** (alles konkret im Audit-JSON): rollende Offbeat-Bässe (Techno/Prog/Trance), Dubstep Sub-Layer + per-Takt-Wobble-Automation, Detroit-Stab, Drop-Timing-Feinschliff.
- [ ] **Branch `genre-layer-a` → `main` mergen** (wenn Feintuning sitzt).
- [ ] Danach: Lo-fi / Chillstep / DnB, dann Tier 3 **Bach** (polyphone Kontrapunkt-Engine).
- [ ] Cleanup: toter `FACTORY_PRESETS`/`applyPreset`-Code; WAV-Export-Bug (`Tone.Offline`/`Destination` Cross-Context, parked).

## Merken
- **User-Lehre:** Genre-Treue **strukturell gegen die DNA** verifizieren (Code-vs-Spec), nicht nach Gefühl raten.
- **Drop-Quirk:** Build ist RMS-lauter als Main (durchlaufender Kick); Drop-*Gefühl* = Pre-Drop-Break → Slam, nicht Durchschnittspegel.
- Audio nur via HTTP-Server; nach Hard-Refresh **▶ Play** drücken (AudioContext braucht Geste).
- User ist neurodivergent (ADHS): immer begründete Empfehlung bei Entscheidungen; „gerne weiter" = autonom weiterbauen, an Checkpoints (Hörtest) übergeben.
