// The six ways to argue back. Each mode owns its prompt and its renderer.
// Every prompt asks for strict JSON so rendering never depends on model formatting luck.

(() => {
  const AB = window.AB;
  const { el } = AB;

  const MAX_ANSWER_CHARS = 9000;

  const frame = (question, answer) =>
    `QUESTION the user asked:\n"""${AB.truncate(question, 1500) || '(not available)'}"""\n\n` +
    `ANSWER the assistant gave:\n"""${AB.truncate(answer, MAX_ANSWER_CHARS)}"""\n\n` +
    'Do not rewrite, improve or re-answer this. Analyse it.\n\n';

  const pill = (text, tone) => el('span', { class: `ab-pill ab-${tone}`, text });

  const toneForStatus = { valid: 'green', questionable: 'yellow', unstated: 'red' };
  const toneForWeight = { CRITICAL: 'red', IMPORTANT: 'yellow', 'NICE-TO-HAVE': 'grey' };
  const toneForLabel = { KNOW: 'green', INFER: 'yellow', GUESS: 'red' };
  const toneForScore = (s) => (s >= 80 ? 'green' : s >= 40 ? 'yellow' : 'red');

  const list = (items, fn) => (Array.isArray(items) ? items : []).map(fn);

  // -------------------------------------------------------------------------
  const graveyard = {
    id: 'graveyard',
    label: 'Show Assumptions',
    blurb: 'What has to be true for this answer to hold up?',
    buildPrompt: (answer, question, local) =>
      frame(question, answer) +
      'Locally detected claims (for reference):\n' +
      local.claims.slice(0, 15).map((c, i) => `${i + 1}. ${c.text}`).join('\n') +
      '\n\nFind the 5 most important assumptions this answer silently depends on. ' +
      'Go deeper than restating the claims: what must be true about the user, their situation, the world, or the data ' +
      'for this answer to be correct?\n\n' +
      'Return JSON:\n{\n  "root": "the answer\'s core claim in one sentence",\n  "assumptions": [\n    {\n' +
      '      "text": "the assumption, stated plainly",\n' +
      '      "weight": "CRITICAL | IMPORTANT | NICE-TO-HAVE",\n' +
      '      "status": "valid | questionable | unstated",\n' +
      '      "why": "one sentence on why it matters",\n' +
      '      "breaks_if": "a concrete situation where this assumption fails"\n    }\n  ]\n}',
    render: (data) => {
      const tree = el('div', { class: 'ab-tree' });
      tree.append(el('div', { class: 'ab-tree-root' }, [el('span', { class: 'ab-tree-label', text: 'The answer says' }), data.root || '']));
      const branches = el('ul', { class: 'ab-tree-branches' });
      list(data.assumptions, (a) => {
        const status = String(a.status || '').toLowerCase();
        const weight = String(a.weight || '').toUpperCase();
        const details = el('details', { class: 'ab-tree-node' }, [
          el('summary', {}, [
            pill(weight || 'ASSUMPTION', toneForWeight[weight] || 'grey'),
            pill(status || 'unknown', toneForStatus[status] || 'grey'),
            el('span', { class: 'ab-tree-text', text: a.text })
          ]),
          a.why && el('p', {}, [el('b', { text: 'Why it matters: ' }), a.why]),
          a.breaks_if && el('p', {}, [el('b', { text: 'Breaks if: ' }), a.breaks_if])
        ]);
        branches.append(el('li', {}, details));
      });
      tree.append(branches);
      return tree;
    }
  };

  // -------------------------------------------------------------------------
  const decay = {
    id: 'decay',
    label: 'Strip Filler',
    blurb: 'Separate the load bearing claims from the scaffolding.',
    buildPrompt: (answer, question, local) =>
      frame(question, answer) +
      `Hedge words found locally: ${[...new Set(local.hedges.map(h => h.word.toLowerCase()))].join(', ') || 'none'}.\n\n` +
      'Restate the answer\'s substance two ways, each under 120 words:\n' +
      '1. "bold": as if the author were 100% certain. Remove every hedge. Make every claim flat and absolute.\n' +
      '2. "honest": openly admitting exactly which parts are uncertain, and why.\n' +
      'Then list which claims are load bearing (the answer collapses without them) and which are filler.\n\n' +
      'Return JSON:\n{\n  "bold": "...",\n  "honest": "...",\n  "load_bearing": ["short claim", "..."],\n  "filler": ["short phrase", "..."],\n' +
      '  "takeaway": "one sentence on how much the hedging changes the meaning"\n}',
    render: (data, ctx) => {
      const cols = el('div', { class: 'ab-cols ab-cols-3' }, [
        el('div', { class: 'ab-col ab-col-bold' }, [el('h4', { text: '100% certain' }), el('p', { text: data.bold || '' })]),
        el('div', { class: 'ab-col ab-col-honest' }, [el('h4', { text: 'Admits uncertainty' }), el('p', { text: data.honest || '' })]),
        el('div', { class: 'ab-col' }, [el('h4', { text: 'What it actually said' }), el('p', { class: 'ab-original', text: AB.truncate(ctx.answer, 700) })])
      ]);
      const lists = el('div', { class: 'ab-cols' }, [
        el('div', { class: 'ab-col' }, [el('h4', { text: 'Load bearing' }), el('ul', {}, list(data.load_bearing, s => el('li', { text: s })))]),
        el('div', { class: 'ab-col' }, [el('h4', { text: 'Filler' }), el('ul', {}, list(data.filler, s => el('li', { text: s })))])
      ]);
      return el('div', {}, [cols, lists, data.takeaway && el('p', { class: 'ab-takeaway', text: data.takeaway })]);
    }
  };

  // -------------------------------------------------------------------------
  const audit = {
    id: 'audit',
    label: 'Rate Yourself',
    blurb: 'Every sentence gets a confidence score and a label.',
    buildPrompt: (answer, question, local) =>
      frame(question, answer) +
      'Here is the answer split into numbered sentences:\n' +
      local.sentences.slice(0, 60).map((s, i) => `[${i}] ${s}`).join('\n') +
      '\n\nScore every numbered sentence. Be harsh and honest.\n' +
      '- KNOW: verifiable fact or definition, widely documented.\n' +
      '- INFER: reasoned from facts, but a step removed. Could be wrong.\n' +
      '- GUESS: assumption, opinion, or generalisation stated as if true.\n' +
      'confidence is 0 to 100: how likely the sentence is correct for THIS user.\n\n' +
      'Return JSON:\n{\n  "sentences": [ { "i": 0, "confidence": 85, "label": "KNOW | INFER | GUESS", "why": "short reason" } ],\n' +
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

  // -------------------------------------------------------------------------
  const mutation = {
    id: 'mutation',
    label: 'Rephrase Assumptions',
    blurb: 'Flip one assumption at a time and watch the answer move.',
    buildPrompt: (answer, question) =>
      frame(question, answer) +
      'Pick the two assumptions whose failure would change this answer the most. ' +
      'For each, write what the answer would say if that assumption were false (under 110 words each). ' +
      'Keep everything else the same so the reader sees exactly what moved.\n\n' +
      'Return JSON:\n{\n  "versions": [\n    { "assumption": "the assumption that is now false", "answer": "the answer under that world", "what_changed": "one line" }\n  ]\n}',
    render: (data, ctx) => {
      const cards = list(data.versions, (v, i) =>
        el('div', { class: 'ab-card', style: `--i:${i}` }, [
          el('div', { class: 'ab-card-head' }, [pill(`Version ${'AB'[i] || i + 1}`, 'yellow'), el('span', { text: `What if this is false: ${v.assumption || ''}` })]),
          el('p', { text: v.answer || '' }),
          v.what_changed && el('p', { class: 'ab-muted', text: `What changed: ${v.what_changed}` })
        ]));
      cards.push(el('div', { class: 'ab-card', style: `--i:${cards.length}` }, [
        el('div', { class: 'ab-card-head' }, [pill('Original', 'green'), el('span', { text: 'What it actually said' })]),
        el('p', { class: 'ab-original', text: AB.truncate(ctx.answer, 600) })
      ]));
      return el('div', { class: 'ab-stack' }, cards);
    }
  };

  // -------------------------------------------------------------------------
  const counter = {
    id: 'counter',
    label: 'Opposite Premise',
    blurb: 'The strongest case that this answer is completely wrong.',
    buildPrompt: (answer, question) =>
      frame(question, answer) +
      'Find the ONE assumption which, if false, flips this answer to its strongest valid opposite. ' +
      'Then write that opposite answer as convincingly as the original (under 150 words). ' +
      'It must be genuinely defensible, not a strawman.\n\n' +
      'Return JSON:\n{\n  "assumption": "the single assumption being flipped",\n  "original_core": "the original answer in one sentence",\n' +
      '  "opposite_answer": "...",\n  "why_plausible": "why a reasonable expert might hold this view",\n' +
      '  "how_to_check": "the quickest way the user can tell which side is right for them"\n}',
    render: (data) => el('div', {}, [
      el('div', { class: 'ab-cols ab-split' }, [
        el('div', { class: 'ab-col' }, [el('h4', { text: 'Original' }), el('p', { text: data.original_core || '' })]),
        el('div', { class: 'ab-col ab-col-counter' }, [
          el('h4', { text: `If "${data.assumption || 'the key assumption'}" is wrong, then` }),
          el('p', { text: data.opposite_answer || '' })
        ])
      ]),
      data.why_plausible && el('p', {}, [el('b', { text: 'Why it holds up: ' }), data.why_plausible]),
      data.how_to_check && el('p', { class: 'ab-takeaway' }, [el('b', { text: 'How to check: ' }), data.how_to_check])
    ])
  };

  // -------------------------------------------------------------------------
  const gap = {
    id: 'gap',
    label: 'Textbook vs. Actual',
    blurb: 'Where the principle ends and real life begins.',
    buildPrompt: (answer, question) =>
      frame(question, answer) +
      'This answer leans on textbook knowledge, consensus or general principles. ' +
      'For each of the 3 to 5 principles it relies on, show where it breaks in practice: exceptions, edge cases, ' +
      'real world constraints, or workarounds practitioners actually use.\n\n' +
      'Return JSON:\n{\n  "rows": [ { "principle": "what the answer treats as universal", "reality": "where and how it breaks in practice" } ],\n' +
      '  "gap_summary": "one sentence on how big the gap is for this question"\n}',
    render: (data) => el('div', {}, [
      el('div', { class: 'ab-gap' }, [
        el('div', { class: 'ab-gap-head', text: 'Textbook' }),
        el('div', { class: 'ab-gap-head', text: 'In practice' }),
        ...list(data.rows, r => [el('div', { class: 'ab-gap-cell', text: r.principle || '' }), el('div', { class: 'ab-gap-cell ab-gap-real', text: r.reality || '' })]).flat()
      ]),
      data.gap_summary && el('p', { class: 'ab-takeaway', text: data.gap_summary })
    ])
  };

  AB.MODES = [graveyard, decay, audit, mutation, counter, gap];
  AB.MODE_BY_ID = Object.fromEntries(AB.MODES.map(m => [m.id, m]));
})();
