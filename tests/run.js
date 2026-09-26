#!/usr/bin/env node
// Regression guard for Argue Back. No dependencies, no build step: `node tests/run.js`.
//
// What this catches, that manual clicking never will: a prompt tweak in modes.js that
// changes the JSON shape a mode expects back, an analyzer change that breaks sentence
// indexing (which every mode's prompt depends on), or a render() that throws when the
// model returns something slightly off-schema — missing fields, wrong types, empty
// arrays. All four of those are exactly the "silently broke it" scenarios this project
// has no other safety net against.

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const dom = require('./dom-shim');

let pass = 0, fail = 0;
const failures = [];
const pending = []; // async tests: awaited together right before the summary prints

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      pending.push(result.then(() => { pass++; }, (err) => { fail++; failures.push({ name, err }); }));
      return;
    }
    pass++;
  } catch (err) {
    fail++;
    failures.push({ name, err });
  }
}

// ---------------------------------------------------------------------------
// Load the real extension source files into a minimal browser-shaped global scope.
// ---------------------------------------------------------------------------

global.window = global;
global.document = { createElement: dom.createElement, createTextNode: dom.createTextNode };
global.Node = dom.FakeNode;
global.location = { hostname: 'chatgpt.com', pathname: '/' };
global.CSS = undefined; // AB.setHighlights/isDarkBehind no-op without it; not exercised here
global.getComputedStyle = () => ({ backgroundColor: 'rgb(255,255,255)' });
global.chrome = { runtime: { sendMessage: () => {}, lastError: null } };

const root = path.join(__dirname, '..');
const load = (file) => new Function('window', 'document', 'location', 'chrome', 'CSS', 'getComputedStyle', 'Node',
  fs.readFileSync(path.join(root, file), 'utf8'))(
  global.window, global.document, global.location, global.chrome, global.CSS, global.getComputedStyle, global.Node);

load('utils.js');
load('analyzer.js');
load('modes.js');

const AB = global.window.AB;

// ---------------------------------------------------------------------------
// analyzer.js — pure text logic every mode's prompt is built on
// ---------------------------------------------------------------------------

test('splitSentences: splits on sentence boundaries, ignores abbreviations', () => {
  const s = AB.analyzer.splitSentences('Python is great. It is used by Dr. Smith, e.g. for data science. JavaScript runs in browsers.');
  assert(s.length === 3, `expected 3 sentences, got ${s.length}: ${JSON.stringify(s)}`);
});

test('splitSentences: handles empty and whitespace-only input without throwing', () => {
  assert.deepStrictEqual(AB.analyzer.splitSentences(''), []);
  assert.deepStrictEqual(AB.analyzer.splitSentences('   \n\n  '), []);
});

test('findHedges: detects hedge words across categories', () => {
  const hedges = AB.analyzer.findHedges('This might work. It generally does. Experts say it is arguably the best.');
  const words = hedges.map(h => h.word.toLowerCase());
  assert(words.includes('might'), 'missed possibility hedge');
  assert(words.includes('generally'), 'missed frequency hedge');
  assert(words.includes('arguably'), 'missed softener hedge');
});

test('extractClaims: flags hedged vs absolute claims correctly', () => {
  const claims = AB.analyzer.extractClaims('This might be true. This is always true.');
  assert.strictEqual(claims[0].hedged, true);
  assert.strictEqual(claims[1].absolute, true);
});

test('analyze: full pipeline returns consistent sentence/word counts', () => {
  const r = AB.analyzer.analyze('Python is generally easy. JavaScript runs everywhere.');
  assert(r.sentences.length === 2);
  assert(r.words > 0);
  assert(typeof r.hedgeDensity === 'number' && !Number.isNaN(r.hedgeDensity));
});

// ---------------------------------------------------------------------------
// modes.js — buildPrompt must never throw, on any input shape
// ---------------------------------------------------------------------------

const SAMPLE_ANSWER = 'Python is generally the best first language for most beginners. Its syntax is clean and readable. JavaScript might be a better choice for websites. In the end, it depends on your goals.';
const SAMPLE_QUESTION = 'Should I learn Python or JavaScript first?';
const sampleLocal = AB.analyzer.analyze(SAMPLE_ANSWER);

const edgeAnswers = [
  ['empty answer', ''],
  ['single word', 'Yes.'],
  ['answer with quotes and backslashes', 'He said "it\'s \\"fine\\"" but I\'m not sure.'],
  ['very long answer', 'This is a sentence. '.repeat(500)],
];

for (const mode of AB.MODES) {
  test(`${mode.label}: buildPrompt never throws on normal input`, () => {
    const p = mode.buildPrompt(SAMPLE_ANSWER, SAMPLE_QUESTION, sampleLocal);
    assert(typeof p === 'string' && p.length > 0);
    assert(p.includes('Do not rewrite'), 'lost the no-regeneration instruction');
  });

  for (const [label, answer] of edgeAnswers) {
    test(`${mode.label}: buildPrompt survives edge case (${label})`, () => {
      const local = AB.analyzer.analyze(answer);
      mode.buildPrompt(answer, SAMPLE_QUESTION, local);
    });
  }

  test(`${mode.label}: buildPrompt survives missing question`, () => {
    mode.buildPrompt(SAMPLE_ANSWER, '', sampleLocal);
  });
}

// ---------------------------------------------------------------------------
// modes.js — render() must never throw, even on off-schema model output.
// This is the core regression guard: a prompt change that silently breaks the
// JSON shape a mode expects would otherwise only surface when a real person
// clicks that exact button during a live demo.
// ---------------------------------------------------------------------------

const ctx = { answer: SAMPLE_ANSWER, question: SAMPLE_QUESTION, local: sampleLocal };

const fixtures = {
  decay: [
    { name: 'well-formed', data: { order: [3, 1, 2, 0], keep_count: 1 } },
    { name: 'missing keep_count', data: { order: [0, 1, 2, 3] } },
    { name: 'empty order', data: { order: [] } },
    { name: 'order has strings and out-of-range indices', data: { order: ['0', 99, 1] } },
    { name: 'completely empty object', data: {} },
  ],
  graveyard: [
    { name: 'well-formed', data: { drafts: [{ text: 'A rejected draft.', reason: 'too short' }] } },
    { name: 'missing reason', data: { drafts: [{ text: 'A draft.' }] } },
    { name: 'empty drafts array', data: { drafts: [] } },
    { name: 'drafts is not an array', data: { drafts: 'oops' } },
    { name: 'completely empty object', data: {} },
  ],
  rebuild: [
    { name: 'well-formed, 3 versions', data: { versions: ['v1 text.', 'v2 text.', 'v3 text.'] } },
    { name: 'single version', data: { versions: ['only one.'] } },
    { name: 'empty versions array', data: { versions: [] } },
    { name: 'versions is not an array', data: { versions: null } },
    { name: 'completely empty object', data: {} },
  ],
  audit: [
    { name: 'well-formed', data: { sentences: [{ i: 0, confidence: 80, label: 'KNOW', why: 'fact' }], verdict: 'Solid.' } },
    { name: 'confidence as string, unknown label', data: { sentences: [{ i: 0, confidence: '80', label: 'MAYBE' }] } },
    { name: 'sentence index out of range', data: { sentences: [{ i: 999, confidence: 50, label: 'GUESS' }] } },
    { name: 'empty sentences array', data: { sentences: [] } },
    { name: 'completely empty object', data: {} },
  ],
};

for (const mode of AB.MODES) {
  const cases = fixtures[mode.id] || [];
  assert(cases.length > 0, `no render() fixtures defined for mode "${mode.id}" — add some`);
  for (const { name, data } of cases) {
    test(`${mode.label}: render() survives fixture "${name}"`, () => {
      const node = mode.render(data, ctx);
      assert(node && typeof node === 'object', 'render() did not return a node');
    });
  }
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// buildCombinedPrompt — the real runtime path (one call covers all four modes)
// ---------------------------------------------------------------------------

test('buildCombinedPrompt: asks for all four keys, never throws', () => {
  const p = AB.buildCombinedPrompt(SAMPLE_ANSWER, SAMPLE_QUESTION, sampleLocal);
  assert(typeof p === 'string' && p.length > 0);
  for (const key of ['"decay"', '"graveyard"', '"rebuild"', '"audit"']) {
    assert(p.includes(key), `combined prompt lost the ${key} section`);
  }
});

test('buildCombinedPrompt: survives edge-case answers', () => {
  for (const [, answer] of edgeAnswers) {
    const local = AB.analyzer.analyze(answer);
    AB.buildCombinedPrompt(answer, SAMPLE_QUESTION, local);
  }
});

test('combined fixture: each mode renders its own slice of one shared result', () => {
  const combined = {
    decay: fixtures.decay[0].data,
    graveyard: fixtures.graveyard[0].data,
    rebuild: fixtures.rebuild[0].data,
    audit: fixtures.audit[0].data,
  };
  for (const mode of AB.MODES) {
    const node = mode.render(combined[mode.id], ctx);
    assert(node && typeof node === 'object', `${mode.label} did not render from the combined shape`);
  }
});

test('combined fixture: a mode key missing entirely still renders (falls back to {})', () => {
  for (const mode of AB.MODES) {
    const node = mode.render({}, ctx); // mirrors sliceFor()'s `|| {}` fallback in content_script.js
    assert(node && typeof node === 'object');
  }
});

// ---------------------------------------------------------------------------
// llm_client.js — parseJSON robustness and the hedged-request race logic.
// Loaded separately from the browser-shaped globals above: it only needs fetch,
// AbortController and setTimeout, all native in modern Node, so no DOM shim at all.
// ---------------------------------------------------------------------------

{
  const llmSrc = fs.readFileSync(path.join(root, 'llm_client.js'), 'utf8');
  var LLM = {};
  new Function('exports', llmSrc + '\nexports.parseJSON = parseJSON; exports.callLLM = callLLM; exports.FREE_MODELS = FREE_MODELS;')(LLM);
}

test('parseJSON: parses a clean JSON object', () => {
  assert.deepStrictEqual(LLM.parseJSON('{"ok":true}'), { ok: true });
});

test('parseJSON: strips markdown code fences', () => {
  assert.deepStrictEqual(LLM.parseJSON('```json\n{"ok":true}\n```'), { ok: true });
});

test('parseJSON: pulls JSON out of surrounding prose', () => {
  assert.deepStrictEqual(LLM.parseJSON('Sure, here you go:\n{"ok":true}\nHope that helps!'), { ok: true });
});

test('parseJSON: strips <think> reasoning blocks some models leave in', () => {
  assert.deepStrictEqual(LLM.parseJSON('<think>let me consider this</think>{"ok":true}'), { ok: true });
});

test('parseJSON: throws a clear error on genuinely non-JSON output', () => {
  assert.throws(() => LLM.parseJSON('I cannot help with that.'), /did not return JSON/);
});

// These three share `global.fetch` as their mock point, so they run as one sequential
// async test rather than three separate ones — three separate `test()` calls would fire
// concurrently (test() doesn't await), and whichever mock got assigned last would win
// for all three, silently corrupting whichever ran its real request after the reassignment.
test('callLLM: hedging, total failure, and auth errors', async () => {
  // 1) The first model hangs forever; the second (hedged in after HEDGE_DELAY_MS) answers
  //    correctly. The hung model's request must be the one that gets aborted, not the winner.
  global.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    if (body.model === LLM.FREE_MODELS[0]) {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{"decay":{}}' } }], model: body.model }) };
  };
  const result = await LLM.callLLM('fake-key', 'prompt', 'auto', 20);
  assert.deepStrictEqual(result.json, { decay: {} });
  assert.notStrictEqual(result.model, LLM.FREE_MODELS[0]);

  // 2) Every model fails the same way — a clear, actionable error, not a hang or a crash.
  global.fetch = async () => ({ ok: false, status: 500, json: async () => ({ error: { message: 'boom' } }) });
  await assert.rejects(() => LLM.callLLM('fake-key', 'prompt', 'auto', 20), /All free models failed/);

  // 3) A 401 should short-circuit with a specific "check your key" message, not the generic one.
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'Unauthorized', code: 401 } }) });
  await assert.rejects(() => LLM.callLLM('bad-key', 'prompt', 'auto', 20), /rejected the API key/);

  // 4) An exhausted daily free-tier quota (real shape, confirmed against OpenRouter live)
  //    must also short-circuit instantly, and must say "retrying won't help", not the
  //    generic transient-failure message — that advice would be actively wrong here.
  global.fetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({
      error: {
        message: 'Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day',
        code: 429,
        metadata: { limit_source: 'openrouter_free_tier_daily', headers: { 'X-RateLimit-Reset': String(Date.now() + 3600000) } }
      }
    })
  });
  await assert.rejects(() => LLM.callLLM('fake-key', 'prompt', 'auto', 20), /won't help until the reset/);
});

// ---------------------------------------------------------------------------

(async () => {
  await Promise.all(pending);
  console.log(`\n${pass} passed, ${fail} failed\n`);
  for (const { name, err } of failures) {
    console.log(`FAIL: ${name}`);
    console.log(`  ${err.stack || err.message}\n`);
  }
  // Force-exit rather than let Node drain the event loop: a few render() fixtures above
  // are The Decay, which schedules several seconds of real setTimeout animation frames
  // that have nothing left to verify once render() itself returned without throwing.
  process.exit(fail > 0 ? 1 : 0);
})();
