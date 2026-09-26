// Background service worker: owns the API key, the network call and the result cache.

try { importScripts('config.js'); } catch (_) { /* config.js is optional and gitignored */ }
importScripts('llm_client.js');

const CACHE_LIMIT = 200;

async function getSettings() {
  const { apiKey, model } = await chrome.storage.sync.get(['apiKey', 'model']);
  const fallbackKey = typeof OPENROUTER_KEY !== 'undefined' ? OPENROUTER_KEY : '';
  return { apiKey: apiKey || fallbackKey, model: model || 'auto' };
}

async function readCache(key) {
  const { cache = {} } = await chrome.storage.local.get('cache');
  return cache[key];
}

async function writeCache(key, value) {
  const { cache = {} } = await chrome.storage.local.get('cache');
  cache[key] = { ...value, at: Date.now() };
  const keys = Object.keys(cache);
  if (keys.length > CACHE_LIMIT) {
    keys.sort((a, b) => cache[a].at - cache[b].at)
      .slice(0, keys.length - CACHE_LIMIT)
      .forEach(k => delete cache[k]);
  }
  await chrome.storage.local.set({ cache });
}

async function handleAnalyze({ cacheKey, prompt }) {
  const hit = await readCache(cacheKey);
  if (hit) return { ok: true, result: hit.result, model: hit.model, cached: true };

  const { apiKey, model } = await getSettings();
  if (!apiKey) {
    return { ok: false, error: 'No OpenRouter key yet. Click the Argue Back icon in the toolbar to add one.' };
  }

  const { json, model: used } = await callLLM(apiKey, prompt, model);
  await writeCache(cacheKey, { result: json, model: used });
  return { ok: true, result: json, model: used, cached: false };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'analyze') {
    handleAnalyze(msg)
      .then(sendResponse)
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // keep the channel open for the async reply
  }
  if (msg && msg.type === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
