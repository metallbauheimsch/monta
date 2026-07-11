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
  "Blindniete",
];

// Ausführung ersetzt die bisherige "Oberfläche" (Festigkeit wird nicht verwendet).
export const ausfuehrungen = ["galvanisch", "feuerverzinkt", "HV", "Edelstahl"];

// Größenvorschläge M4 bis M20, freie Eingabe bleibt weiterhin möglich.
export const groessen = ["M4", "M5", "M6", "M8", "M10", "M12", "M14", "M16", "M18", "M20"];
