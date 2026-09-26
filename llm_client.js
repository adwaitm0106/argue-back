// OpenRouter client. Runs inside the background service worker so page CSP and CORS never get in the way.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Free models, tried in order. Free endpoints get rate limited upstream now and then,
// so if one returns 429 or an empty reply we move on to the next. More entries here
// means more independent chances to dodge a single provider's congestion — this list
// deliberately spans several different upstream providers (Nvidia, Google, Alibaba,
// InclusionAI, dots.llm) so one provider's outage doesn't take down the whole chain.
// Reasoning-heavy free models are deliberately excluded: several (liquid/lfm-2.5,
// cohere/north-mini-code) were tested and found to burn their whole token budget on
// hidden "reasoning" text, returning empty content — worse than just being slow.
const FREE_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'dots-studio/dots-3-note-preview:free',
  'inclusionai/ling-3.0-flash-sante:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'qwen/qwen3.8-27b:free'
];

const SYSTEM_PROMPT =
  'You are a strict epistemic auditor. You never rewrite or improve answers. ' +
  'You only analyse how well supported an existing answer is. ' +
  'Reply with a single valid JSON object and nothing else. No markdown fences, no commentary.';

async function callModel(apiKey, model, prompt, signal) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/adwaitm0106/argue-back',
      'X-Title': 'Argue Back'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      // 3600 covers one combined call producing all four modes' analyses at once
      // (see modes.js buildCombinedPrompt) — noticeably more than a single-mode
      // reply needed, since it's now doing the work of four.
      max_tokens: 3600
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = (data.error && data.error.message) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = (data.error && data.error.code) || res.status;
    // OpenRouter's free tier caps at a small number of requests PER DAY, shared across
    // every free model on the account — separate from, and much harder than, the
    // per-model "busy right now" 429s hedging is meant to route around. Tag it so
    // callLLM can give an accurate message instead of "try again in a few seconds",
    // which is actively wrong here: no amount of retrying helps until the daily reset.
    if (data.error && data.error.metadata && data.error.metadata.limit_source === 'openrouter_free_tier_daily') {
      err.isDailyQuota = true;
      err.resetAt = Number(data.error.metadata.headers && data.error.metadata.headers['X-RateLimit-Reset']) || null;
    }
    throw err;
  }
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content || !content.trim()) throw new Error('Empty reply');
  return { content, model: data.model || model };
}

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

// Hedged requests: a well-known technique for tail latency against a flaky pool of
// workers (see Google's "The Tail at Scale"). Free OpenRouter models get 429'd or go
// slow unpredictably, and trying them one at a time serially means a single stuck
// model blocks everything behind it — that's what made this feel "genuinely shaky"
// in testing (25-30s waits weren't unusual). Instead: fire the first (best-performing)
// model immediately, and if it hasn't answered within HEDGE_DELAY_MS, fire the next
// one too — without cancelling the first. Whichever model answers with valid JSON
// first wins, and every other in-flight request is aborted immediately, so this never
// costs more real network traffic than the old serial approach in the common case
// (one model answering promptly), and it only parallelizes — never serializes — the
// slow case.
const HEDGE_DELAY_MS = 2500;

// Sentinels Promise.any can *fulfil* on, so certain failures short-circuit the whole
// race immediately instead of waiting for every hedge to individually time out first.
// Both an invalid key and an exhausted daily quota fail the exact same way on every
// model in the list — there is nothing to gain by waiting out the other five, that
// would just turn a one-request failure into a worst-case ~12 second wait for
// identical bad news.
const AUTH_FAILURE = Symbol('auth-failure');
const DAILY_QUOTA_EXHAUSTED = Symbol('daily-quota-exhausted');

async function callLLM(apiKey, prompt, preferredModel, hedgeDelayMs = HEDGE_DELAY_MS) {
  const models = preferredModel && preferredModel !== 'auto'
    ? [preferredModel, ...FREE_MODELS.filter(m => m !== preferredModel)]
    : FREE_MODELS;

  const failures = [];
  const controllers = models.map(() => new AbortController());
  let resetAt = null;

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
      if (err.isDailyQuota) { resetAt = err.resetAt; return DAILY_QUOTA_EXHAUSTED; }
      throw err;
    }
  };

  try {
    const winner = await Promise.any(models.map((model, i) => attempt(model, i)));
    if (winner === AUTH_FAILURE) throw Object.assign(new Error('auth'), { isAuthFailure: true });
    if (winner === DAILY_QUOTA_EXHAUSTED) throw Object.assign(new Error('quota'), { isDailyQuota: true, resetAt });
    controllers.forEach(c => c.abort());
    return winner;
  } catch (err) {
    controllers.forEach(c => c.abort());
    if (err.isAuthFailure) throw new Error('OpenRouter rejected the API key. Check it in the extension settings.');
    if (err.isDailyQuota) {
      const when = err.resetAt ? ` (resets ${new Date(err.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : '';
      throw new Error(
        `This key has used up its free requests for today${when}. Retrying won't help until the reset. ` +
        'Add a small amount of credit at openrouter.ai/settings/credits to raise the daily free-model limit, ' +
        'or switch to a different OpenRouter key in the extension settings.'
      );
    }
    throw new Error('All free models failed right now. Try again in a few seconds.\n' + failures.join('\n'));
  }
}
