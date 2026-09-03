/**
 * Tests: "Anfrage per Mail" - formaler Lieferantenanfragetext, echte
 * HTML-Tabelle in der Zwischenablage, Klartext-Fallback, finale
 * Calibri-12pt-Formatierung (Praxis-Sprint + Formatkorrektur nach
 * GPT-Code-Review). Nur reine Funktionen ohne Browser-APIs (kein
 * navigator/window/document - dafür siehe manuellen Testplan TEST 13/14).
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMaterialTableText,
  buildMaterialTableHtml,
  buildMailBody,
  buildMailBodyHtml,
  buildMailSubject,
  buildMailtoRequest,
} from "./mailRequest.js";

function rows() {
  return [
    { bezeichnung: "Sechskantschraube", groesse: "M12", laenge: "50", oberflaeche: "feuerverzinkt", menge: 20 },
    { bezeichnung: "Sechskantmutter", groesse: "M12", laenge: "", oberflaeche: "feuerverzinkt", menge: 20 },
  ];
}

const EXACT_SIGNATURE_PLAIN =
  "Mit freundlichen Grüßen\n" +
  "\n" +
  "Moritz Stöhr\n" +
  "Geschäftsführer\n" +
  "\n" +
  "metallbau HEIMSCH GmbH\n" +
  "Julius-Hölder-Straße 10\n" +
  "70597 Stuttgart\n" +
  "Fon  +49 711 755 171\n" +
  "\n" +
  "Amtsgericht Stuttgart HRB 225939\n" +
  "Ust. ID DE 814207772\n" +
  "Geschäftsführer:\n" +
  "B.Eng. Moritz Stöhr\n" +
  "\n" +
  "info@metallbau-heimsch.de\n" +
  "www.metallbau-heimsch.de/";

describe("I/J) Anrede und Aufforderung exakt wie vorgegeben", () => {
  const body = buildMailBody({ tableText: "TABELLE", includeTable: true });

  it("I) Anrede exakt 'Sehr geehrte Damen und Herren,'", () => {
    assert.match(body, /^Sehr geehrte Damen und Herren,\n/);
  });

  it("J) Aufforderung exakt 'Bitte bieten Sie mir an'", () => {
    assert.match(body, /\nBitte bieten Sie mir an\n/);
  });

  it("gilt einheitlich - kein zweiter/informeller Text (kein 'Guten Tag', kein 'MONTA')", () => {
    assert.equal(/Guten Tag/.test(body), false);
    assert.equal(/\bMONTA\b/.test(body), false);
  });
});

describe("D/E) Plain-Text-Signatur exakt wie vorgegeben (Formatkorrektur)", () => {
  const body = buildMailBody({ tableText: "TABELLE", includeTable: true });

  it("D) enthält den exakten Signaturblock inkl. aller Leerzeilen, Wort für Wort", () => {
    assert.ok(body.includes(EXACT_SIGNATURE_PLAIN), "Signaturblock weicht vom exakt vorgegebenen Text ab");
  });

  it("E) Telefonnummer exakt 'Fon  +49 711 755 171' (zwei Leerzeichen nach Fon, Gruppierung 711 755 171)", () => {
    assert.match(body, /\nFon {2}\+49 711 755 171\n/);
  });

  it("Website mit abschließendem Slash am Zeilenende", () => {
    assert.match(body, /\nwww\.metallbau-heimsch\.de\/$/);
  });

  it("Geschäftsführer-Zeile erscheint zweimal (Funktionstitel + Unterschriftszeile)", () => {
    const count = body
      .split("\n")
      .filter((l) => l.trim() === "Geschäftsführer:" || l.trim() === "Geschäftsführer").length;
    assert.equal(count, 2);
  });
});

describe("A/B/C) HTML-Mail durchgehend Calibri 12pt (Formatkorrektur)", () => {
  const html = buildMailBodyHtml({ tableHtml: buildMaterialTableHtml(rows()) });

  it("A) enthält 'Calibri'", () => {
    assert.match(html, /Calibri/);
  });

  it("B) enthält 'font-size:12pt' (nicht mehr px)", () => {
    assert.match(html, /font-size:12pt/);
    assert.equal(/font-size:\s*\d+px/.test(html), false, "kein px-Schriftgrad mehr erlaubt");
  });

  it("C) die eingebettete Tabelle verwendet dieselbe Calibri-12pt-Formatierung", () => {
    const tableHtml = buildMaterialTableHtml(rows());
    assert.match(tableHtml, /font-family:Calibri,Arial,sans-serif;font-size:12pt;/);
    assert.ok(html.includes(tableHtml), "Tabelle muss unverändert im vollständigen HTML-Body enthalten sein");
  });

  it("Anrede/Einleitung/Signatur sind ebenfalls in Calibri 12pt (jede Zeile trägt den Grundstil)", () => {
    assert.match(html, /Sehr geehrte Damen und Herren,<\/div>/);
    const styledLineCount = (html.match(/font-family:Calibri,Arial,sans-serif;font-size:12pt;/g) || []).length;
    // mind. Wrapper + Anrede + Einleitung + Signaturzeilen + Links -> deutlich mehr als 1
    assert.ok(styledLineCount > 10, `zu wenige Calibri-12pt-Elemente: ${styledLineCount}`);
  });
});

describe("F/G/H) klickbare E-Mail- und Website-Links in HTML", () => {
  const html = buildMailBodyHtml({ tableHtml: "<table></table>" });

  it("F) echter mailto-Link", () => {
    assert.match(html, /href="mailto:info@metallbau-heimsch\.de"/);
  });

  it("G) echter Website-Link", () => {
    assert.match(html, /href="http:\/\/www\.metallbau-heimsch\.de\/"/);
  });

  it("H) sichtbarer Website-Text enthält den abschließenden Slash", () => {
    assert.match(html, />www\.metallbau-heimsch\.de\/<\/a>/);
  });

  it("kein Markdown-Link-Syntax in der Mail", () => {
    assert.equal(/\[info@metallbau-heimsch\.de\]\(mailto:/.test(html), false);
  });
});

describe("K/L) Tabelle und Plain-Text-Fallback bleiben vorhanden", () => {
  it("K) HTML-Tabelle vorhanden (buildMaterialTableHtml)", () => {
    const html = buildMaterialTableHtml(rows());
    for (const tag of ["<table", "<thead>", "<tbody>", "<tr>", "<th ", "<td "]) {
      assert.ok(html.includes(tag), `fehlt: ${tag}`);
    }
  });

  it("L) Klartext-Fallback vorhanden (buildMaterialTableText)", () => {
    const text = buildMaterialTableText(rows());
    assert.match(text, /Bezeichnung/);
    assert.match(text, /Sechskantschraube/);
    assert.match(text, /Sechskantmutter/);
  });

  it("Zellenwerte werden HTML-escaped (kein Markup-Einschleusen über Bezeichnung)", () => {
    const html = buildMaterialTableHtml([
      { bezeichnung: "<script>", groesse: "M8", laenge: "20", oberflaeche: "A2", menge: 1 },
    ]);
    assert.equal(html.includes("<script>"), false);
    assert.ok(html.includes("&lt;script&gt;"));
  });
});

describe("keine internen MONTA-Systemhinweise in der Lieferantentabelle", () => {
  it("Tabelle enthält nur Bezeichnung/Größe/Länge/Ausführung/Menge, keine Herkunft/Baugruppe/Regalfach", () => {
    const html = buildMaterialTableHtml(rows());
    for (const forbidden of ["Regalfach", "Baugruppe", "Bauteil", "Herkunft", "Pos."]) {
      assert.equal(html.includes(forbidden), false, `darf nicht enthalten sein: ${forbidden}`);
    }
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
