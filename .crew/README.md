# Crew-Ordner

Übergabepunkt zwischen Teamleader (Claude-Session) und lokalen Workern (opencode).
Im Repo heißt dieser Ordner `.crew/`, im Obsidian-Vault `_Crew/` (Punkt-Ordner sind dort unsichtbar).

- `tasks/NN-<slug>.md` — ein Auftrag je Worker, vom Teamleader geschrieben (Vorlage `_TEMPLATE.md`).
- `reports/NN-<slug>.md` — Ergebnis des Workers, gleicher Dateiname wie der Auftrag.
- `runs/YYYY-MM-DD-<slug>.md` — Lauf-Protokoll des Teamleaders.
- `RULES.md` — Regeln für Worker; jeder Worker liest sie vor der Arbeit.

Ablauf: Teamleader schreibt Auftrag → Worker liest Auftrag und RULES → Worker arbeitet nur in den
erlaubten Pfaden → Worker schreibt Report → Teamleader prüft mit dem Prüfkommando und integriert.

Worker committen nie. Der Teamleader ist alleiniger Integrator.
