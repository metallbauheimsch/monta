# Druckstation – lokale Einrichtung (Ricoh IM C2010)

MONTA erzeugt Druckaufträge und öffnet die Druckansicht. Die Auswahl des
physischen Druckers und stilles Drucken liegen beim Windows-PC / Browser.

## Ziel

- Drucker: Ricoh IM C2010
- Papier: A4
- Farbe
- Einmaldruck je Baugruppe bei 100 % montagebereit

## Standardmodus (ohne Silent Printing)

1. Windows: Ricoh IM C2010 als **Standarddrucker** einrichten
2. Druckereigenschaften: A4, Farbe
3. In MONTA Gerät als Druckstation aktivieren
4. Bei Auftrag erscheint der normale Browser-Druckdialog
5. Nutzer bestätigt „Wurde die Liste erfolgreich gedruckt?“

## Silent-Printing (optional)

Nur wenn lokal fachgerecht eingerichtet. Sonst Silent-Modus in MONTA **nicht**
aktivieren.

### Chrome / Edge (Beispiel)

- Kiosk / Policy für `PrintingEnabled`, Standarddrucker
- Ggf. `--kiosk-printing` (Chrome) nur auf dem Druckstations-PC
- Unternehmensrichtlinien bevorzugen gegenüber experimentellen Flags

Nach erfolgreicher lokaler Einrichtung:

- In MONTA „Silent-Druckmodus“ am Gerät aktivieren
- Auftrag wird nach `window.print()` als gedruckt markiert

## Hinweise

- Smartphone/Tablet desselben Benutzers sind keine Druckstation
- Mehrere Browserfenster: nur das aktivierte Gerät mit `device_id` beansprucht Jobs
- Browser können den Papierauswurf nicht sicher bestätigen – deshalb Standardmodus mit Rückfrage
