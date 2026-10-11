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

  function createEngine(data, opts = {}) {
    const storage = opts.storage || safeStorage();
    const random = opts.random || Math.random;
    const specialRate = opts.specialRate ?? 0.2;

    const pools = [data.openers, data.appreciations, data.affirmations, data.closers];
    const comboTotal = pools.reduce((n, p) => n * p.length, 1);
    const total = comboTotal + data.specials.length;

    let seen = new Set(readJson(SEEN_KEY, []));
    let count = Number(storage.get(COUNT_KEY)) || 0;
    let lastParts = null;

    function readJson(key, fallback) {
      try { return JSON.parse(storage.get(key)) ?? fallback; } catch (e) { return fallback; }
    }

    function remember(id) {
      seen.add(id);
      count += 1;
      storage.set(SEEN_KEY, JSON.stringify([...seen]));
      storage.set(COUNT_KEY, String(count));
    }

    function comboId(parts) { return "c" + parts.join("."); }

    function comboText(parts) {
      return parts.map((idx, pool) => pools[pool][idx]).join(" ");
    }

    function seenCombos() {
      let n = 0;
      for (const id of seen) if (id[0] === "c") n += 1;
      return n;
    }

    function pickSpecial() {
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

    function next() {
      if (seen.size >= total) {
        seen = new Set();
        lastParts = null;
        storage.set(SEEN_KEY, "[]");
        return { id: "reset", text: data.resetMessage, reset: true, count };
      }

      const combosLeft = seenCombos() < comboTotal;
      let msg = null;
      if (!combosLeft || random() < specialRate) msg = pickSpecial();
      if (!msg) msg = pickCombo();
      if (!msg) msg = pickSpecial();

      remember(msg.id);
      if (msg.parts) lastParts = msg.parts;
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
