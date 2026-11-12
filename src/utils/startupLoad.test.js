/**
 * Race: stiller Nachlader während des Erststarts darf den Ladebildschirm
 * nicht offen halten. Kein Datenbankzugriff.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { beginStartupLoad, finishStartupLoad } from "./startupLoad.js";

function idle() {
  return { generation: 0, startupInFlight: false };
}

describe("Erststart beendet den Ladebildschirm", () => {
  it("Datenladezeit unter 20 Sekunden: kein stiller Lauf, Abschluss übernimmt die Daten", () => {
    const first = beginStartupLoad(idle(), { silent: false });
    const done = finishStartupLoad(first.state, {
      silent: false,
      generation: first.generation,
      ok: true,
    });
    assert.equal(done.endStartup, true);
    assert.equal(done.applyData, true);
    assert.equal(done.showError, false);
    assert.equal(done.state.startupInFlight, false);
  });

  it("Datenladezeit über 20 Sekunden: das Intervall startet keinen zweiten Lauf", () => {
    const first = beginStartupLoad(idle(), { silent: false });
    const interval = beginStartupLoad(first.state, { silent: true });
    assert.equal(interval.started, false);
    assert.equal(interval.state.generation, first.generation);
    const done = finishStartupLoad(first.state, {
      silent: false,
      generation: first.generation,
      ok: true,
    });
    assert.equal(done.endStartup, true);
    assert.equal(done.applyData, true);
  });

  it("Fokuswechsel während des ersten Ladens startet keinen zweiten Lauf", () => {
    const first = beginStartupLoad(idle(), { silent: false });
    const focus = beginStartupLoad(first.state, { silent: true });
    assert.equal(focus.started, false);
    const done = finishStartupLoad(first.state, {
      silent: false,
      generation: first.generation,
      ok: true,
    });
    assert.equal(done.endStartup, true);
    assert.equal(done.applyData, true);
  });

  it("Sichtbarkeitswechsel während des ersten Ladens startet keinen zweiten Lauf", () => {
    const first = beginStartupLoad(idle(), { silent: false });
    const visible = beginStartupLoad(first.state, { silent: true });
    assert.equal(visible.started, false);
    const done = finishStartupLoad(first.state, {
      silent: false,
      generation: first.generation,
      ok: true,
    });
    assert.equal(done.endStartup, true);
    assert.equal(done.applyData, true);
  });

  it("Fehler einer späteren Pagination-Seite übernimmt keine Daten und beendet den Ladebildschirm", () => {
    const first = beginStartupLoad(idle(), { silent: false });
    const done = finishStartupLoad(first.state, {
      silent: false,
      generation: first.generation,
      ok: false,
    });
    assert.equal(done.applyData, false);
    assert.equal(done.showError, true);
    assert.equal(done.endStartup, true);
    assert.equal(done.state.startupInFlight, false);
  });
});

describe("stilles Nachladen nach dem Erststart", () => {
  it("erfolgreicher stiller Lauf übernimmt die Daten, ohne den Ladebildschirm erneut zu steuern", () => {
    const first = beginStartupLoad(idle(), { silent: false });
    const ready = finishStartupLoad(first.state, {
      silent: false,
      generation: first.generation,
      ok: true,
    }).state;
    const silent = beginStartupLoad(ready, { silent: true });
    assert.equal(silent.started, true);
    assert.equal(silent.state.startupInFlight, false);
    const done = finishStartupLoad(silent.state, {
      silent: true,
      generation: silent.generation,
      ok: true,
    });
    assert.equal(done.applyData, true);
    assert.equal(done.endStartup, false);
    assert.equal(done.showError, false);
  });

  it("ein älteres Ergebnis überschreibt neuere Daten nicht", () => {
    const older = beginStartupLoad(idle(), { silent: true });
    const newer = beginStartupLoad(older.state, { silent: true });
    const oldDone = finishStartupLoad(newer.state, {
      silent: true,
      generation: older.generation,
      ok: true,
    });
    const newDone = finishStartupLoad(newer.state, {
      silent: true,
      generation: newer.generation,
      ok: true,
    });
    assert.equal(oldDone.applyData, false);
    assert.equal(oldDone.endStartup, false);
    assert.equal(newDone.applyData, true);
    assert.equal(newDone.state.generation, newer.generation);
  });
});
