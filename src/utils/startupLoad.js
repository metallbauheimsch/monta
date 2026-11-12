/**
 * Erststart-Ladezähler.
 * Ein stiller Nachlader (Intervall, Fokus, Sichtbarkeit) darf den laufenden
 * Erststart nicht entwerten: er startet erst, wenn dieser fertig ist.
 * Ältere Antworten dürfen einen neueren Stand nicht überschreiben.
 */

export function beginStartupLoad(state, { silent = false } = {}) {
  if (silent && state.startupInFlight) {
    return { started: false, generation: state.generation, state };
  }
  const generation = state.generation + 1;
  return {
    started: true,
    generation,
    state: {
      generation,
      startupInFlight: silent ? state.startupInFlight : true,
    },
  };
}

export function finishStartupLoad(state, { silent = false, generation, ok }) {
  const current = generation === state.generation;
  const endStartup = !silent && current;
  return {
    applyData: Boolean(ok) && current,
    endStartup,
    showError: !silent && current && !ok,
    state: {
      generation: state.generation,
      startupInFlight: endStartup ? false : state.startupInFlight,
    },
  };
}
