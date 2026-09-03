/**
 * Tests: "Anfrage per Mail" - formaler Lieferantenanfragetext, echte
 * HTML-Tabelle in der Zwischenablage, Klartext-Fallback (Praxis-Sprint).
 * Nur reine Funktionen ohne Browser-APIs (kein navigator/window/document -
 * dafür siehe manuellen Testplan TEST 13/14).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMaterialTableText,
  buildMaterialTableHtml,
  buildMailBody,
  buildMailSubject,
  buildMailtoRequest,
} from "./mailRequest.js";

function rows() {
  return [
    { bezeichnung: "Sechskantschraube", groesse: "M12", laenge: "50", oberflaeche: "feuerverzinkt", menge: 20 },
    { bezeichnung: "Sechskantmutter", groesse: "M12", laenge: "", oberflaeche: "feuerverzinkt", menge: 20 },
  ];
}

describe("AD/AE/AF/AF) Anrede, Aufforderung und vollständige Signatur exakt wie vorgegeben", () => {
  const body = buildMailBody({ tableText: "TABELLE", includeTable: true });

  it("Anrede exakt 'Sehr geehrte Damen und Herren,'", () => {
    assert.match(body, /^Sehr geehrte Damen und Herren,\n/);
  });

  it("Aufforderung exakt 'Bitte bieten Sie mir an'", () => {
    assert.match(body, /\nBitte bieten Sie mir an\n/);
  });

  it("vollständige Signatur enthalten", () => {
    for (const line of [
      "Mit freundlichen Grüßen",
      "Moritz Stöhr",
      "Geschäftsführer",
      "metallbau HEIMSCH GmbH",
      "Julius-Hölder-Straße 10",
      "70597 Stuttgart",
      "Fon +49 711 755171",
      "Amtsgericht Stuttgart HRB 225939",
      "Ust. ID DE 814207772",
      "info@metallbau-heimsch.de",
      "www.metallbau-heimsch.de",
    ]) {
      assert.ok(body.includes(line), `Zeile fehlt: ${line}`);
    }
  });

  it("Geschäftsführer-Zeile erscheint zweimal (Funktionstitel + Unterschriftszeile), wie vorgegeben", () => {
    const count = body.split("\n").filter((l) => l.trim() === "Geschäftsführer:" || l.trim() === "Geschäftsführer").length;
    assert.equal(count, 2);
  });

  it("gilt einheitlich - kein zweiter/informeller Text (kein 'Guten Tag', kein 'MONTA')", () => {
    assert.equal(/Guten Tag/.test(body), false);
    assert.equal(/\bMONTA\b/.test(body), false);
  });
});

describe("AG) keine internen MONTA-Systemhinweise in der Lieferantentabelle", () => {
  it("Tabelle enthält nur Bezeichnung/Größe/Länge/Ausführung/Menge, keine Herkunft/Baugruppe/Regalfach", () => {
    const html = buildMaterialTableHtml(rows());
    for (const forbidden of ["Regalfach", "Baugruppe", "Bauteil", "Herkunft", "Pos."]) {
      assert.equal(html.includes(forbidden), false, `darf nicht enthalten sein: ${forbidden}`);
    }
  });
});

describe("AB) echte <table>-Struktur im HTML-Export", () => {
  it("enthält <table>, <thead>, <tbody>, <tr>, <th>, <td>", () => {
    const html = buildMaterialTableHtml(rows());
    for (const tag of ["<table", "<thead>", "<tbody>", "<tr>", "<th ", "<td "]) {
      assert.ok(html.includes(tag), `fehlt: ${tag}`);
    }
  });

  it("Zellenwerte werden HTML-escaped (kein Markup-Einschleusen über Bezeichnung)", () => {
    const html = buildMaterialTableHtml([
      { bezeichnung: "<script>", groesse: "M8", laenge: "20", oberflaeche: "A2", menge: 1 },
    ]);
    assert.equal(html.includes("<script>"), false);
    assert.ok(html.includes("&lt;script&gt;"));
  });
});

describe("AC) Klartext-Fallback vorhanden", () => {
  it("enthält Kopfzeile und alle Positionen als lesbaren Text", () => {
    const text = buildMaterialTableText(rows());
    assert.match(text, /Bezeichnung/);
    assert.match(text, /Sechskantschraube/);
    assert.match(text, /Sechskantmutter/);
  });
});

describe("buildMailSubject: Ein- und Mehrprojekt-Betreff", () => {
  it("ein Projekt -> 'Anfrage BV <Name>'", () => {
    assert.equal(buildMailSubject("32089 Pergola"), "Anfrage BV 32089 Pergola");
  });

  it("mehrere Projekte -> alle Namen im Betreff", () => {
    assert.equal(
      buildMailSubject(["32089 Pergola", "32091 Carport"]),
      "Anfrage BV 32089 Pergola, 32091 Carport"
    );
  });

  it("buildMailtoRequest nutzt projectLabels, wenn angegeben", () => {
    const { subject } = buildMailtoRequest({
      projectLabels: ["A", "B"],
      rows: rows(),
    });
    assert.equal(subject, "Anfrage BV A, B");
  });

  it("buildMailtoRequest fällt ohne projectLabels auf projectName zurück (Rückwärtskompatibilität)", () => {
    const { subject } = buildMailtoRequest({ projectName: "32089 Pergola", rows: rows() });
    assert.equal(subject, "Anfrage BV 32089 Pergola");
  });
});
