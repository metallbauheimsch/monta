/**
 * Abgleich lokaler Material-Mutationen mit einem Server-Snapshot.
 *
 * Realtime/Polling ruft load() auf, während ein Insert/Delete schon lokal
 * sichtbar ist. Eine ältere oder noch nicht replicated SELECT-Antwort darf
 * neue TB-Zeilen nicht verwerfen und gelöschte Zeilen nicht wiederherstellen.
 */

export function createPendingItemMutations() {
  return {
    addedById: new Map(),
    removedIds: new Set(),
  };
}

export function rememberAddedItems(pending, items) {
  if (!pending || !items?.length) return pending;
  for (const item of items) {
    if (!item?.id) continue;
    pending.removedIds.delete(item.id);
    pending.addedById.set(item.id, item);
  }
  return pending;
}

export function rememberRemovedItemIds(pending, ids) {
  if (!pending || !ids?.length) return pending;
  for (const id of ids) {
    if (!id) continue;
    pending.addedById.delete(id);
    pending.removedIds.add(id);
  }
  return pending;
}

export function applyPendingItemMutations(serverItems, pending) {
  const rows = Array.isArray(serverItems) ? serverItems : [];
  if (!pending) return [...rows];

  const removed = pending.removedIds || new Set();
  const added = pending.addedById || new Map();
  const result = [];
  const seen = new Set();

  for (const item of rows) {
    if (!item?.id || removed.has(item.id)) continue;
    result.push(item);
    seen.add(item.id);
  }

  for (const [id, item] of added) {
    if (!id || removed.has(id) || seen.has(id)) continue;
    result.push(item);
    seen.add(id);
  }

  return result;
}

export function gcPendingItemMutations(serverItems, pending) {
  if (!pending) return pending;
  const serverIds = new Set((serverItems || []).map((item) => item?.id).filter(Boolean));

  for (const id of [...pending.addedById.keys()]) {
    if (serverIds.has(id)) pending.addedById.delete(id);
  }
  for (const id of [...pending.removedIds]) {
    if (!serverIds.has(id)) pending.removedIds.delete(id);
  }
  return pending;
}
