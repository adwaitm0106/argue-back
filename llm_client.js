// OpenRouter client. Runs inside the background service worker so page CSP and CORS never get in the way.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Free models, tried in order. Free endpoints get rate limited upstream now and then,
// so if one returns 429 or an empty reply we move on to the next.
const FREE_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
  'qwen/qwen3.8-27b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free'
];

const SYSTEM_PROMPT =
  'You are a strict epistemic auditor. You never rewrite or improve answers. ' +
  'You only analyse how well supported an existing answer is. ' +
  'Reply with a single valid JSON object and nothing else. No markdown fences, no commentary.';

async function callModel(apiKey, model, prompt) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/adwaitm0106/argue-back',
      'X-Title': "Argue Back (BitNBuild '26)"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2500
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = (data.error && data.error.message) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = (data.error && data.error.code) || res.status;
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

async function callLLM(apiKey, prompt, preferredModel) {
  const models = preferredModel && preferredModel !== 'auto'
    ? [preferredModel, ...FREE_MODELS.filter(m => m !== preferredModel)]
    : FREE_MODELS;

  const failures = [];
  for (const model of models) {
    try {
      const { content, model: used } = await callModel(apiKey, model, prompt);
      return { json: parseJSON(content), model: used };
    } catch (err) {
      failures.push(`${model}: ${err.message}`);
      if (err.status === 401) throw new Error('OpenRouter rejected the API key. Check it in the extension settings.');
    }
  }
  throw new Error('All free models failed right now. Try again in a few seconds.\n' + failures.join('\n'));
}
