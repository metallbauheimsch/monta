// Startliste der Bezeichnungs-Vorschläge (Sprint 2). Zusätzlich gemerkte,
// bisher unbekannte Bezeichnungen kommen zur Laufzeit über
// descriptionsRegistry.js hinzu (siehe getDescriptionOptions()).
export const descriptions = [
  "Sechskantschraube",
  "Senkschraube",
  "Linsenkopfschraube",
  "Zylinderkopfschraube",
  "Bohrschraube",
  "Holzschraube",
  "Blechschraube",
  "U-Scheibe",
  "Karosseriescheibe",
  "Sechskantmutter",
  "Stoppmutter",
  "Hutmutter",
  "Bolzenanker",
  "Betonschraube",
  "Rahmendübel",
  "Kunststoffdübel",
  "Hilti HIT",
  "Verbundmörtel",
  "Ankerstange",
  "HV-Garnitur",
  "Blindniete",
];

// Ausführung ersetzt die bisherige "Oberfläche" (Festigkeit wird nicht verwendet).
// "HV" bleibt als Ausführungswert für bestehende Daten; neue HV-Schrauben
// werden über die Bezeichnung „HV-Garnitur“ erfasst.
export const ausfuehrungen = ["galvanisch", "feuerverzinkt", "HV", "Edelstahl"];

// Größenvorschläge inkl. M22/M24 für HV-Drehmomente.
export const groessen = [
  "M4", "M5", "M6", "M8", "M10", "M12", "M14", "M16", "M18", "M20", "M22", "M24",
];
