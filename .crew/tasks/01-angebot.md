---
rolle: dokumentar
zeitbudget: 25m
---
# 01-angebot

## Ziel
Eine Datei `ANGEBOT.md` im Repo-Root, die nach der Vorlage sagt, was synthwave-surfer anderen Repos liefert: die Exporte MIDI (alle Spuren), WAV (Offline-Render), `.swmd` und State-JSON, jeweils deterministisch aus Seed, Genre, BPM und Scale; dazu die Lücken (kein Export ohne Browser, kein CLI, kein Befehl für Seed und Genre ohne Oberfläche).

## Quellen (nur diese, nichts erfinden)
- `README.md` § Features, § Genres, § Usage (Tabelle „Export"), § The .swmd format, § Roadmap
- `docs/USAGE.md`
- Vorlage: `../../workspace/_docs/templates/ANGEBOT.md` (Pfad relativ zu diesem Repo; die Struktur der Vorlage ist Pflicht, jeder Platzhalter in spitzen Klammern wird durch einen Wert aus den Quellen ersetzt; `repo: synthwave-surfer`, `stand: 2026-10-04`)
- Form der Felder: `../../workspace/_docs/CONVENTIONS.md`, Regel PROF-MEDIA-01
- Form-Regeln des Frontmatters: unter `liefert:` und `nicht_geliefert:` steht jeder Eintrag als `  - schluessel: wert`, die weiteren Felder des Eintrags genau zwei Leerzeichen tiefer als der Bindestrich; kein leerer Wert; Listen in eckigen Klammern `[seed, genre, bpm, scale]`; keine Pfade einer Maschine (nichts mit `/Users/` oder `~/`)
- Ein Eintrag je Export: `midi`, `wav`, `swmd`, `state-json`; `befehl` ist für alle „Browser-UI, Export → <Name>“, weil es kein Kommando gibt

## Erlaubte Pfade
- `ANGEBOT.md`
- `.crew/reports/01-angebot.md`

## Fertig-Kriterium
Das Prüfkommando meldet keine Zeile mit `angebot`. Jede Aussage in `ANGEBOT.md` lässt sich auf eine Zeile in README.md oder docs/USAGE.md zurückführen; der Report nennt je Eintrag die Fundstelle (Datei und Überschrift).

## Prüfkommando
```
python3 ../../workspace/_docs/readme/readme_lint.py . | grep -i angebot || echo "kein Angebot-Befund"
```

## Report
`.crew/reports/01-angebot.md` nach Vorlage `.crew/reports/_TEMPLATE.md`.
