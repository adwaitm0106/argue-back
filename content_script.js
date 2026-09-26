// Watches the chat for finished answers, adds the Argue Back bar, and runs the modes.

(() => {
  const AB = window.AB;
  // Scripts can be injected twice (manifest match plus right click injection). Run once.
  if (AB.loaded) return;
  AB.loaded = true;
  const { el } = AB;

  const bars = new WeakMap(); // answer element -> { root, state }

  // ---------------------------------------------------------------------------
  // Scorecard
  // ---------------------------------------------------------------------------

  function computeScorecard(auditData, local) {
    const totals = { KNOW: 0, INFER: 0, GUESS: 0 };
    let confSum = 0, weightSum = 0;
    for (const s of auditData.sentences || []) {
      const sentence = local.sentences[Number(s.i)];
      if (!sentence) continue;
      const label = String(s.label || '').toUpperCase();
      const w = Math.max(1, sentence.split(/\s+/).length);
      if (label in totals) totals[label] += w;
      confSum += (Number(s.confidence) || 0) * w;
      weightSum += w;
    }
    const all = totals.KNOW + totals.INFER + totals.GUESS || 1;
    const pct = (n) => Math.round((n / all) * 100);
    const fact = pct(totals.KNOW), inference = pct(totals.INFER);
    return {
      fact,
      inference,
      guess: Math.max(0, 100 - fact - inference),
      confidence: weightSum ? Math.round(confSum / weightSum) : 0
    };
  }

  function renderScorecard(card, local) {
    const seg = (cls, value, label) => value > 0 && el('div', { class: `ab-seg ${cls}`, style: `flex:${value}` }, value >= 8 ? `${value}%` : '');
    return el('div', { class: 'ab-scorecard' }, [
      el('div', { class: 'ab-score-head' }, [
        el('span', { class: 'ab-score-title', text: 'How solid is this answer?' }),
        el('span', { class: 'ab-score-conf', text: `${card.confidence}/100 average confidence` })
      ]),
      el('div', { class: 'ab-bar' }, [
        seg('ab-seg-fact', card.fact),
        seg('ab-seg-infer', card.inference),
        seg('ab-seg-guess', card.guess)
      ]),
      el('div', { class: 'ab-legend' }, [
        el('span', {}, [el('i', { class: 'ab-dot ab-dot-fact' }), `${card.fact}% fact`]),
        el('span', {}, [el('i', { class: 'ab-dot ab-dot-infer' }), `${card.inference}% inference`]),
        el('span', {}, [el('i', { class: 'ab-dot ab-dot-guess' }), `${card.guess}% guess or assumption`]),
        el('span', { class: 'ab-muted' }, `${local.hedges.length} hedges · ${local.hedgeDensity}% hedge density · ${local.absoluteClaims} absolute claims`)
      ])
    ]);
  }

  function renderLocalStrip(local) {
    const kinds = Object.entries(local.hedgesByKind).map(([k, n]) => `${n} ${k}`).join(', ');
    return el('div', { class: 'ab-local' }, [
      el('b', { text: 'Instant scan: ' }),
      `${local.sentences.length} sentences, ${local.claims.length} claims, `,
      el('span', { class: 'ab-hl-sample', text: `${local.hedges.length} hedges` }),
      kinds ? ` (${kinds}), ` : ', ',
      `${local.premises.length} sentences resting on a condition.`
    ]);
  }

  // ---------------------------------------------------------------------------
  // Inline annotation on the original answer (non destructive)
  // ---------------------------------------------------------------------------

  function annotateHedges(answerEl) {
    const index = AB.buildTextIndex(answerEl);
    const ranges = [];
    const re = new RegExp(AB.analyzer.HEDGE_RE.source, 'gi');
    let m;
    while ((m = re.exec(index.text))) ranges.push(AB.rangeAt(index, m.index, m.index + m[0].length));
    AB.setHighlights('ab-hedge', answerEl, ranges);
  }

  function annotateSentences(answerEl, auditData, local) {
    const index = AB.buildTextIndex(answerEl);
    const groups = { KNOW: [], INFER: [], GUESS: [] };
    for (const s of auditData.sentences || []) {
      const sentence = local.sentences[Number(s.i)];
      const label = String(s.label || '').toUpperCase();
      if (!sentence || !(label in groups)) continue;
      groups[label].push(AB.findSentenceRange(index, sentence));
    }
    AB.setHighlights('ab-know', answerEl, groups.KNOW);
    AB.setHighlights('ab-infer', answerEl, groups.INFER);
    AB.setHighlights('ab-guess', answerEl, groups.GUESS);
  }

  // ---------------------------------------------------------------------------
  // Running a mode
  // ---------------------------------------------------------------------------

  function context(answerEl) {
    const answer = AB.extractAnswerText(answerEl);
    const question = answerEl.dataset.abQuestion || AB.extractQuestion(answerEl);
    return { answer, question, local: AB.analyzer.analyze(answer) };
  }

  async function runMode(answerEl, entry, modeId) {
    const mode = AB.MODE_BY_ID[modeId];
    const { state, root } = entry;
    const output = root.querySelector('.ab-output');

    root.querySelectorAll('.ab-mode').forEach(b => b.classList.toggle('ab-active', b.dataset.mode === modeId));
    state.activeMode = modeId;

    if (!state.ctx) state.ctx = context(answerEl);
    const ctx = state.ctx;
    if (!ctx.answer) {
      output.replaceChildren(el('div', { class: 'ab-error', text: 'Could not read this answer. Try again once it finishes.' }));
      return;
    }

    if (state.results[modeId]) {
      showResult(answerEl, entry, modeId, state.results[modeId]);
      return;
    }

    output.replaceChildren(el('div', { class: 'ab-loading' }, [el('span', { class: 'ab-spinner' }), `${mode.label}: taking the answer apart…`]));

    const res = await AB.sendAnalyze(AB.cacheKey(modeId, ctx.answer, ctx.question), mode.buildPrompt(ctx.answer, ctx.question, ctx.local));
    if (!res.ok) {
      if (state.activeMode !== modeId) return;
      const err = el('div', { class: 'ab-error' }, [el('div', { text: res.error }), el('button', { class: 'ab-link', text: 'Retry', onclick: () => runMode(answerEl, entry, modeId) })]);
      if (/key/i.test(res.error)) err.append(' ', el('button', { class: 'ab-link', text: 'Open settings', onclick: () => chrome.runtime.sendMessage({ type: 'openOptions' }) }));
      output.replaceChildren(err);
      return;
    }
    state.results[modeId] = res;
    if (state.activeMode === modeId) showResult(answerEl, entry, modeId, res);
  }

  function showResult(answerEl, entry, modeId, res) {
    const mode = AB.MODE_BY_ID[modeId];
    const { state, root } = entry;
    const output = root.querySelector('.ab-output');
    let body;
    try {
      body = mode.render(res.result, state.ctx);
    } catch (err) {
      body = el('div', { class: 'ab-error', text: `Could not render this result: ${err.message}` });
    }
    output.replaceChildren(
      el('div', { class: 'ab-result-head' }, [
        el('h3', { text: mode.label }),
        el('span', { class: 'ab-muted', text: mode.blurb })
      ]),
      body,
      el('div', { class: 'ab-foot', text: `${res.cached ? 'From cache' : 'Fresh'} · ${res.model || ''}` })
    );

    if (modeId === 'audit') {
      annotateSentences(answerEl, res.result, state.ctx.local);
      const card = computeScorecard(res.result, state.ctx.local);
      root.querySelector('.ab-score-slot').replaceChildren(renderScorecard(card, state.ctx.local));
    }
  }

  // The headline action: annotate the answer in place, then audit every sentence.
  function argueBack(answerEl, entry) {
    const { state, root } = entry;
    state.ctx = context(answerEl);
    root.classList.add('ab-open');
    root.querySelector('.ab-score-slot').replaceChildren(renderLocalStrip(state.ctx.local));
    annotateHedges(answerEl);
    runMode(answerEl, entry, 'audit');
  }

  function closePanel(answerEl, entry) {
    entry.root.classList.remove('ab-open');
    AB.clearHighlights(answerEl);
  }

  // ---------------------------------------------------------------------------
  // Injection
  // ---------------------------------------------------------------------------

  function buildBar(answerEl) {
    const entry = { state: { results: {}, ctx: null, activeMode: null } };
    const modeButtons = AB.MODES.map(m =>
      el('button', { class: 'ab-mode', 'data-mode': m.id, title: m.blurb, text: m.label, onclick: () => runMode(answerEl, entry, m.id) }));

    entry.root = el('div', { class: 'ab-root' }, [
      el('div', { class: 'ab-topline' }, [
        el('button', { class: 'ab-main', onclick: () => argueBack(answerEl, entry) }, [el('span', { class: 'ab-main-icon', text: '⚖' }), 'Argue Back']),
        el('div', { class: 'ab-legend-inline' }, [
          el('span', { class: 'ab-key ab-key-know', text: 'know' }),
          el('span', { class: 'ab-key ab-key-infer', text: 'infer' }),
          el('span', { class: 'ab-key ab-key-guess', text: 'guess' }),
          el('span', { class: 'ab-key ab-key-hedge', text: 'hedge' })
        ]),
        el('button', { class: 'ab-close', title: 'Hide analysis', text: '×', onclick: () => closePanel(answerEl, entry) })
      ]),
      el('div', { class: 'ab-panel' }, [
        el('div', { class: 'ab-score-slot' }),
        el('div', { class: 'ab-modes' }, modeButtons),
        el('div', { class: 'ab-output' })
      ])
    ]);
    return entry;
  }

  function injectAll() {
    if (AB.site.isStreaming()) return;
    for (const answerEl of AB.findAnswers()) {
      if (!answerEl.innerText || answerEl.innerText.trim().length < 20) continue;
      let entry = bars.get(answerEl);
      if (entry && entry.root.isConnected) continue;
      if (!entry) { entry = buildBar(answerEl); bars.set(answerEl, entry); }
      answerEl.after(entry.root);
      entry.root.classList.toggle('ab-dark', AB.isDarkBehind(answerEl));
    }
  }

  // ---------------------------------------------------------------------------
  // Any website: right click selected text, get a floating Argue Back panel.
  // ---------------------------------------------------------------------------

  function openFloating(text) {
    document.querySelector('.ab-float')?.remove();
    const answerEl = el('div', { class: 'ab-float-answer' },
      text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => el('p', { text: p })));
    answerEl.dataset.abQuestion = `(Selected from ${location.hostname}: ${document.title})`;
    const entry = buildBar(answerEl);
    const shell = el('div', { class: 'ab-float' }, [
      el('div', { class: 'ab-float-head' }, [
        el('b', { text: 'Argue Back' }),
        el('span', { class: 'ab-float-src', text: location.hostname }),
        el('button', { class: 'ab-float-x', title: 'Close', text: '×', onclick: () => { AB.clearHighlights(answerEl); shell.remove(); } })
      ]),
      answerEl,
      entry.root
    ]);
    document.body.append(shell);
    argueBack(answerEl, entry);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'floating' && msg.text) openFloating(msg.text);
  });

  if (!AB.site) return;
  let timer = null;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(injectAll, 700); };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();
})();
