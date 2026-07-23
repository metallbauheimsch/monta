# MONTA – Entwicklungsprinzipien

Version: 1.0

Dieses Dokument beschreibt die Grundprinzipien von MONTA.

Es ergänzt die technischen Regeln aus `MONTA_SAFETY.md` und dient als Leitlinie für jede zukünftige Entwicklung.

---

# 1. MONTA bildet den realen Montageablauf ab

Die Software soll sich an den Arbeitsabläufen der Monteure orientieren.

Nicht der Monteur soll seine Arbeitsweise an die Software anpassen.

Jede neue Funktion muss den realen Ablauf einfacher, schneller oder sicherer machen.

---

# 2. So wenig Klicks wie möglich

Jeder unnötige Klick kostet Zeit.

Der Benutzer soll möglichst direkt arbeiten können.

Deshalb gilt:

- sinnvolle Standardwerte

- automatische Vorschläge

- automatische Ergänzungen

- möglichst wenig Dialoge

- keine unnötigen Rückfragen

---

# 3. Der Monteur entscheidet

MONTA unterstützt Entscheidungen.

MONTA ersetzt keine fachliche Entscheidung.

Der Benutzer behält jederzeit die Kontrolle.

Automatische Änderungen dürfen niemals unbemerkt erfolgen.

---

# 4. Routine wird automatisiert

Alles, was eindeutig ist, soll automatisch erledigt werden.

Beispiele:

- automatische Drehmomente

- automatische Hinweise

- automatische Materialergänzungen

- automatische Benachrichtigungen

- automatische Druckaufträge

Automatisiert wird nur, wenn die Regel fachlich eindeutig ist.

---

# 5. Daten sind wichtiger als Funktionen

Neue Funktionen dürfen niemals bestehende Projektdaten gefährden.

Bestehende Projekte sind Dokumentation realer Bauvorhaben.

Sie besitzen höchste Priorität.

---

# 6. Ein Projekt bleibt nachvollziehbar

Jede Materialposition muss jederzeit nachvollziehbar bleiben.

Es muss erkennbar sein:

- woher sie stammt

- zu welchem Bauteil sie gehört

- zu welcher Baugruppe sie gehört

- warum sie benötigt wird

Nachvollziehbarkeit ist wichtiger als maximale Verdichtung.

---

# 7. Übersicht vor Komplexität

MONTA soll möglichst einfach wirken.

Komplexe Abläufe dürfen intern stattfinden.

Die Oberfläche soll ruhig, klar und übersichtlich bleiben.

---

# 8. Ein Begriff bedeutet immer dasselbe

Gleiche Dinge werden überall gleich bezeichnet.

Bezeichnungen dürfen sich nicht je nach Ansicht ändern.

Beispiele:

- HV-Garnitur

- Baugruppe

- Bauteil

- Herkunft

- Lager

- Prüfung

- Warenkorb

---

# 9. Echte Baustellen entscheiden

Neue Funktionen werden zunächst im echten Projekt getestet.

Erst danach werden Begriffe oder Abläufe grundlegend geändert.

Praxis geht vor Theorie.

---

# 10. Standardisierung

MONTA soll nach und nach den Unternehmensstandard abbilden.

Neue Projekte sollen automatisch nach dem aktuellen Standard aufgebaut werden.

Bestehende Projekte bleiben unverändert.

---

# 11. Einmal erfassen

Informationen sollen möglichst nur einmal eingegeben werden.

Danach werden sie überall genutzt:

- Lager

- Prüfung

- Warenkorb

- Druck

- Benachrichtigungen

Doppelte Eingaben sind zu vermeiden.

---

# 12. Mobile Nutzung ist gleichwertig

Alle wichtigen Funktionen müssen auf

- PC

- Tablet

- Smartphone

gleich zuverlässig funktionieren.

Die Bedienung auf der Baustelle besitzt denselben Stellenwert wie die Büroanwendung.

---

# 13. Performance

MONTA soll sich jederzeit schnell anfühlen.

Große Projekte dürfen die Bedienung nicht spürbar verlangsamen.

Realtime darf niemals zu instabilen Oberflächen führen.

---

# 14. Entwicklung

Neue Funktionen werden in kleinen, nachvollziehbaren Schritten umgesetzt.

Jeder Sprint endet mit:

- Build erfolgreich

- Dokumentation aktualisiert

- manuelle Testanleitung

- erst danach Commit und Push

---

# 15. Langfristige Vision

MONTA soll die zentrale digitale Arbeitsplattform für den Metallbau werden.

Das Ziel ist nicht möglichst viele Funktionen.

Das Ziel ist:

- sichere Abläufe

- weniger Fehler

- weniger Rückfragen

- vollständige Dokumentation

- schnelle Baustellenabwicklung

- einfacher Wissenstransfer

- hohe Datenqualität

Jede neue Funktion soll dieses Ziel unterstützen.

---

# 16. Unternehmensphilosophie

MONTA wird gemeinsam mit den Mitarbeitern entwickelt.

Ideen entstehen aus der täglichen Praxis.

Neue Funktionen orientieren sich an echten Baustellen, echten Projekten und realen Arbeitsabläufen.

Die Software entwickelt sich mit dem Unternehmen weiter.

Nicht das Unternehmen mit der Software.