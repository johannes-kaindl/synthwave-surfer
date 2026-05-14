---
name: .swmd Format – Design & Entscheidungen
description: Spezifikation des Synthwave-Markdown-Codecs, Dateiendung, Obsidian-Kompatibilität
type: project
---

**`.swmd`** ist der Name des Codecs und Formats, aber Dateien auf Disk bekommen die Endung `.md` — Obsidian öffnet nur `.md`-Dateien für Editing. Das Frontmatter-Feld `synthwave-surfer: "1.0"` identifiziert sie als Synthwave-Dokumente (gleiche Konvention wie Obsidian-Plugins, z.B. Dataview).

**Format-Struktur:**
- YAML Frontmatter: flach, Obsidian-safe (keine Inline-Dicts). Felder: `synthwave-surfer`, `name`, `algo`, `bpm`, `mode`, `pattern-mode`, `bass-root`, `lead-root`
- `## Bass · <Model>` — Piano Roll Tabelle (●=Note ON, ─=Hold, Leerzeichen=Pause) + Settings-Tabelle
- `## Lead · <Model>` — gleiche Struktur
- `## Pad · <Model>` — Chord-Progression-Tabelle (Degrees als Zahlen)
- `## Drums` — Step-Grid in swdrum-Codeblock (`x . . . x . . .`-Notation)
- `## FX Bus` — Tabelle mit Effect/Param/Value
- `## Routing` — Mermaid-Diagramm (Obsidian rendert nativ)

**Didaktischer Wert:** Piano-Roll als Markdown-Tabelle ist für Musikeinsteiger sofort lesbar; Mermaid zeigt Signalfluss; Step-Grid ist DAW-Notation als Text.

**Obsidian-Plugin-Pfad:** `registerMarkdownCodeBlockProcessor` für `swdrum`-Blöcke kann später interaktive Step-Sequencer-UI in Obsidian rendern.

**Why:** Johannes plant Synthwave Surfer als Obsidian-Plugin weiterzuentwickeln.
**How to apply:** Import/Export-Button akzeptiert `.md`-Dateien; interner Codec-Name bleibt swmd.
