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

// Right click any selected text on any site to argue back against it.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'argue-back-selection', title: 'Argue Back on "%s"', contexts: ['selection'] });
});

const CONTENT_FILES = ['utils.js', 'analyzer.js', 'modes.js', 'content_script.js'];

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'argue-back-selection' || !tab || !tab.id) return;
  const target = { tabId: tab.id, frameIds: [info.frameId || 0] };
  // Prefer the full selection with line breaks; the menu's selectionText flattens them.
  let text = info.selectionText || '';
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target, func: () => String(getSelection()) });
    if (result && result.trim()) text = result;
    await chrome.scripting.insertCSS({ target, files: ['styles.css'] });
    await chrome.scripting.executeScript({ target, files: CONTENT_FILES });
  } catch (_) {
    return; // chrome:// pages and the web store block injection
  }
  chrome.tabs.sendMessage(tab.id, { type: 'floating', text }, { frameId: info.frameId || 0 });
});
