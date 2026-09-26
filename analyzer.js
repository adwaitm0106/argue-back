// Local structural analysis. No network, no model. Runs instantly on every click.

(() => {
  const AB = window.AB;

  // Grouped so the UI can say what kind of softening is going on.
  const HEDGES = {
    possibility: ['might', 'may', 'could', 'can be', 'possibly', 'perhaps', 'maybe', 'potentially', 'conceivably'],
    frequency: ['generally', 'usually', 'typically', 'often', 'sometimes', 'frequently', 'commonly', 'in most cases', 'tends to', 'tend to', 'mostly', 'largely', 'for the most part'],
    softener: ['arguably', 'somewhat', 'relatively', 'fairly', 'rather', 'likely', 'unlikely', 'probably', 'seems', 'appears', 'suggests', 'roughly', 'approximately', 'around', 'about'],
    opinion: ['i think', 'i believe', 'in my opinion', 'it depends', 'depending on', 'one could argue', 'some would say', 'it is worth noting', "it's worth noting"],
    authority: ['experts say', 'studies show', 'research suggests', 'it is widely', "it's widely", 'many believe', 'it is known', 'best practice', 'most people']
  };

  // Words that quietly smuggle in a condition the reader has to accept.
  const PREMISE_CUES = [
    'if', 'assuming', 'assume', 'provided that', 'as long as', 'given that', 'unless', 'only if',
    'requires', 'depends on', 'should', 'must', 'need to', 'needs to', 'ensure', 'make sure', 'when', 'since', 'because'
  ];

  const CERTAINTY_BOOSTERS = ['always', 'never', 'definitely', 'certainly', 'clearly', 'obviously', 'undoubtedly', 'guaranteed', 'everyone', 'no one', 'all', 'best', 'only'];

  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phraseRegex = (list) => new RegExp(`\\b(${list.map(escape).sort((a, b) => b.length - a.length).join('|')})\\b`, 'gi');

  const HEDGE_LOOKUP = {};
  for (const [kind, words] of Object.entries(HEDGES)) for (const w of words) HEDGE_LOOKUP[w] = kind;
  const HEDGE_RE = phraseRegex(Object.keys(HEDGE_LOOKUP));
  const PREMISE_RE = phraseRegex(PREMISE_CUES);
  const BOOSTER_RE = phraseRegex(CERTAINTY_BOOSTERS);

  const ABBREVIATIONS = /\b(e\.g|i\.e|etc|vs|mr|mrs|ms|dr|prof|inc|ltd|approx|no|fig|st)\.$/i;

  function splitSentences(text) {
    const out = [];
    for (const block of text.split(/\n+/)) {
      const line = block.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();
      if (!line) continue;
      let buf = '';
      const parts = line.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/);
      for (const p of parts) {
        buf = buf ? `${buf} ${p}` : p;
        if (ABBREVIATIONS.test(buf)) continue;
        out.push(buf.trim());
        buf = '';
      }
      if (buf) out.push(buf.trim());
    }
    return out.filter(s => s.replace(/[^a-z0-9]/gi, '').length > 2);
  }

  function findHedges(text) {
    const hits = [];
    let m;
    HEDGE_RE.lastIndex = 0;
    while ((m = HEDGE_RE.exec(text))) {
      hits.push({ word: m[0], kind: HEDGE_LOOKUP[m[0].toLowerCase()] || 'softener', index: m.index });
    }
    return hits;
  }

  function wordCount(text) {
    return (text.match(/\b[\w'-]+\b/g) || []).length;
  }

  // Share of words that are hedge words, scaled to feel like a density score.
  function scoreHedgeDensity(text) {
    const words = wordCount(text);
    if (!words) return 0;
    const hedgeWords = findHedges(text).reduce((n, h) => n + h.word.split(/\s+/).length, 0);
    return Math.round((hedgeWords / words) * 1000) / 10;
  }

  // A claim is a declarative sentence that states something rather than asking or instructing.
  function extractClaims(text) {
    return splitSentences(text)
      .filter(s => !/\?$/.test(s))
      .filter(s => !/^(let me|here('s| is| are)|in summary|to summari[sz]e|hope this|feel free|sure|great question)/i.test(s))
      .map(s => ({
        text: s,
        hedged: findHedges(s).length > 0,
        absolute: (s.match(BOOSTER_RE) || []).length > 0
      }));
  }

  // Sentences that lean on a condition. These are the ones hiding premises.
  function extractPremises(claims) {
    const out = [];
    for (const c of claims) {
      const cues = [...new Set((c.text.match(PREMISE_RE) || []).map(w => w.toLowerCase()))];
      if (cues.length) out.push({ text: c.text, cues });
    }
    return out;
  }

  function analyze(text) {
    const sentences = splitSentences(text);
    const claims = extractClaims(text);
    const hedges = findHedges(text);
    const premises = extractPremises(claims);
    const byKind = {};
    for (const h of hedges) byKind[h.kind] = (byKind[h.kind] || 0) + 1;
    return {
      sentences,
      claims,
      hedges,
      hedgesByKind: byKind,
      premises,
      hedgeDensity: scoreHedgeDensity(text),
      absoluteClaims: claims.filter(c => c.absolute).length,
      words: wordCount(text)
    };
  }

  AB.analyzer = { splitSentences, findHedges, scoreHedgeDensity, extractClaims, extractPremises, analyze, HEDGE_RE };
})();
