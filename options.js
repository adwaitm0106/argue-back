const $ = (id) => document.getElementById(id);

function flash(text) {
  $('status').textContent = text;
  setTimeout(() => { $('status').textContent = ''; }, 2000);
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
