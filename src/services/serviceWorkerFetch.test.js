/**
 * Tests: Erststart-Bugfix - Service-Worker-Fetch-Handler darf bei einem
 * hängenden Netzwerkrequest nicht unbegrenzt blockieren.
 *
 * Anders als die Quelltext-Prüfungen in offlineShell.test.js wird hier das
 * TATSÄCHLICHE Verhalten von public/sw.js geprüft: Die Datei wird
 * unverändert in einem node:vm-Kontext ausgeführt, in dem self, caches,
 * fetch und die Timer durch kontrollierbare Attrappen ersetzt sind. Die
 * Zeit wird manuell vorgespult (keine echten Wartezeiten im Test).
 * Ausführen: npm test
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const dir = path.dirname(fileURLToPath(import.meta.url));
const SW_SOURCE = readFileSync(path.join(dir, "..", "..", "public", "sw.js"), "utf8");
const ORIGIN = "https://monta.example.com";

// Obergrenze, nach der ein hängender Request spätestens aufgelöst sein muss.
const MAX_ALLOWED_WAIT_MS = 60000;

const flush = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
};

function makeResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    body,
    clone() {
      return makeResponse(body, { ok, status });
    },
  };
}

function makeRequest(pathname, { method = "GET", mode = "no-cors", origin = ORIGIN } = {}) {
  return { url: `${origin}${pathname}`, method, mode };
}

/** Lädt public/sw.js in einen isolierten Kontext mit steuerbaren Attrappen. */
function loadServiceWorker({ fetchImpl }) {
  const listeners = {};
  const stores = new Map();
  const timers = new Map();
  let now = 0;
  let nextTimerId = 1;
  const fetchCalls = [];

  const keyOf = (req) => {
    const raw = typeof req === "string" ? req : req.url;
    return new URL(raw, ORIGIN).href;
  };

  const openStore = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async match(req) {
        return store.get(keyOf(req));
      },
      async put(req, res) {
        store.set(keyOf(req), res);
      },
    };
  };

  const context = {
    self: {
      location: { origin: ORIGIN },
      addEventListener(type, fn) {
        listeners[type] = fn;
      },
      skipWaiting() {},
      clients: { claim: async () => {} },
    },
    caches: {
      async open(name) {
        return openStore(name);
      },
      async keys() {
        return Array.from(stores.keys());
      },
      async delete(name) {
        return stores.delete(name);
      },
    },
    fetch(...args) {
      const [request, init] = args;
      fetchCalls.push({ request, init, argCount: args.length });
      return fetchImpl(request, init);
    },
    setTimeout(fn, ms) {
      const id = nextTimerId++;
      timers.set(id, { fn, at: now + (ms || 0) });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    AbortController,
    URL,
    Promise,
    Error,
    console,
  };
  vm.createContext(context);
  vm.runInContext(SW_SOURCE, context, { filename: "sw.js" });

  return {
    context,
    stores,
    fetchCalls,
    pendingTimers: () => timers.size,
    seed(cacheName, pathname, response) {
      if (!stores.has(cacheName)) stores.set(cacheName, new Map());
      stores.get(cacheName).set(new URL(pathname, ORIGIN).href, response);
    },
    cacheName: () => vm.runInContext("CACHE_NAME", context),
    async advance(ms) {
      const target = now + ms;
      // Erst laufende Microtasks abarbeiten, damit Timer, die erst nach
      // caches.open() registriert werden, bereits vorhanden sind.
      await flush();
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, t] = due;
        timers.delete(id);
        now = t.at;
        t.fn();
        await flush();
      }
      now = target;
      await flush();
    },
    /** Löst ein fetch-Event aus und verfolgt den Zustand der respondWith-Antwort. */
    dispatchFetch(request) {
      const state = { responded: false, settled: false, value: undefined, error: undefined };
      const event = {
        request,
        respondWith(promise) {
          state.responded = true;
          Promise.resolve(promise).then(
            (v) => {
              state.settled = true;
              state.value = v;
            },
            (e) => {
              state.settled = true;
              state.error = e;
            }
          );
        },
      };
      listeners.fetch(event);
      return state;
    },
    listeners,
  };
}

/** fetch, das NIE auflöst - reagiert aber wie ein echter Browser auf AbortSignal. */
function hangingFetch() {
  const signals = [];
  const impl = (request, init) =>
    new Promise((_resolve, reject) => {
      const signal = init && init.signal;
      if (signal) {
        signals.push(signal);
        signal.addEventListener("abort", () => {
          const err = new Error("The operation was aborted.");
          err.name = "AbortError";
          reject(err);
        });
      }
    });
  return { impl, signals };
}

let unhandled = [];
const onUnhandled = (reason) => unhandled.push(reason);

beforeEach(() => {
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
});

afterEach(async () => {
  await flush();
  process.off("unhandledRejection", onUnhandled);
  assert.deepEqual(unhandled, [], "keine unbehandelten Promise-Rejections");
});

describe("A) Normales Netzwerk wird weiterhin direkt verwendet (Network-First)", () => {
  it("schnelle erfolgreiche Antwort wird sofort ausgeliefert und gecacht", async () => {
    const fresh = makeResponse("neu");
    const sw = loadServiceWorker({ fetchImpl: async () => fresh });
    sw.seed(sw.cacheName(), "/assets/index-abc.js", makeResponse("alt"));

    const state = sw.dispatchFetch(makeRequest("/assets/index-abc.js"));
    await flush();

    assert.equal(state.settled, true);
    assert.equal(state.value, fresh, "Netzwerk hat Vorrang vor dem Cache");
    const cached = sw.stores.get(sw.cacheName()).get(`${ORIGIN}/assets/index-abc.js`);
    assert.equal(cached.body, "neu", "erfolgreiche Antwort wird wie bisher gecacht");
    assert.equal(sw.pendingTimers(), 0, "Timeout-Timer wird nach Erfolg aufgeräumt");
  });

  it("langsame, aber erfolgreiche Antwort (unterhalb des Timeouts) wird weiterhin verwendet", async () => {
    let resolveFetch;
    const sw = loadServiceWorker({
      fetchImpl: () => new Promise((r) => (resolveFetch = r)),
    });
    sw.seed(sw.cacheName(), "/assets/index-abc.js", makeResponse("alt"));

    const state = sw.dispatchFetch(makeRequest("/assets/index-abc.js"));
    await sw.advance(5000);
    assert.equal(state.settled, false, "nach 5 s wird noch nicht auf den Cache ausgewichen");

    resolveFetch(makeResponse("neu"));
    await flush();
    assert.equal(state.value.body, "neu");
  });

  it("Request wird unverändert weitergereicht (keine Header-/Credential-Änderung, nur ein Abbruchsignal)", async () => {
    const sw = loadServiceWorker({ fetchImpl: async () => makeResponse("ok") });
    const request = makeRequest("/");
    sw.dispatchFetch(request);
    await flush();

    assert.equal(sw.fetchCalls.length, 1);
    assert.equal(sw.fetchCalls[0].request, request, "Original-Request-Objekt wird verwendet");
    const init = sw.fetchCalls[0].init;
    if (init !== undefined) {
      assert.deepEqual(Object.keys(init), ["signal"], "nur das Abbruchsignal wird ergänzt");
    }
  });
});

describe("B) Hängender Netzwerkrequest blockiert nicht unbegrenzt", () => {
  it("ohne Cache-Eintrag endet die Antwort nach begrenzter Wartezeit kontrolliert mit einem Fehler", async () => {
    const { impl } = hangingFetch();
    const sw = loadServiceWorker({ fetchImpl: impl });

    const state = sw.dispatchFetch(makeRequest("/assets/index-abc.js"));
    await sw.advance(MAX_ALLOWED_WAIT_MS);

    assert.equal(state.settled, true, "respondWith darf nicht ewig offen bleiben");
    assert.ok(state.error instanceof Error, "kontrollierter Fehler statt Hänger");
  });

  it("der abgelaufene Netzwerkrequest wird per AbortController abgebrochen", async () => {
    const { impl, signals } = hangingFetch();
    const sw = loadServiceWorker({ fetchImpl: impl });

    sw.dispatchFetch(makeRequest("/assets/index-abc.js"));
    await sw.advance(MAX_ALLOWED_WAIT_MS);

    assert.equal(signals.length, 1, "fetch erhält ein AbortSignal");
    assert.equal(signals[0].aborted, true, "Request läuft nicht unbegrenzt im Hintergrund weiter");
  });

  it("Timeout ist defensiv gewählt (mindestens 10 s, höchstens 60 s)", () => {
    const sw = loadServiceWorker({ fetchImpl: async () => makeResponse("ok") });
    const timeout = vm.runInContext("NETWORK_TIMEOUT_MS", sw.context);
    assert.ok(timeout >= 10000 && timeout <= 60000, `NETWORK_TIMEOUT_MS=${timeout}`);
  });
});

describe("C) Hängendes Netzwerk mit Cache liefert nach Ablauf der Wartezeit den Cache", () => {
  it("JS-Bundle kommt nach dem Timeout aus dem Cache", async () => {
    const { impl } = hangingFetch();
    const sw = loadServiceWorker({ fetchImpl: impl });
    const cachedBundle = makeResponse("bundle aus cache");
    sw.seed(sw.cacheName(), "/assets/index-abc.js", cachedBundle);

    const state = sw.dispatchFetch(makeRequest("/assets/index-abc.js"));
    await sw.advance(MAX_ALLOWED_WAIT_MS);

    assert.equal(state.settled, true);
    assert.equal(state.value, cachedBundle);
  });

  it("Navigation fällt nach dem Timeout wie bisher auf die gecachte App-Shell (/index.html) zurück", async () => {
    const { impl } = hangingFetch();
    const sw = loadServiceWorker({ fetchImpl: impl });
    const shell = makeResponse("<html>shell</html>");
    sw.seed(sw.cacheName(), "/index.html", shell);

    const state = sw.dispatchFetch(makeRequest("/projekt/42", { mode: "navigate" }));
    await sw.advance(MAX_ALLOWED_WAIT_MS);

    assert.equal(state.settled, true);
    assert.equal(state.value, shell);
  });
});

describe("D) Sofortiger Netzwerkfehler verwendet weiterhin den Cache-Fallback", () => {
  it("TypeError aus fetch -> Cache-Eintrag, ohne auf einen Timeout zu warten", async () => {
    const sw = loadServiceWorker({
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    const cached = makeResponse("alt");
    sw.seed(sw.cacheName(), "/assets/index-abc.js", cached);

    const state = sw.dispatchFetch(makeRequest("/assets/index-abc.js"));
    await flush();

    assert.equal(state.settled, true);
    assert.equal(state.value, cached);
    assert.equal(sw.pendingTimers(), 0, "kein verwaister Timeout-Timer");
  });

  it("Navigation bei Netzwerkfehler -> gecachte App-Shell ('/' als zweite Wahl)", async () => {
    const sw = loadServiceWorker({
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    const root = makeResponse("<html>root</html>");
    sw.seed(sw.cacheName(), "/", root);

    const state = sw.dispatchFetch(makeRequest("/lager", { mode: "navigate" }));
    await flush();

    assert.equal(state.value, root);
  });
});

describe("E) Weder Netzwerk noch Cache verfügbar -> kontrolliertes Verhalten", () => {
  it("Netzwerkfehler ohne Cache: ursprünglicher Fehler wird an den Browser weitergegeben (wie bisher)", async () => {
    const original = new TypeError("Failed to fetch");
    const sw = loadServiceWorker({
      fetchImpl: async () => {
        throw original;
      },
    });

    const state = sw.dispatchFetch(makeRequest("/assets/index-abc.js"));
    await flush();

    assert.equal(state.settled, true);
    assert.equal(state.error, original);
  });

  it("hängender Request ohne Cache und ohne App-Shell (Navigation): Fehler statt Hänger, keine erfundene Antwort", async () => {
    const { impl } = hangingFetch();
    const sw = loadServiceWorker({ fetchImpl: impl });

    const state = sw.dispatchFetch(makeRequest("/", { mode: "navigate" }));
    await sw.advance(MAX_ALLOWED_WAIT_MS);

    assert.equal(state.settled, true);
    assert.ok(state.error instanceof Error);
    assert.equal(state.value, undefined, "keine erfundene Ersatzantwort");
    assert.equal(sw.stores.get(sw.cacheName())?.size ?? 0, 0, "nichts wird in den Cache geschrieben");
  });
});

describe("F) Bestehende Regeln bleiben unverändert", () => {
  it("Nicht-GET-Requests werden nicht abgefangen", () => {
    const sw = loadServiceWorker({ fetchImpl: async () => makeResponse("x") });
    const state = sw.dispatchFetch(makeRequest("/api", { method: "POST" }));
    assert.equal(state.responded, false);
    assert.equal(sw.fetchCalls.length, 0);
  });

  it("fremde Origins (z. B. Supabase) werden nicht abgefangen", () => {
    const sw = loadServiceWorker({ fetchImpl: async () => makeResponse("x") });
    const state = sw.dispatchFetch(
      makeRequest("/rest/v1/material_items", { origin: "https://xyz.supabase.co" })
    );
    assert.equal(state.responded, false);
    assert.equal(sw.fetchCalls.length, 0);
  });

  it("nicht erfolgreiche HTTP-Antworten werden ausgeliefert, aber nicht gecacht", async () => {
    const notFound = makeResponse("404", { ok: false, status: 404 });
    const sw = loadServiceWorker({ fetchImpl: async () => notFound });

    const state = sw.dispatchFetch(makeRequest("/assets/fehlt.js"));
    await flush();

    assert.equal(state.value, notFound);
    assert.equal(sw.stores.get(sw.cacheName())?.size ?? 0, 0);
  });

  it("Cache-Name bleibt monta-shell-v2", () => {
    const sw = loadServiceWorker({ fetchImpl: async () => makeResponse("x") });
    assert.equal(sw.cacheName(), "monta-shell-v2");
  });

  it("activate löscht nur fremde Cache-Namen, der aktuelle App-Shell-Cache bleibt erhalten", async () => {
    const sw = loadServiceWorker({ fetchImpl: async () => makeResponse("x") });
    sw.seed("monta-shell-v2", "/index.html", makeResponse("shell"));
    sw.seed("monta-shell-v1", "/index.html", makeResponse("alt"));

    let done;
    sw.listeners.activate({ waitUntil: (p) => (done = p) });
    await done;

    assert.deepEqual([...sw.stores.keys()], ["monta-shell-v2"]);
  });
});

describe("Review-Korrektur: Navigationen ohne zusätzliches init, Assets weiterhin mit AbortController", () => {
  const TIMEOUT_MS = 15000;

  /** fetch, dessen Ergebnis der Test nachträglich (auch nach dem Timeout) festlegen kann. */
  function deferredFetch() {
    const calls = [];
    const impl = () =>
      new Promise((resolve, reject) => {
        calls.push({ resolve, reject });
      });
    return { impl, calls };
  }

  it("A) Navigation wird mit dem Original-Request und ohne init-Objekt an fetch übergeben", async () => {
    const sw = loadServiceWorker({ fetchImpl: async () => makeResponse("<html>neu</html>") });
    const request = makeRequest("/projekt/42", { mode: "navigate" });
    sw.dispatchFetch(request);
    await flush();

    assert.equal(sw.fetchCalls.length, 1);
    assert.equal(sw.fetchCalls[0].request, request);
    assert.equal(sw.fetchCalls[0].argCount, 1, "fetch(request) - exakt wie vor dem Erststart-Fix");
  });

  it("B) hängende Navigation mit App-Shell-Cache: erst nach 15 s, dann gecachte Shell", async () => {
    const { impl } = hangingFetch();
    const sw = loadServiceWorker({ fetchImpl: impl });
    const shell = makeResponse("<html>shell</html>");
    sw.seed(sw.cacheName(), "/index.html", shell);

    const state = sw.dispatchFetch(makeRequest("/lager", { mode: "navigate" }));
    await sw.advance(TIMEOUT_MS - 1);
    assert.equal(state.settled, false, "vor Ablauf von 15 s wird weiter auf das Netzwerk gewartet");

    await sw.advance(1);
    assert.equal(state.settled, true);
    assert.equal(state.value, shell);
  });

  it("C) hängende Navigation ohne Cache endet nach 15 s kontrolliert mit Fehler", async () => {
    const { impl } = hangingFetch();
    const sw = loadServiceWorker({ fetchImpl: impl });

    const state = sw.dispatchFetch(makeRequest("/", { mode: "navigate" }));
    await sw.advance(TIMEOUT_MS - 1);
    assert.equal(state.settled, false);

    await sw.advance(1);
    assert.equal(state.settled, true);
    assert.ok(state.error instanceof Error);
    assert.match(state.error.message, /Timeout/);
  });

  it("D) hängender JS-/CSS-Asset-Request wird nach 15 s weiterhin per AbortController abgebrochen", async () => {
    for (const pathname of ["/assets/index-abc.js", "/assets/index-abc.css"]) {
      const { impl, signals } = hangingFetch();
      const sw = loadServiceWorker({ fetchImpl: impl });

      sw.dispatchFetch(makeRequest(pathname, { mode: "cors" }));
      await flush();
      assert.equal(signals.length, 1, `${pathname}: fetch erhält ein AbortSignal`);
      assert.equal(sw.fetchCalls[0].argCount, 2);

      await sw.advance(TIMEOUT_MS - 1);
      assert.equal(signals[0].aborted, false, `${pathname}: vor 15 s nicht abgebrochen`);
      await sw.advance(1);
      assert.equal(signals[0].aborted, true, `${pathname}: nach 15 s abgebrochen`);
    }
  });

  it("D) hängende Navigation erhält kein AbortSignal und wird nicht künstlich abgebrochen", async () => {
    const { impl, signals } = hangingFetch();
    const sw = loadServiceWorker({ fetchImpl: impl });

    sw.dispatchFetch(makeRequest("/", { mode: "navigate" }));
    await sw.advance(MAX_ALLOWED_WAIT_MS);

    assert.equal(signals.length, 0);
  });

  it("E) erfolgreiche Navigation und erfolgreicher Asset-Request verwenden die Netzwerkantwort", async () => {
    const page = makeResponse("<html>neu</html>");
    const bundle = makeResponse("bundle neu");
    const sw = loadServiceWorker({
      fetchImpl: async (request) => (request.mode === "navigate" ? page : bundle),
    });
    sw.seed(sw.cacheName(), "/index.html", makeResponse("<html>alt</html>"));
    sw.seed(sw.cacheName(), "/assets/index-abc.js", makeResponse("bundle alt"));

    const nav = sw.dispatchFetch(makeRequest("/index.html", { mode: "navigate" }));
    const asset = sw.dispatchFetch(makeRequest("/assets/index-abc.js", { mode: "cors" }));
    await flush();

    assert.equal(nav.value, page);
    assert.equal(asset.value, bundle);
    const store = sw.stores.get(sw.cacheName());
    assert.equal(store.get(`${ORIGIN}/index.html`).body, "<html>neu</html>");
    assert.equal(store.get(`${ORIGIN}/assets/index-abc.js`).body, "bundle neu");
    assert.equal(sw.pendingTimers(), 0);
  });

  it("F) spät eintreffende Antwort nach Timeout (Navigation) bleibt folgenlos", async () => {
    const { impl, calls } = deferredFetch();
    const sw = loadServiceWorker({ fetchImpl: impl });
    const shell = makeResponse("<html>shell</html>");
    sw.seed(sw.cacheName(), "/index.html", shell);

    const state = sw.dispatchFetch(makeRequest("/", { mode: "navigate" }));
    await sw.advance(TIMEOUT_MS);
    assert.equal(state.value, shell);

    calls[0].resolve(makeResponse("<html>zu spät</html>"));
    await flush();
    assert.equal(state.value, shell, "bereits ausgelieferte Antwort bleibt bestehen");
    assert.equal(sw.stores.get(sw.cacheName()).get(`${ORIGIN}/index.html`), shell, "Cache unverändert");
  });

  it("F) spät eintreffender Netzwerkfehler nach Timeout (Navigation ohne Cache) erzeugt keine unbehandelte Rejection", async () => {
    const { impl, calls } = deferredFetch();
    const sw = loadServiceWorker({ fetchImpl: impl });

    const state = sw.dispatchFetch(makeRequest("/", { mode: "navigate" }));
    await sw.advance(TIMEOUT_MS);
    assert.ok(state.error instanceof Error);

    calls[0].reject(new TypeError("Failed to fetch"));
    await flush();
    // afterEach prüft zusätzlich, dass keine unbehandelte Rejection auftrat.
    assert.match(state.error.message, /Timeout/, "erster Fehler bleibt maßgeblich");
  });
});
