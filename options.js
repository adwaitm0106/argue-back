const $ = (id) => document.getElementById(id);

function flash(text) {
  $('status').textContent = text;
  setTimeout(() => { $('status').textContent = ''; }, 2000);
}

function setKeyStatus(text, tone) {
  const el = $('keyStatus');
  el.textContent = text;
  el.className = tone || '';
}

chrome.storage.sync.get(['apiKey', 'model'], ({ apiKey, model }) => {
  $('apiKey').value = apiKey || '';
  $('model').value = model || 'auto';
});

$('save').addEventListener('click', () => {
  chrome.storage.sync.set({ apiKey: $('apiKey').value.trim(), model: $('model').value }, () => flash('Saved'));
});

$('clear').addEventListener('click', () => {
  chrome.storage.local.remove('cache', () => flash('Cache cleared'));
});

// A plain GET against OpenRouter's key-info endpoint: confirms the key works and shows
// today's remaining free-tier quota, without spending a single request against that
// same quota to find out.
$('testKey').addEventListener('click', () => {
  const apiKey = $('apiKey').value.trim();
  const button = $('testKey');
  button.disabled = true;
  setKeyStatus('Checking…');

  chrome.runtime.sendMessage({ type: 'testKey', apiKey }, (res) => {
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
