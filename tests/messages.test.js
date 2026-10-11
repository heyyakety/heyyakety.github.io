// Tests for messages.js (the message engine). Run from the project folder with:
//   node --test tests/

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.join(__dirname, "..");

// messages.js attaches to window (or globalThis in Node); the data file sets
// window.YAKETY_MESSAGES. Both need globalThis.window first.
globalThis.window = globalThis;
require(path.join(root, "messages-data.js"));
const { createEngine } = require(path.join(root, "messages.js"));
const realData = window.YAKETY_MESSAGES;

// ---- helpers ----

function memoryStorage() {
  const m = new Map();
  return {
    get(key) { return m.has(key) ? m.get(key) : null; },
    set(key, value) { m.set(key, value); }
  };
}

// Small seeded PRNG (mulberry32) so random-driven tests are deterministic.
function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Composed-message IDs look like "c<opener>.<appreciation>.<affirmation>.<closer>".
function partsOf(id) {
  return id[0] === "c" ? id.slice(1).split(".").map(Number) : null;
}

// Tiny fixture: 2 x 1 x 1 x 1 composed messages + 1 special = 3 messages total.
function tinyData() {
  return {
    openers: ["O1", "O2"],
    appreciations: ["A1"],
    affirmations: ["F1"],
    closers: ["C1"],
    specials: ["SPECIAL 1"],
    resetMessage: "RESET MESSAGE"
  };
}

// Fixture for the special-rate test: 10 x 10 x 10 x 10 combos, 3000 specials,
// so specials never run out during the test.
function bigSpecialData() {
  const lines = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
  return {
    openers: lines("O", 10),
    appreciations: lines("A", 10),
    affirmations: lines("F", 10),
    closers: lines("C", 10),
    specials: lines("S", 3000),
    resetMessage: "RESET"
  };
}

// ---- tests ----

test("real data: 2000 consecutive messages have no repeated IDs or texts", () => {
  const engine = createEngine(realData, { storage: memoryStorage() });
  const ids = new Set();
  const texts = new Set();
  for (let i = 0; i < 2000; i++) {
    const msg = engine.next();
    assert.equal(msg.reset, false, `unexpected reset at call ${i}`);
    assert.ok(msg.text && msg.text.length > 0, `empty text at call ${i}`);
    assert.ok(!ids.has(msg.id), `repeated ID ${msg.id} at call ${i}`);
    assert.ok(!texts.has(msg.text), `repeated text at call ${i}: ${msg.text}`);
    ids.add(msg.id);
    texts.add(msg.text);
  }
  assert.equal(engine.seenCount, 2000);
});

test("seen history persists: a second engine on the same storage never repeats", () => {
  const storage = memoryStorage();
  const first = createEngine(realData, { storage });
  const firstIds = new Set();
  for (let i = 0; i < 300; i++) firstIds.add(first.next().id);

  const second = createEngine(realData, { storage });
  assert.equal(second.seenCount, 300, "second engine should load the first engine's history");
  for (let i = 0; i < 300; i++) {
    const { id } = second.next();
    assert.ok(!firstIds.has(id), `second engine repeated ${id} from the first engine`);
  }
  assert.equal(second.seenCount, 600);
});

test("exhaustion: every message shows once, then reset, then starts over", () => {
  const engine = createEngine(tinyData(), { storage: memoryStorage(), random: seededRandom(7) });
  assert.equal(engine.total, 3);

  const round = [];
  for (let i = 0; i < 3; i++) {
    const msg = engine.next();
    assert.equal(msg.reset, false);
    round.push(msg.text);
  }
  assert.deepEqual([...round].sort(), ["SPECIAL 1", "O1 A1 F1 C1", "O2 A1 F1 C1"].sort());

  const reset = engine.next();
  assert.equal(reset.reset, true);
  assert.equal(reset.text, "RESET MESSAGE");

  const second = [];
  for (let i = 0; i < 3; i++) {
    const msg = engine.next();
    assert.equal(msg.reset, false, "should not reset again right after starting over");
    second.push(msg.text);
  }
  assert.deepEqual([...second].sort(), [...round].sort(), "second round should show every message once");
});

test("variety guard: back-to-back composed messages share no piece", () => {
  const engine = createEngine(realData, { storage: memoryStorage(), random: seededRandom(42) });
  let prev = null;
  let pairs = 0;
  for (let i = 0; i < 2000; i++) {
    const { id } = engine.next();
    const parts = partsOf(id);
    if (parts && prev) {
      pairs += 1;
      for (let pool = 0; pool < 4; pool++) {
        assert.notEqual(parts[pool], prev[pool], `call ${i}: pool ${pool} repeated back to back`);
      }
    }
    prev = parts;
  }
  assert.ok(pairs > 1000, `expected many back-to-back composed pairs, got ${pairs}`);
});

test("specials appear at roughly specialRate (default 0.2, and 0.5 when asked)", () => {
  const n = 5000;
  const specialShare = (opts) => {
    const engine = createEngine(bigSpecialData(), { storage: memoryStorage(), random: seededRandom(2024), ...opts });
    let specials = 0;
    for (let i = 0; i < n; i++) if (engine.next().id[0] === "s") specials += 1;
    return specials / n;
  };

  const defaultShare = specialShare({});
  assert.ok(Math.abs(defaultShare - 0.2) < 0.03, `default special share ${defaultShare}`);

  const halfShare = specialShare({ specialRate: 0.5 });
  assert.ok(Math.abs(halfShare - 0.5) < 0.03, `specialRate 0.5 gave share ${halfShare}`);
});

test("storage that throws on get and set does not crash and never repeats in-session", () => {
  const broken = {
    get() { throw new Error("storage blocked"); },
    set() { throw new Error("storage blocked"); }
  };
  let engine;
  assert.doesNotThrow(() => { engine = createEngine(realData, { storage: broken }); });

  const ids = new Set();
  for (let i = 0; i < 500; i++) {
    const msg = engine.next();
    assert.ok(!ids.has(msg.id), `repeated ${msg.id} with broken storage`);
    ids.add(msg.id);
  }
  assert.equal(engine.count, 500);
});

test("count goes up by one per next() and persists across engines sharing storage", () => {
  const storage = memoryStorage();
  const first = createEngine(realData, { storage });
  assert.equal(first.count, 0);
  for (let i = 1; i <= 3; i++) {
    assert.equal(first.next().count, i);
    assert.equal(first.count, i);
  }

  const second = createEngine(realData, { storage });
  assert.equal(second.count, 3);
  assert.equal(second.next().count, 4);
  assert.equal(second.count, 4);
});

test("count also goes up by one for the reset message", () => {
  const engine = createEngine(tinyData(), { storage: memoryStorage() });
  for (let i = 0; i < 3; i++) engine.next();
  const reset = engine.next();
  assert.equal(reset.reset, true);
  assert.equal(reset.count, 4);
});

test("corrupt stored history is ignored and the engine still works", () => {
  for (const garbage of ["not json", "5", "null", '{"a":1}', '[1, "zz", "c99.99.99.99", "s99999", "c1.2.3"]']) {
    const storage = memoryStorage();
    storage.set("yakety.seen.v1", garbage);
    storage.set("yakety.count.v1", "not a number");
    let engine;
    assert.doesNotThrow(() => { engine = createEngine(realData, { storage }); }, garbage);
    assert.equal(engine.seenCount, 0, `garbage ${garbage} should load as empty history`);
    assert.equal(engine.count, 0);
    assert.equal(engine.next().reset, false);
  }
});

test("stale IDs in storage do not trigger an early reset", () => {
  // Fill storage with IDs that don't match the tiny fixture. The engine must
  // still show all 3 real messages before resetting.
  const storage = memoryStorage();
  const stale = Array.from({ length: 50 }, (_, i) => "s" + (100 + i));
  storage.set("yakety.seen.v1", JSON.stringify(stale));
  const engine = createEngine(tinyData(), { storage });
  assert.equal(engine.seenCount, 0);
  const texts = [];
  for (let i = 0; i < 3; i++) {
    const msg = engine.next();
    assert.equal(msg.reset, false);
    texts.push(msg.text);
  }
  assert.equal(new Set(texts).size, 3);
});

test("default path uses window.localStorage when it exists and persists across engines", () => {
  const backing = new Map();
  const fakeLocalStorage = {
    getItem(k) { return backing.has(k) ? backing.get(k) : null; },
    setItem(k, v) { backing.set(k, String(v)); },
    removeItem(k) { backing.delete(k); }
  };
  globalThis.localStorage = fakeLocalStorage;
  try {
    const first = createEngine(realData);
    const ids = new Set();
    for (let i = 0; i < 5; i++) ids.add(first.next().id);
    const second = createEngine(realData);
    assert.equal(second.seenCount, 5, "default path should read history from localStorage");
    assert.equal(second.count, 5);
    for (let i = 0; i < 5; i++) assert.ok(!ids.has(second.next().id));
  } finally {
    delete globalThis.localStorage;
  }
});

test("default path works when localStorage is missing", () => {
  delete globalThis.localStorage;
  const engine = createEngine(realData);
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    const { id } = engine.next();
    assert.ok(!ids.has(id));
    ids.add(id);
  }
});

test("performance: 3000 clicks with shared storage stay fast", () => {
  const storage = memoryStorage();
  const engine = createEngine(realData, { storage });
  const start = Date.now();
  for (let i = 0; i < 3000; i++) engine.next();
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 5000, `3000 clicks took ${elapsed} ms`);
});
