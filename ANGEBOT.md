---
repo: synthwave-surfer
stand: 2026-10-04
liefert:
  - id: midi
    artefakt: MIDI-Export aller Spuren
    format: ".mid"
    deterministisch_aus: [seed, genre, bpm, scale]
    befehl: "Browser-UI, Export → MIDI"
    lizenz: "AGPL-3.0-or-later; kommerzielle Lizenz auf Anfrage (LICENSING.md)"
  - id: wav
    artefakt: WAV-Export (Offline-Render)
    format: ".wav"
    deterministisch_aus: [seed, genre, bpm, scale]
    befehl: "Browser-UI, Export → WAV"
    lizenz: "AGPL-3.0-or-later; kommerzielle Lizenz auf Anfrage (LICENSING.md)"
  - id: swmd
    artefakt: Markdown music format (Obsidian-kompatibel)
    format: ".swmd / .md"
    deterministisch_aus: [seed, genre, bpm, scale]
    befehl: "Browser-UI, Export → .swmd"
    lizenz: "AGPL-3.0-or-later; kommerzielle Lizenz auf Anfrage (LICENSING.md)"
  - id: state-json
    artefakt: Vollständiger State-Snapshot inkl. SWMD
    format: ".json"
    deterministisch_aus: [seed, genre, bpm, scale]
    befehl: "Browser-UI, Export → State JSON"
    lizenz: "AGPL-3.0-or-later; kommerzielle Lizenz auf Anfrage (LICENSING.md)"
nicht_geliefert:
  - was: Export ohne Browser-UI
    grund: Die App ist eine reine Client-Side Web-App ohne Backend oder CLI.
  - was: Kommandozeilen-Schnittstelle (CLI)
    grund: Es existiert kein CLI-Tool zur Steuerung oder zum Export.
  - was: Headless-Generierung von Seed und Genre
    grund: Die Steuerung erfolgt ausschließlich über die grafische Benutzeroberfläche.
---
# Angebot

synthwave-surfer liefert anderen Repos **Kompositionen als Dateien**: MIDI mit allen Spuren, WAV aus dem Offline-Render, `.swmd` als Markdown-Partitur und den vollständigen Zustand als JSON, alle deterministisch aus Seed, Genre, BPM und Scale (README § Features, § Usage; docs/USAGE.md § Export). Ein Kommando ohne Browser gibt es nicht; das ist der erste Bedarf der Medienintegration an dieses Repo.

## Holen

Die Artefakte werden über die Browser-UI der Web-App erzeugt. Nach Auswahl eines Genres und optionaler Anpassung von Seed, BPM und Scale kann der gewünschte Export über das Export-Panel gestartet werden. Die resultierenden Dateien werden direkt über den Browser heruntergeladen.

## Was es nicht ist

Dies ist kein Headless-Generator oder CLI-Tool, sondern eine interaktive Web-App. Es werden keine API-Endpunkte für die automatisierte Generierung von Audio oder MIDI-Dateien ohne menschliche Interaktion über die UI bereitgestellt.

## Geprüft

Lint `angebot-form` grün am 2026-10-04 (Probe D16, lokaler Worker Gemma 4 31B, integriert von der Master-Session). Die Exporte selbst wurden in diesem Lauf nicht ausgeführt; sie brauchen den Browser.
