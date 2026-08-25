// Entscheidung, ob MONTA online, offline-ohne-Snapshot oder
// offline-mit-Snapshot startet (Sprint: Lager-Offline-Praxis). Reine
// Funktion (kein DOM/IndexedDB), damit die Entscheidung selbst ohne
// Browser testbar ist - die eigentliche Erkennung (navigator.onLine) und
// das Laden (IndexedDB) passieren getrennt davon.
import { isValidSnapshot } from "./offlineSnapshotBuilder.js";

export const OFFLINE_STATE = {
  ONLINE: "online",
  OFFLINE_NO_SNAPSHOT: "offline-no-snapshot",
  OFFLINE_WITH_SNAPSHOT: "offline-with-snapshot",
};

/**
 * Online hat immer Vorrang vor einem eventuell vorhandenen Snapshot
 * (Sprint-Vorgabe P: "Online-Modus bevorzugt immer Live-Daten") - MONTA
 * startet dann unverändert wie bisher (AuthProvider/App), unabhängig
 * davon, ob auf diesem Gerät ein Offline-Snapshot vorbereitet wurde.
 */
export function decideOfflineState({ isOnline, snapshot }) {
  if (isOnline) return OFFLINE_STATE.ONLINE;
  if (isValidSnapshot(snapshot)) return OFFLINE_STATE.OFFLINE_WITH_SNAPSHOT;
  return OFFLINE_STATE.OFFLINE_NO_SNAPSHOT;
}
