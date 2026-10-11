// Yakety's message engine: composes messages and makes sure a browser never
// sees the same one twice (until every possible message has been shown).

(function (root) {
  const SEEN_KEY = "yakety.seen.v1";
  const COUNT_KEY = "yakety.count.v1";

  // localStorage can be missing or throw (private browsing, blocked storage).
  // Fall back to in-memory storage so the app still works for the session.
  function safeStorage() {
    const memory = {};
    let ls = null;
    try {
      ls = root.localStorage;
      ls.setItem("yakety.probe", "1");
      ls.removeItem("yakety.probe");
    } catch (e) {
      ls = null;
    }
    return {
      get(key) {
        try { return ls ? ls.getItem(key) : (memory[key] ?? null); } catch (e) { return memory[key] ?? null; }
      },
      set(key, value) {
        memory[key] = value;
        try { if (ls) ls.setItem(key, value); } catch (e) { /* keep in memory */ }
      }
    };
  }

  // Any storage (even a custom one) must never throw into the engine.
  function guarded(store) {
    return {
      get(key) { try { return store.get(key); } catch (e) { return null; } },
      set(key, value) { try { store.set(key, value); } catch (e) { /* session memory still tracks it */ } }
    };
  }

  function createEngine(data, opts = {}) {
    const storage = guarded(opts.storage || safeStorage());
    const random = opts.random || Math.random;
    const specialRate = opts.specialRate ?? 0.2;

    const pools = [data.openers, data.appreciations, data.affirmations, data.closers];
    const comboTotal = pools.reduce((n, p) => n * p.length, 1);
    const total = comboTotal + data.specials.length;

    const seen = new Set();   // IDs shown so far (only IDs that match the data)
    let comboSeen = 0;        // how many of those are composed messages
    let count = Number(storage.get(COUNT_KEY)) || 0;
    let lastParts = null;     // pieces of the previous composed message

    // Seen IDs come from storage, so keep only the ones that still match the data.
    // A stale or corrupt ID must not inflate the seen count and trigger an early reset.
    function validId(id) {
      const m = /^(?:s(0|[1-9]\d*)|c(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*))$/.exec(id);
      if (!m) return false;
      if (m[1] !== undefined) return Number(m[1]) < data.specials.length;
      return pools.every((p, pool) => Number(m[pool + 2]) < p.length);
    }

    let stored = [];
    try {
      const parsed = JSON.parse(storage.get(SEEN_KEY));
      if (Array.isArray(parsed)) stored = parsed;
    } catch (e) { /* unreadable history: start fresh */ }
    for (const id of stored) {
      if (validId(id) && !seen.has(id)) {
        seen.add(id);
        if (id[0] === "c") comboSeen += 1;
      }
    }

    function save() {
      storage.set(SEEN_KEY, JSON.stringify([...seen]));
      storage.set(COUNT_KEY, String(count));
    }

    function comboId(parts) { return "c" + parts.join("."); }

    function comboText(parts) {
      return parts.map((idx, pool) => pools[pool][idx]).join(" ");
    }

    function pickSpecial() {
      if (data.specials.length === 0) return null;
      // Random tries first (cheap while most specials are unseen), then a full scan.
      for (let tries = 0; tries < 20; tries++) {
        const i = Math.floor(random() * data.specials.length);
        if (!seen.has("s" + i)) return { id: "s" + i, text: data.specials[i], parts: null };
      }
      const unseen = [];
      data.specials.forEach((_, i) => { if (!seen.has("s" + i)) unseen.push(i); });
      if (unseen.length === 0) return null;
      const i = unseen[Math.floor(random() * unseen.length)];
      return { id: "s" + i, text: data.specials[i], parts: null };
    }

    function pickCombo() {
      // Random tries first. Early tries also avoid reusing any piece from the
      // previous message so back-to-back messages don't feel samey.
      for (let tries = 0; tries < 300; tries++) {
        const parts = pools.map((p) => Math.floor(random() * p.length));
        const id = comboId(parts);
        if (seen.has(id)) continue;
        if (lastParts && tries < 200 && parts.some((idx, pool) => idx === lastParts[pool])) continue;
        return { id, text: comboText(parts), parts };
      }
      // Nearly everything has been seen: scan for any unseen combination.
      for (let n = 0; n < comboTotal; n++) {
        let rest = n;
        const parts = pools.map((p) => { const idx = rest % p.length; rest = Math.floor(rest / p.length); return idx; });
        const id = comboId(parts);
        if (!seen.has(id)) return { id, text: comboText(parts), parts };
      }
      return null;
    }

    function reset() {
      seen.clear();
      comboSeen = 0;
      lastParts = null;
      count += 1;
      save();
      return { id: "reset", text: data.resetMessage, reset: true, count };
    }

    function next() {
      if (seen.size >= total) return reset();

      let msg = null;
      if (comboSeen >= comboTotal || random() < specialRate) msg = pickSpecial();
      if (!msg) msg = pickCombo();
      if (!msg) msg = pickSpecial();
      if (!msg) return reset(); // defensive: nothing left to show

      seen.add(msg.id);
      if (msg.parts) {
        comboSeen += 1;
        lastParts = msg.parts;
      }
      count += 1;
      save();
      return { id: msg.id, text: msg.text, reset: false, count };
    }

    return {
      next,
      get count() { return count; },
      get seenCount() { return seen.size; },
      total
    };
  }

  root.Yakety = { createEngine };
  if (typeof module !== "undefined") module.exports = { createEngine };
})(typeof window !== "undefined" ? window : globalThis);
