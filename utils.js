// DOM helpers, site adapters, inline highlighting and small formatting utilities.

const AB = window.AB || (window.AB = {});

// Each supported site describes where assistant answers and user questions live.
AB.SITES = {
  'chatgpt.com': {
    answers: '[data-message-author-role="assistant"]',
    questions: '[data-message-author-role="user"]',
    input: '#prompt-textarea, textarea',
    isStreaming: () => !!document.querySelector('[data-testid="stop-button"]')
  },
  'claude.ai': {
    answers: '.font-claude-response, [data-testid="assistant-message"]',
    questions: '[data-testid="user-message"]',
    input: '[contenteditable="true"]',
    isStreaming: () => !!document.querySelector('[data-is-streaming="true"]')
  }
};

AB.site = AB.SITES[location.hostname.replace(/^www\./, '')];

AB.el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
};

// Outermost matching answer nodes only, so nested matches do not get two button bars.
AB.findAnswers = () => {
  if (!AB.site) return [];
  const all = [...document.querySelectorAll(AB.site.answers)];
  return all.filter(n => !all.some(o => o !== n && o.contains(n)));
};

// Visible text of an answer without code blocks or our own UI.
AB.extractAnswerText = (answerEl) => {
  const clone = answerEl.cloneNode(true);
  clone.querySelectorAll('pre, .ab-root, button, svg').forEach(n => n.remove());
  const holder = AB.el('div', { style: 'position:fixed;left:-99999px;top:0;white-space:normal' }, clone);
  document.body.append(holder);
  const text = holder.innerText || clone.textContent || '';
  holder.remove();
  return text.replace(/\n{3,}/g, '\n\n').trim();
};

// The user message sitting right before this answer in document order.
AB.extractQuestion = (answerEl) => {
  if (!AB.site) return '';
  let last = null;
  for (const q of document.querySelectorAll(AB.site.questions)) {
    if (q.compareDocumentPosition(answerEl) & Node.DOCUMENT_POSITION_FOLLOWING) last = q;
  }
  return last ? last.innerText.trim() : '';
};

AB.findInputBox = () => (AB.site ? document.querySelector(AB.site.input) : null);

// Short stable hash so cache keys stay small.
AB.hash = (str) => {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

AB.cacheKey = (modeId, answer, question) => `${modeId}:${AB.hash(question + '\u0000' + answer)}`;

AB.sendAnalyze = (cacheKey, prompt) => new Promise((resolve) => {
  try {
    chrome.runtime.sendMessage({ type: 'analyze', cacheKey, prompt }, (res) => {
      if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
      else resolve(res || { ok: false, error: 'No response from extension' });
    });
  } catch (err) {
    resolve({ ok: false, error: 'Extension was reloaded. Refresh this tab.' });
  }
});

// Match the chat page's own theme by reading the actual background behind the answer.
AB.isDarkBehind = (node) => {
  for (let n = node; n && n.nodeType === 1; n = n.parentElement) {
    const m = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
    if (m && (m.length < 4 || Number(m[3]) > 0.5)) return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 128;
  }
  const m = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g);
  return !!m && Number(m[3] ?? 1) > 0 && (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 128;
};

AB.truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s || '');

// ---------------------------------------------------------------------------
// Inline annotation without touching the page DOM.
// We use the CSS Custom Highlight API, so the chat app's own React tree stays untouched
// and the original answer is never rewritten.
// ---------------------------------------------------------------------------

AB.highlights = new Map(); // highlight name -> Map(answerEl -> Range[])

AB.buildTextIndex = (root) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest('pre, .ab-root')
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
  });
  let text = '';
  const map = [];
  let n;
  while ((n = walker.nextNode())) {
    map.push({ node: n, start: text.length });
    text += n.data;
  }
  return { text, map };
};

AB.rangeAt = (index, start, end) => {
  // Start positions belong to the node they begin; end positions to the node they close.
  const locate = (pos, isEnd) => {
    for (let i = index.map.length - 1; i >= 0; i--) {
      const m = index.map[i];
      if (isEnd ? pos > m.start : pos >= m.start) {
        return { node: m.node, offset: Math.min(pos - m.start, m.node.data.length) };
      }
    }
    return null;
  };
  const a = locate(start, false);
  const b = locate(end, true);
  if (!a || !b) return null;
  const r = new Range();
  try { r.setStart(a.node, a.offset); r.setEnd(b.node, b.offset); } catch (_) { return null; }
  return r;
};

// Find a sentence in the live DOM text, tolerant of whitespace differences.
AB.findSentenceRange = (index, sentence) => {
  const words = sentence.trim().split(/\s+/).slice(0, 40).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return null;
  const m = new RegExp(words.join('\\s*'), 'i').exec(index.text);
  return m ? AB.rangeAt(index, m.index, m.index + m[0].length) : null;
};

AB.setHighlights = (name, answerEl, ranges) => {
  if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
  if (!AB.highlights.has(name)) AB.highlights.set(name, new Map());
  const perAnswer = AB.highlights.get(name);
  perAnswer.set(answerEl, ranges.filter(Boolean));
  const all = [];
  for (const [el, rs] of perAnswer) {
    if (!el.isConnected) { perAnswer.delete(el); continue; }
    all.push(...rs);
  }
  CSS.highlights.set(name, new Highlight(...all));
};

AB.clearHighlights = (answerEl) => {
  for (const name of AB.highlights.keys()) AB.setHighlights(name, answerEl, []);
};
