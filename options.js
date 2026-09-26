const $ = (id) => document.getElementById(id);

// PROVIDERS comes from llm_client.js, loaded just before this script — the settings
// page reads the exact same provider/model list the background worker uses, so the
// two can never drift apart.
const PROVIDER_IDS = Object.keys(PROVIDERS);

let state = { provider: 'openrouter', keys: {}, models: {} };

function flash(text) {
  $('status').textContent = text;
  setTimeout(() => { $('status').textContent = ''; }, 2000);
}

function setKeyStatus(text, tone) {
  const el = $('keyStatus');
  el.textContent = text;
  el.className = tone || '';
}

function renderProviderCards() {
  $('providerGrid').querySelectorAll('.provider-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.provider === state.provider);
  });
}

function renderKeyField() {
  const provider = PROVIDERS[state.provider];
  $('keyProviderLabel').textContent = `(${provider.label})`;
  $('apiKey').placeholder = provider.keyHint;
  $('apiKey').value = state.keys[state.provider] || '';
  $('keyHint').innerHTML = `Get one free at <a href="${provider.keyUrl}" target="_blank" rel="noopener">${provider.keyUrl.replace('https://', '')}</a>`;
  setKeyStatus('');
}

function renderModelOptions() {
  const provider = PROVIDERS[state.provider];
  const select = $('model');
  select.innerHTML = '';
  const autoOpt = document.createElement('option');
  autoOpt.value = 'auto';
  autoOpt.textContent = `Auto (races ${provider.models.length} ${provider.label} models, fastest reply wins)`;
  select.append(autoOpt);
  for (const m of provider.models) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    select.append(opt);
  }
  const saved = state.models[state.provider];
  select.value = provider.models.includes(saved) ? saved : 'auto';
}

function selectProvider(providerId) {
  state.provider = providerId;
  renderProviderCards();
  renderKeyField();
  renderModelOptions();
}

$('providerGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.provider-card');
  if (card) selectProvider(card.dataset.provider);
});

chrome.storage.sync.get(['provider', 'keys', 'models'], (saved) => {
  state = {
    provider: PROVIDER_IDS.includes(saved.provider) ? saved.provider : 'openrouter',
    keys: saved.keys || {},
    models: saved.models || {}
  };
  renderProviderCards();
  renderKeyField();
  renderModelOptions();
});

$('save').addEventListener('click', () => {
  state.keys[state.provider] = $('apiKey').value.trim();
  state.models[state.provider] = $('model').value;
  chrome.storage.sync.set({ provider: state.provider, keys: state.keys, models: state.models }, () => flash('Saved'));
});

$('clear').addEventListener('click', () => {
  chrome.storage.local.remove('cache', () => flash('Cache cleared'));
});

// A plain GET against each provider's own cheap validation endpoint (see llm_client.js):
// confirms the key works, and for OpenRouter, shows today's remaining free quota —
// without spending a single request against that same quota to find out.
$('testKey').addEventListener('click', () => {
  const provider = state.provider;
  const apiKey = $('apiKey').value.trim();
  const button = $('testKey');
  button.disabled = true;
  setKeyStatus('Checking…');

  chrome.runtime.sendMessage({ type: 'testKey', provider, apiKey }, (res) => {
    button.disabled = false;
    if (chrome.runtime.lastError) return setKeyStatus('Extension was reloaded. Refresh this tab.', 'error');
    if (!res || !res.ok) return setKeyStatus(`✗ ${(res && res.error) || 'Could not verify this key.'}`, 'error');

    if (!res.quota || res.quota.limit == null) return setKeyStatus('✓ Key works.', 'ok');
    const { used, limit, remaining } = res.quota;
    if (remaining <= 0) {
      setKeyStatus(`⚠ Key is valid, but today's free quota is used up (${used}/${limit}). Add credit at openrouter.ai, or use a different key.`, 'warn');
    } else if (remaining <= 5) {
      setKeyStatus(`✓ Key works — only ${remaining} of ${limit} free requests left today.`, 'warn');
    } else {
      setKeyStatus(`✓ Key works — ${remaining} of ${limit} free requests left today.`, 'ok');
    }
  });
});
