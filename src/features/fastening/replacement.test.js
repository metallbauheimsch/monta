/**
 * Tests: zentrale Ersatzlogik (Sprint 2B, erweitert Sprint 2C/2D nach
 * GPT-Code-Review).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isOperationallyTouched,
  isUntouchedItem,
  isReplacedItem,
  isActiveItem,
  hasIdentityChange,
  needsReplacement,
  isReferencedAsReplacement,
  mengeIncreaseNeedsBestelltReset,
  buildReplacementFields,
  formatReplacedHint,
} from "./replacement.js";

describe("A. Unberührte Position: bereit=0, bestellt=false", () => {
  it("gilt als unberührt -> direkte Änderung weiterhin erlaubt", () => {
    const item = { bereit: 0, bestellt: false, menge: 20, bezeichnung: "Sechskantschraube" };
    assert.equal(isOperationallyTouched(item), false);
    assert.equal(isUntouchedItem(item), true);
  });
});

describe("B. Vorbereitete Position: bereit=12", () => {
  it("gilt als operativ bearbeitet -> Ersatzlogik erforderlich", () => {
    const item = { bereit: 12, bestellt: false, menge: 20 };
    assert.equal(isOperationallyTouched(item), true);
  });
});

describe("C. Bestellte Position: bestellt=true", () => {
  it("gilt als operativ bearbeitet -> Ersatzlogik erforderlich, auch bei bereit=0", () => {
    const item = { bereit: 0, bestellt: true, menge: 20 };
    assert.equal(isOperationallyTouched(item), true);
  });
});

describe("Identitätsänderung (Bezeichnung/Größe/Länge/Ausführung)", () => {
  const current = {
    bezeichnung: "Sechskantschraube",
    groesse: "M16",
    laenge: "60",
    oberflaeche: "feuerverzinkt",
    menge: 20,
  };

  it("Größenänderung (M16x60 -> M16x70) ist eine Identitätsänderung", () => {
    assert.equal(hasIdentityChange(current, { laenge: "70" }), true);
  });

  it("reine Mengenänderung ist KEINE Identitätsänderung (gleicher Artikel, neuer Bedarf)", () => {
    assert.equal(hasIdentityChange(current, { menge: 25 }), false);
  });

  it("unveränderter Wert (z. B. erneutes Speichern derselben Bezeichnung) ist keine Änderung", () => {
    assert.equal(hasIdentityChange(current, { bezeichnung: "Sechskantschraube" }), false);
  });
});

describe("D. Neue Ersatzposition startet immer bei 0/false", () => {
  it("übernimmt fachlichen Inhalt, setzt operative Felder zurück", () => {
    const source = {
      bezeichnung: "Sechskantschraube",
      groesse: "M16",
      laenge: "60",
      oberflaeche: "feuerverzinkt",
      menge: 20,
      bereit: 12,
      bestellt: true,
      hinweis: "",
      important_note: false,
    };
    const fields = buildReplacementFields(source, { laenge: "70", menge: 20 });
    assert.equal(fields.bereit, 0);
    assert.equal(fields.bestellt, false);
    assert.equal(fields.geliefert, false);
    assert.equal(fields.laenge, "70");
    assert.equal(fields.bezeichnung, "Sechskantschraube");
    assert.equal(fields.menge, 20);
  });

  it("übernimmt nicht angegebene Felder unverändert vom Ursprung", () => {
    const source = { bezeichnung: "Sechskantschraube", groesse: "M16", laenge: "60", oberflaeche: "feuerverzinkt", menge: 20 };
    const fields = buildReplacementFields(source, { laenge: "70" });
    assert.equal(fields.bezeichnung, "Sechskantschraube");
    assert.equal(fields.groesse, "M16");
    assert.equal(fields.oberflaeche, "feuerverzinkt");
  });
});

describe("E. Altposition: ersetzt_durch gesetzt, reale Werte unverändert", () => {
  it("bereit/bestellt der Altposition werden von buildReplacementFields nicht angefasst", () => {
    // buildReplacementFields beschreibt nur die NEUE Position; die Altposition
    // wird vom Aufrufer (App.jsx replaceItem) nie mit diesen Feldern beschrieben.
    const source = { bereit: 12, bestellt: true };
    const fields = buildReplacementFields(source, { laenge: "70" });
    // fields sind die Werte der NEUEN Position, nicht die der Altposition:
    assert.equal(fields.bereit, 0);
    assert.equal(fields.bestellt, false);
    // Ursprungsobjekt selbst bleibt unverändert (keine Mutation):
    assert.equal(source.bereit, 12);
    assert.equal(source.bestellt, true);
  });
});

describe("F. Ersetzte Altposition ist kein aktueller Bedarf mehr", () => {
  it("isReplacedItem/isActiveItem erkennen ersetzt_durch korrekt", () => {
    const replaced = { id: "old", ersetzt_durch: "new-id" };
    assert.equal(isReplacedItem(replaced), true);
    assert.equal(isActiveItem(replaced), false);
  });
});

describe("G. Aktive Ersatzposition ist aktueller Bedarf", () => {
  it("Position ohne ersetzt_durch bleibt aktiv", () => {
    const active = { id: "new", ersetzt_durch: null };
    assert.equal(isReplacedItem(active), false);
    assert.equal(isActiveItem(active), true);
  });

  it("bestehende Datensätze ohne die Spalte (undefined) verhalten sich wie vor dem SQL-Patch", () => {
    const legacyRow = { id: "legacy" }; // Spalte existiert in der Live-DB evtl. noch nicht
    assert.equal(isReplacedItem(legacyRow), false);
    assert.equal(isActiveItem(legacyRow), true);
  });
});

// ---------------------------------------------------------------------------
// Sprint 2C (GPT-Code-Review): Lager verwendet jetzt dieselbe zentrale
// Entscheidung wie TB (needsReplacement) statt immer zu ersetzen.
// ---------------------------------------------------------------------------

describe("Sprint 2C – Test A: Lager + unberührte Position -> direkte Änderung", () => {
  it("needsReplacement ist false, obwohl sich die Größe ändert", () => {
    const source = { bereit: 0, bestellt: false, bezeichnung: "Sechskantschraube", groesse: "M16", laenge: "60", oberflaeche: "feuerverzinkt" };
    assert.equal(needsReplacement(source, { laenge: "70" }), false);
  });
});

describe("Sprint 2C – Test B: Lager + bereit > 0 -> Ersatz notwendig", () => {
  it("needsReplacement ist true bei Identitätsänderung", () => {
    const source = { bereit: 12, bestellt: false, bezeichnung: "Sechskantschraube", groesse: "M16", laenge: "60", oberflaeche: "feuerverzinkt" };
    assert.equal(needsReplacement(source, { laenge: "70" }), true);
  });
});

describe("Sprint 2C – Test C: Lager + bestellt=true -> Ersatz notwendig", () => {
  it("needsReplacement ist true bei Identitätsänderung, auch ohne bereit", () => {
    const source = { bereit: 0, bestellt: true, bezeichnung: "Sechskantschraube", groesse: "M16", laenge: "60", oberflaeche: "feuerverzinkt" };
    assert.equal(needsReplacement(source, { groesse: "M20" }), true);
  });
});

describe("Sprint 2C – Test E: Menge erhöht bei bestellt=true", () => {
  it("mengeIncreaseNeedsBestelltReset erkennt die Erhöhung", () => {
    const source = { menge: 20, bestellt: true };
    assert.equal(mengeIncreaseNeedsBestelltReset(source, { menge: 30 }), true);
  });
  it("keine Reaktion bei gleicher oder kleinerer Menge", () => {
    const source = { menge: 20, bestellt: true };
    assert.equal(mengeIncreaseNeedsBestelltReset(source, { menge: 20 }), false);
    assert.equal(mengeIncreaseNeedsBestelltReset(source, { menge: 10 }), false);
  });
  it("keine Reaktion, wenn noch nicht bestellt", () => {
    const source = { menge: 20, bestellt: false };
    assert.equal(mengeIncreaseNeedsBestelltReset(source, { menge: 30 }), false);
  });
  it("nach Bestätigung: bestellt wird false, Menge übernommen (Reducer-Logik der UI)", () => {
    const source = { menge: 20, bestellt: true };
    const patch = { menge: 30 };
    const applied = { ...patch, bestellt: false };
    assert.equal(applied.menge, 30);
    assert.equal(applied.bestellt, false);
  });
});

describe("Praxis-Feedback: verständlicher Ersetzungs-Hinweis", () => {
  it("formatReplacedHint nennt die konkrete neue Positionsnummer", () => {
    assert.equal(formatReplacedHint({ pos: "3" }), "Wurde ersetzt durch Pos. 3");
  });
  it("formatReplacedHint mit Zusatzkontext (z. B. Bauteil im Lager)", () => {
    assert.equal(
      formatReplacedHint({ pos: "3" }, "Stütze 1"),
      "Wurde ersetzt durch Pos. 3 (Stütze 1)"
    );
  });
  it("formatReplacedHint ohne auflösbare neue Position → verständlicher Fallback", () => {
    assert.equal(formatReplacedHint(null), "Wurde ersetzt");
  });
});

describe("Sprint 2C – Test G: Ersatzkette A -> B -> C", () => {
  it("A und B bleiben ersetzt, nur C ist aktiver Bedarf", () => {
    const c = { id: "C", ersetzt_durch: null };
    const b = { id: "B", ersetzt_durch: "C" };
    const a = { id: "A", ersetzt_durch: "B" };
    assert.equal(isActiveItem(a), false);
    assert.equal(isActiveItem(b), false);
    assert.equal(isActiveItem(c), true);
  });
});

describe("Sprint 2C – Test H: Löschschutz verhindert Reaktivierung einer Altposition", () => {
  it("B kann nicht gelöscht werden, solange A auf B verweist", () => {
    const b = { id: "B", ersetzt_durch: "C" };
    const all = [
      { id: "A", ersetzt_durch: "B" },
      b,
      { id: "C", ersetzt_durch: null },
    ];
    assert.equal(isReferencedAsReplacement(b, all), true);
  });

  it("C kann nicht gelöscht werden, solange B auf C verweist", () => {
    const c = { id: "C", ersetzt_durch: null };
    const all = [
      { id: "A", ersetzt_durch: "B" },
      { id: "B", ersetzt_durch: "C" },
      c,
    ];
    assert.equal(isReferencedAsReplacement(c, all), true);
  });

  it("eine unreferenzierte, aktive Position darf gelöscht werden", () => {
    const c = { id: "C", ersetzt_durch: null };
    const all = [c];
    assert.equal(isReferencedAsReplacement(c, all), false);
  });
});

// Test I (paralleler Ersatz derselben Ursprungsposition) ist DB-/RPC-seitig
// gelöst (SELECT ... FOR UPDATE in replace_material_item, siehe
// supabase_patch_material_replacement.sql) und ohne laufende Supabase-
// Datenbank hier nicht automatisiert testbar. Siehe manueller
// Doppelgerät-Testplan im Sprint-2C-Abschlussbericht.

// Sprint 2D – Test A/B/C (fieldsFromOrigin, LagerReplacePanel-Formprüfung)
// entfallen mit der Lager-Direktbearbeitung (Sprint: Lager-Offline-Praxis):
// LagerReplacePanel.jsx wurde entfernt, die Ursprungsauswahl bei mehreren
// zusammengefassten Positionen läuft jetzt inline im Lager über denselben
// useItemEditor wie TB - siehe LagerView.jsx.

// Sprint 2D – Test D (parallele Positionsvergabe bei zwei gleichzeitigen
// Ersetzungen VERSCHIEDENER Ursprungspositionen desselben Projekts) ist
// DB-/RPC-seitig gelöst: replace_material_item sperrt zusätzlich zur
// Ursprungszeile die zugehörige projects-Zeile (SELECT ... FOR UPDATE), bevor
// die kleinste freie Positionsnummer berechnet wird (siehe
// supabase_patch_material_replacement.sql). Damit serialisiert Postgres beide
// Aufrufe: der zweite wartet, bis der erste committed hat, und berechnet die
// nächste freie Nummer danach auf Basis der bereits eingefügten Zeile neu.
// Ohne laufende Supabase-Instanz hier nicht als echter Nebenläufigkeitstest
// automatisierbar. Manueller Doppelgerät-Testplan:
//   1. Zwei Geräte/Browser, derselbe aktive Nutzer oder zwei aktive Nutzer,
//      dasselbe Projekt geöffnet.
//   2. Gerät A: Lager -> Position 10 ersetzen (fachliche Änderung, Formular
//      bis kurz vor "Ersetzen" ausfüllen).
//   3. Gerät B: Lager -> Position 20 ersetzen (andere Position, ebenfalls
//      bis kurz vor "Ersetzen").
//   4. Auf beiden Geräten nahezu gleichzeitig auf "Ersetzen" klicken.
//   5. Erwartet: beide Ersetzungen gelingen, die beiden neu angelegten
//      Positionen erhalten unterschiedliche, jeweils kleinste freie
//      Positionsnummern (keine Dopplung in derselben Projektübersicht/im
//      Druck). Positionen 10 und 20 bleiben unverändert als "Ersetzt"
//      erhalten.
