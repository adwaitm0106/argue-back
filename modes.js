// The four ways to argue back. Each mode owns its prompt and its renderer.
// Every prompt asks for strict JSON so rendering never depends on model formatting luck.

(() => {
  const AB = window.AB;
  const { el } = AB;

  const MAX_ANSWER_CHARS = 9000;

  // Cheap keyword gate. When a question or answer touches health, money, or legal
  // ground, being wrong costs more than usual, so we tell the auditor to grade harder.
  const HIGH_STAKES_RE = /\b(dos(?:e|age)|symptom|diagnos\w*|treatment|medication|drug interaction|side effect|surgery|pregnan\w*|mental health|suicide|invest\w*|stocks?|crypto\w*|retirement|mortgage|loan|tax(?:es)?|insurance|lawsuit|legal advice|contract|visa|immigration|will\b|custody)\b/i;
  const isHighStakes = (question, answer) => HIGH_STAKES_RE.test(question) || HIGH_STAKES_RE.test(answer.slice(0, 2000));
  const STAKES_CLAUSE =
    'This question touches health, money, or legal ground, where a wrong answer costs more than usual. ' +
    'Grade harder than you normally would: treat "usually" and "in most cases" as GUESS unless the answer names a source, ' +
    'and call out anywhere a reader might act on this without checking with a professional first.\n\n';

  const frame = (question, answer) =>
    `QUESTION the user asked:\n"""${AB.truncate(question, 1500) || '(not available)'}"""\n\n` +
    `ANSWER the assistant gave:\n"""${AB.truncate(answer, MAX_ANSWER_CHARS)}"""\n\n` +
    'Do not rewrite, improve or re-answer this. Analyse it.\n\n' +
    (isHighStakes(question, answer) ? STAKES_CLAUSE : '');

  const pill = (text, tone) => el('span', { class: `ab-pill ab-${tone}`, text });
  const toneForScore = (s) => (s >= 80 ? 'green' : s >= 40 ? 'yellow' : 'red');
  const list = (items, fn) => (Array.isArray(items) ? items : []).map(fn);
  const wc = (s) => (s.match(/\b[\w'-]+\b/g) || []).length;

  // -------------------------------------------------------------------------
  // THE DECAY — the answer deletes itself, sentence by sentence, until only
  // the claim remains. Flagship mode. Runs its own animation loop.
  // -------------------------------------------------------------------------
  const decay = {
    id: 'decay',
    label: 'The Decay',
    blurb: 'The answer deletes itself, sentence by sentence, until only the claim remains.',
    buildPrompt: (answer, question, local) =>
      frame(question, answer) +
      'Here is the answer split into numbered sentences:\n' +
      local.sentences.slice(0, 40).map((s, i) => `[${i}] ${s}`).join('\n') +
      '\n\nRank every index from LEAST essential to MOST essential. Least essential means pure scaffolding: ' +
      'filler, repetition, hedging, throat-clearing, pleasantries. Most essential means the actual claim being made, ' +
      'the sentence(s) that would still answer the question with everything else stripped away.\n\n' +
      'Return JSON:\n{\n  "order": [array of every index, least essential first, most essential last],\n' +
      '  "keep_count": how many of the trailing (most essential) sentences form the real answer, usually 1 or 2\n}',
    render: (data, ctx) => {
      const sentences = ctx.local.sentences;
      const order = Array.isArray(data.order) ? data.order.filter(i => Number.isInteger(i) && sentences[i]) : [];
      // Fill in anything the model dropped so every sentence still gets accounted for.
      for (let i = 0; i < sentences.length; i++) if (!order.includes(i)) order.unshift(i);
      const keepCount = Math.min(Math.max(1, Number(data.keep_count) || 1), sentences.length);
      const toDelete = order.slice(0, Math.max(0, order.length - keepCount));

      const totalWords = ctx.local.words || sentences.reduce((n, s) => n + wc(s), 0);
      const counter = el('div', { class: 'ab-decay-counter' }, `${totalWords} words`);
      const replay = el('button', { class: 'ab-link ab-decay-replay', text: '↻ Replay the decay' });
      const body = el('div', { class: 'ab-decay-body' },
        sentences.map((s, i) => el('span', { class: 'ab-decay-sent', 'data-i': i }, s + ' ')));
      const wrap = el('div', { class: 'ab-decay' }, [
        el('div', { class: 'ab-decay-head' }, [el('span', { text: 'Watch the filler die.' }), counter]),
        body,
        replay
      ]);

      let remaining = totalWords;
      let timer = null;
      const play = () => {
        clearTimeout(timer);
        remaining = totalWords;
        counter.textContent = `${remaining} words`;
        counter.classList.remove('ab-decay-done');
        body.querySelectorAll('.ab-decay-sent').forEach(n => n.classList.remove('ab-decay-dead', 'ab-decay-kept'));
        let step = 0;
        const tick = () => {
          if (step >= toDelete.length) {
            body.querySelectorAll('.ab-decay-sent').forEach(n => { if (!n.classList.contains('ab-decay-dead')) n.classList.add('ab-decay-kept'); });
            counter.classList.add('ab-decay-done');
            counter.textContent = `${totalWords} words → ${remaining} words`;
            return;
          }
          const i = toDelete[step++];
          const node = body.querySelector(`.ab-decay-sent[data-i="${i}"]`);
          if (node) {
            node.classList.add('ab-decay-dying');
            remaining = Math.max(0, remaining - wc(sentences[i]));
            counter.textContent = `${remaining} words`;
            setTimeout(() => node.classList.add('ab-decay-dead'), 420);
          }
          timer = setTimeout(tick, 550);
        };
        timer = setTimeout(tick, 500);
      };
      replay.addEventListener('click', play);
      // Auto-start the moment this mode is shown. requestAnimationFrame lets the DOM insert first.
      requestAnimationFrame(() => requestAnimationFrame(play));
      return wrap;
    }
  };

  // -------------------------------------------------------------------------
  // THE GRAVEYARD — the draft answers rejected before the final one was kept.
  // -------------------------------------------------------------------------
  const graveyard = {
    id: 'graveyard',
    label: 'The Graveyard',
    blurb: 'The draft answers rejected before the final one was kept.',
    buildPrompt: (answer, question) =>
      frame(question, answer) +
      'Invent 4 to 6 earlier drafts a model might have produced before settling on the final answer above. ' +
      'Make them genuinely varied: at least one clearly worse than the final answer, at least one arguably just as good ' +
      'or better, and one that reads like it got cut off mid-sentence. Each draft under 45 words. ' +
      'For each, give one short, blunt reason it did not make the cut.\n\n' +
      'Return JSON:\n{\n  "drafts": [ { "text": "the draft answer", "reason": "why it was rejected" } ]\n}',
    render: (data, ctx) => {
      const drafts = list(data.drafts, d => d).slice(0, 6);
      const items = drafts.map((d, i) => el('li', { class: 'ab-grave-item' }, [
        el('div', { class: 'ab-grave-head' }, [pill(`Draft ${i + 1}`, 'grey'), el('span', { class: 'ab-muted', text: 'rejected' })]),
        el('p', { class: 'ab-grave-text', text: d.text || '' }),
        d.reason && el('p', { class: 'ab-grave-reason', text: `Rejected because: ${d.reason}` })
      ]));
      items.push(el('li', { class: 'ab-grave-item ab-grave-kept' }, [
        el('div', { class: 'ab-grave-head' }, [pill(`Draft ${drafts.length + 1}`, 'green'), el('span', { class: 'ab-muted', text: 'kept, this is what you were shown' })]),
        el('p', { class: 'ab-grave-text', text: AB.truncate(ctx.answer, 500) })
      ]));
      return el('div', {}, [
        el('p', { class: 'ab-muted', text: 'This is not the only answer that could have come back. Here is what almost got sent instead.' }),
        el('ul', { class: 'ab-grave' }, items)
      ]);
    }
  };

  // -------------------------------------------------------------------------
  // THE REBUILD — same meaning, different shape, every time you click.
  // -------------------------------------------------------------------------
  const rebuild = {
    id: 'rebuild',
    label: 'The Rebuild',
    blurb: 'Same meaning, different shape. Another phrasing with every click.',
    buildPrompt: (answer, question) =>
      frame(question, answer) +
      'Rewrite the answer 3 separate times. Every rewrite must keep exactly the same facts and conclusion, ' +
      'but change the sentence order, the phrasing, and what gets emphasised first. Make the 3 versions feel ' +
      'distinctly different to read, not just synonym-swapped. Each under 130 words.\n\n' +
      'Return JSON:\n{\n  "versions": ["version 1", "version 2", "version 3"]\n}',
    render: (data, ctx) => {
      const versions = list(data.versions, v => v).filter(Boolean);
      if (!versions.length) versions.push(ctx.answer);
      let idx = 0;
      const counter = el('span', { class: 'ab-muted' }, `Version 1 of ${versions.length}`);
      const text = el('p', { class: 'ab-rebuild-text' }, versions[0]);
      const next = el('button', { class: 'ab-link', text: '↻ Rebuild again' });
      next.addEventListener('click', () => {
        idx = (idx + 1) % versions.length;
        text.classList.remove('ab-rebuild-in');
        void text.offsetWidth; // restart the animation
        text.textContent = versions[idx];
        text.classList.add('ab-rebuild-in');
        counter.textContent = `Version ${idx + 1} of ${versions.length}`;
      });
      return el('div', { class: 'ab-rebuild' }, [
        el('div', { class: 'ab-rebuild-head' }, [pill('Same meaning', 'grey'), counter]),
        text,
        next,
        el('p', { class: 'ab-takeaway', text: 'Nothing here is "the" way to say this. It is one shuffle of the same facts.' })
      ]);
    }
  };

  // -------------------------------------------------------------------------
  // THE GUESS, HIGHLIGHTED — separate what the model knows from what it is
  // quietly guessing. Every sentence scored and color-coded, plus the scorecard.
  // -------------------------------------------------------------------------
  const guess = {
    id: 'audit', // kept stable so the rest of the app can key off it without churn
    label: 'The Guess, Highlighted',
    blurb: 'Separate what the model knows from what it is quietly guessing.',
    buildPrompt: (answer, question, local) =>
      frame(question, answer) +
      'Here is the answer split into numbered sentences:\n' +
      local.sentences.slice(0, 60).map((s, i) => `[${i}] ${s}`).join('\n') +
      '\n\nScore every numbered sentence. Be harsh and honest.\n' +
      '- KNOW: verifiable fact or definition, widely documented.\n' +
      '- INFER: reasoned from facts, but a step removed. Could be wrong.\n' +
      '- GUESS: assumption, opinion, or generalisation stated as if true, i.e. quietly pattern-matching.\n' +
      'confidence is 0 to 100: how likely the sentence is correct for THIS user.\n\n' +
      'Return JSON:\n{\n  "sentences": [ { "i": 0, "confidence": 85, "label": "KNOW | INFER | GUESS", "why": "short reason it is guessing, or why it is solid" } ],\n' +
      '  "verdict": "one blunt sentence on how solid the answer really is"\n}',
    render: (data, ctx) => {
      const byIndex = new Map(list(data.sentences, s => [Number(s.i), s]));
      const body = el('div', { class: 'ab-audit' });
      ctx.local.sentences.slice(0, 60).forEach((sentence, i) => {
        const s = byIndex.get(i);
        if (!s) { body.append(el('span', { class: 'ab-sent' }, sentence + ' ')); return; }
        const score = Math.max(0, Math.min(100, Number(s.confidence) || 0));
        const label = String(s.label || '').toUpperCase();
        body.append(el('span', { class: `ab-sent ab-sent-${toneForScore(score)}`, tabindex: '0' }, [
          el('span', { class: `ab-badge ab-${toneForScore(score)}`, text: `${score} ${label}` }),
          sentence,
          el('span', { class: 'ab-tip', text: s.why || '' }),
          ' '
        ]));
      });
      return el('div', {}, [body, data.verdict && el('p', { class: 'ab-takeaway', text: data.verdict })]);
    }
  };

  AB.MODES = [decay, graveyard, rebuild, guess];
  AB.MODE_BY_ID = Object.fromEntries(AB.MODES.map(m => [m.id, m]));
})();
