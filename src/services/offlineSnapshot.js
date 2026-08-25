// IndexedDB-Speicherung des Offline-Projekt-Snapshots (Sprint: Lager-
// Offline-Praxis). Bewusst rohes IndexedDB statt einer zusätzlichen
// Bibliothek ("kleine, nachvollziehbare Lösung") - strukturierte
// Projektdaten gehören nicht in einen einzigen großen localStorage-String.
//
// Bewusst EIN Snapshot pro Gerät (fester Schlüssel SNAPSHOT_KEY): einfache,
// sichere erste Version ohne Snapshot-Auswahl-UI. "Offline-Modus
// vorbereiten" überschreibt kontrolliert genau diesen einen Eintrag -
// nie mehrere Projekte gleichzeitig, kein Vermischen alter Snapshots.
//
// Enthält ausschließlich Projekt-/Materialdaten, niemals Auth-Tokens,
// Sessions oder Secrets (siehe offlineSnapshotBuilder.js).

const DB_NAME = "monta-offline";
const DB_VERSION = 1;
const STORE_NAME = "snapshot";
const SNAPSHOT_KEY = "current";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB ist in diesem Browser nicht verfügbar."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB konnte nicht geöffnet werden."));
  });
}

/** Speichert den Snapshot (ersetzt einen zuvor vorhandenen vollständig). */
export async function saveSnapshot(snapshot) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ ...snapshot, id: SNAPSHOT_KEY });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Snapshot konnte nicht gespeichert werden."));
    });
  } finally {
    db.close();
  }
}

/** Lädt den gespeicherten Snapshot dieses Geräts, oder null falls keiner vorhanden ist. */
export async function loadSnapshot() {
  let db;
  try {
    db = await openDb();
  } catch {
    return null;
  }
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("Snapshot konnte nicht geladen werden."));
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}
