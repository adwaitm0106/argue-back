// Multi-provider LLM client. Runs inside the background service worker so page CSP and
// CORS never get in the way. Every provider below returns the same shape — { content,
// model } on success, a tagged Error on failure — so the hedged-race logic at the
// bottom works identically no matter which one is picked.

const SYSTEM_PROMPT =
  'You are a strict epistemic auditor. You never rewrite or improve answers. ' +
  'You only analyse how well supported an existing answer is. ' +
  'Reply with a single valid JSON object and nothing else. No markdown fences, no commentary.';

// 3600 covers one combined call producing all four modes' analyses at once (see
// modes.js buildCombinedPrompt) — noticeably more than a single-mode reply needed,
// since it's now doing the work of four.
const MAX_OUTPUT_TOKENS = 3600;

// ---------------------------------------------------------------------------
// Providers. OpenRouter used to be one of these — dropped entirely after its
// free pool (a shared ~50 requests/day across the whole account, not per model)
// turned out to be too tight to survive a demo audience clicking around: a
// handful of judges trying a couple of modes each could exhaust an entire day's
// quota in minutes. Groq and Gemini's free tiers are, account for account,
// dramatically higher — see each provider's models list below for the numbers,
// sourced from their own docs.
// ---------------------------------------------------------------------------

const PROVIDERS = {
  groq: {
    label: 'Groq',
    keyUrl: 'https://console.groq.com/keys',
    keyHint: 'gsk_...',
    // Groq's free tier is per-model, not one shared daily pool — llama-3.1-8b-instant
    // alone is good for 14,400 requests/day. Numbers per Groq's own docs, current as
    // of writing; they revise the roster and limits periodically.
    models: [
      'llama-3.1-8b-instant', // 14,400 requests/day, 500K tokens/day
      'llama-3.3-70b-versatile', // 1,000 requests/day, 100K tokens/day — slower daily cap, stronger model
      'gemma2-9b-it'
    ],
    call: callGroq,
    testKey: testGroqKey
  },
  gemini: {
    label: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'AIza...',
    // 1,500 requests/day per Google's own published free-tier limits (Sep 2026).
    models: [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite'
    ],
    call: callGemini,
    testKey: testGeminiKey
  }
};

// ---------------------------------------------------------------------------
// Groq — OpenAI-style chat completions. Groq's free tier is a plain per-model
// rate limit, no account-wide daily quota to special-case — handled like any
// other 429 by the generic race logic below.
// ---------------------------------------------------------------------------

async function callGroq(apiKey, model, prompt, signal) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: MAX_OUTPUT_TOKENS
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = new Error((data.error && data.error.message) || `HTTP ${res.status}`);
    err.status = (data.error && data.error.code) || res.status;
    throw err;
  }
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content || !content.trim()) throw new Error('Empty reply');
  return { content, model: data.model || model };
}

// GET /models costs nothing against the generation quota — just confirms the key works.
async function testGroqKey(apiKey) {
  const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: (data.error && data.error.message) || `HTTP ${res.status}` };
  return { ok: true, quota: null }; // Groq doesn't expose remaining quota over the API
}

// ---------------------------------------------------------------------------
// Google Gemini — a genuinely different request/response shape: the key rides in
// the URL's query string (not a header), and content comes back as
// candidates[0].content.parts[].text instead of choices[0].message.content.
// ---------------------------------------------------------------------------

function geminiUrl(model, apiKey, action) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${encodeURIComponent(apiKey)}`;
}

async function callGemini(apiKey, model, prompt, signal) {
  const res = await fetch(geminiUrl(model, apiKey, 'generateContent'), {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: MAX_OUTPUT_TOKENS }
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = new Error((data.error && data.error.message) || `HTTP ${res.status}`);
    err.status = (data.error && data.error.code) || res.status;
    // Gemini reports an invalid key as 400/INVALID_ARGUMENT, not 401 like the others.
    if (data.error && (data.error.status === 'PERMISSION_DENIED' || data.error.status === 'UNAUTHENTICATED')) err.status = 401;
    throw err;
  }
  const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  const content = Array.isArray(parts) ? parts.map(p => p.text || '').join('') : '';
  if (!content || !content.trim()) throw new Error('Empty reply');
  return { content, model };
}

// GET ?key=... on the models list is free — validates the key without spending any
// generation quota.
async function testGeminiKey(apiKey) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: (data.error && data.error.message) || `HTTP ${res.status}` };
  return { ok: true, quota: null }; // Gemini doesn't expose remaining quota over the API
}

// ---------------------------------------------------------------------------
// Shared parsing and hedged-race logic — provider-agnostic from here down.
// ---------------------------------------------------------------------------

// Pull the first JSON object out of a reply, even if the model wrapped it in fences or prose.
function parseJSON(text) {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(cleaned); } catch (_) { /* fall through */ }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error('Model did not return JSON');
}

// A timer that an AbortSignal can cancel early. Used to stagger hedge launches
// without leaving a dangling setTimeout once a winner already exists.
function cancellableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error('cancelled'));
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error('cancelled')); }, { once: true });
  });
}

const HEDGE_DELAY_MS = 2500;

// Sentinels Promise.any can *fulfil* on, so certain failures short-circuit the whole
// race immediately instead of waiting for every hedge to individually time out first.
// Both an invalid key and an exhausted daily quota fail the exact same way on every
// model in the list — there is nothing to gain by waiting out the other five, that
// would just turn a one-request failure into a worst-case ~12 second wait for
// identical bad news.
const AUTH_FAILURE = Symbol('auth-failure');
const DAILY_QUOTA_EXHAUSTED = Symbol('daily-quota-exhausted');

/**
 * Hedged requests: a well-known technique for tail latency against a flaky pool of
 * workers (see Google's "The Tail at Scale"). Free-tier models get 429'd or go slow
 * unpredictably, and trying them one at a time serially means a single stuck model
 * blocks everything behind it. Instead: fire the first (best-performing) model
 * immediately, and if it hasn't answered within hedgeDelayMs, fire the next one too —
 * without cancelling the first. Whichever model answers with valid JSON first wins,
 * and every other in-flight request is aborted immediately, so this never costs more
 * real network traffic than a serial approach in the common case (one model
 * answering promptly), and it only parallelizes — never serializes — the slow case.
 *
 * `callModel(apiKey, model, prompt, signal)` must resolve `{content, model}` or throw
 * an Error, optionally tagged `.status` (401 short-circuits as an auth failure) or
 * `.isDailyQuota` (short-circuits as an unrecoverable-today quota failure).
 */
async function raceModels(callModel, apiKey, models, prompt, hedgeDelayMs) {
  const failures = [];
  const controllers = models.map(() => new AbortController());
  let resetAt = null, upgradeUrl = null;

  const attempt = async (model, i) => {
    if (i > 0) await cancellableDelay(i * hedgeDelayMs, controllers[i].signal); // wait its turn to hedge in
    if (controllers[i].signal.aborted) throw new Error('cancelled');
    try {
      const { content, model: used } = await callModel(apiKey, model, prompt, controllers[i].signal);
      return { json: parseJSON(content), model: used };
    } catch (err) {
      if (err.name === 'AbortError') throw err; // a winner elsewhere cancelled us; not a real failure
      failures.push(`${model}: ${err.message}`);
      if (err.status === 401) return AUTH_FAILURE; // fulfil (not reject) to win the race instantly
      if (err.isDailyQuota) { resetAt = err.resetAt; upgradeUrl = err.upgradeUrl; return DAILY_QUOTA_EXHAUSTED; }
      throw err;
    }
  };

  try {
    const winner = await Promise.any(models.map((model, i) => attempt(model, i)));
    if (winner === AUTH_FAILURE) throw Object.assign(new Error('auth'), { isAuthFailure: true });
    if (winner === DAILY_QUOTA_EXHAUSTED) throw Object.assign(new Error('quota'), { isDailyQuota: true, resetAt, upgradeUrl });
    controllers.forEach(c => c.abort());
    return winner;
  } catch (err) {
    controllers.forEach(c => c.abort());
    // Each branch below replaces the raw error with a friendlier, user-facing message —
    // `cause` keeps the original attached so it's still inspectable in devtools rather
    // than genuinely discarded.
    if (err.isAuthFailure) throw new Error('This key was rejected. Check it in the extension settings.', { cause: err });
    if (err.isDailyQuota) {
      const when = err.resetAt ? ` (resets ${new Date(err.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : '';
      throw new Error(
        `This key has used up its free requests for today${when}. Retrying won't help until the reset. ` +
        (err.upgradeUrl ? `Add a small amount of credit at ${err.upgradeUrl} to raise the daily free-model limit, or ` : '') +
        'switch to a different provider or key in the extension settings.',
        { cause: err }
      );
    }
    throw new Error('All free models failed right now. Try again in a few seconds.\n' + failures.join('\n'), { cause: err });
  }
}

/**
 * The entry point background.js calls. `settings` is `{ provider, apiKey, model }` —
 * `model` of `'auto'` (or anything falsy) races the whole provider's free-model list;
 * a specific model name puts it first, still with the rest of that provider's list
 * as hedges behind it, rather than being a hard pin with no fallback at all.
 */
async function callLLM(settings, prompt, hedgeDelayMs = HEDGE_DELAY_MS) {
  const provider = PROVIDERS[settings.provider] || PROVIDERS.groq;
  const models = settings.model && settings.model !== 'auto'
    ? [settings.model, ...provider.models.filter(m => m !== settings.model)]
    : provider.models;
  return raceModels(provider.call, settings.apiKey, models, prompt, hedgeDelayMs);
}

/** Validates a key against whichever provider it's meant for, with no generation cost. */
async function testProviderKey(providerId, apiKey) {
  const provider = PROVIDERS[providerId] || PROVIDERS.groq;
  if (!apiKey) return { ok: false, error: 'Paste a key first.' };
  try {
    return await provider.testKey(apiKey);
  } catch (err) {
    return { ok: false, error: `Could not reach ${provider.label}: ${err.message}` };
  }
}
