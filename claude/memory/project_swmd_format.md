---
name: .swmd Format – Design & Entscheidungen
description: Spezifikation des Synthwave-Markdown-Codecs, Dateiendung, Obsidian-Kompatibilität
type: project
---

**`.swmd`** ist der Name des Codecs und Formats, aber Dateien auf Disk bekommen die Endung `.md` — Obsidian öffnet nur `.md`-Dateien für Editing. Das Frontmatter-Feld `synthwave-surfer: "1.0"` identifiziert sie als Synthwave-Dokumente (gleiche Konvention wie Obsidian-Plugins, z.B. Dataview).

**Format-Struktur (v1.0 mit Multi-Phase, Stand 2026-05-14):**
- YAML Frontmatter: flach, Obsidian-safe. Felder: `synthwave-surfer`, `name`, `algo`, `bpm`, `mode`, `pattern-mode`, `bass-root`, `lead-root`, **NEU:** `mood` (free-text), `energy` (low|medium|high), `default-phase`
- **Multi-Phase:** Eine `.swmd` enthält 1..N Phasen. Phasen-Header `## Phase: name` (level 2). Innerhalb jeder Phase: `### Bass · <Model>`, `### Lead · <Model>`, `### Pad · <Model>`, `### Drums` (level 3) — jeweils mit `### Settings` und `### Pattern` / `### Progression`
- Backwards-Compat: Files ohne `## Phase:`-Header werden als implizite Phase `default` geparst
- File-level (außerhalb Phasen): `## FX Bus`, `## Routing`
- Piano-Roll-Encoding: `●` ON, `─` HOLD, blank Pause — monophon
- Drum-Grid: 16 Steps in swdrum-Codeblock, `x` Hit, `.` Pause

**Didaktischer Wert:** Piano-Roll als Markdown-Tabelle ist für Musikeinsteiger sofort lesbar; Mermaid zeigt Signalfluss; Step-Grid ist DAW-Notation als Text.

**Obsidian-Plugin-Pfad:** `registerMarkdownCodeBlockProcessor` für `swdrum`-Blöcke kann später interaktive Step-Sequencer-UI in Obsidian rendern.

**Why:** Johannes plant Synthwave Surfer als Obsidian-Plugin weiterzuentwickeln.
**How to apply:** Import/Export-Button akzeptiert `.md`-Dateien; interner Codec-Name bleibt swmd.
