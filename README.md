# Argue Back

**AI answers sound confident. Argue Back shows you how much of that confidence is earned.**

Argue Back is a Chrome extension that adds one button under every AI chat answer. Click it and the answer does not change. Instead, it gets taken apart in place: every sentence is marked as something the model **knows**, **infers**, or is **guessing**, every hedge word is underlined, and you get a scorecard showing how much of the answer is actually fact.

Built for BitNBuild '26.

## The problem

When you ask an AI a question, you get back a clean, well written paragraph. It reads like a textbook. But inside that paragraph, a solid fact sits right next to a lucky guess, and they look exactly the same.

Every other tool in this space tries to fix that by generating a *better* answer. That just gives you another confident paragraph with the same problem.

We went the other way. **We don't regenerate anything.** We audit the answer you already have.

## What it looks like

1. You ask ChatGPT something. It answers.
2. You click **Argue Back** under the answer.
3. Without a single word of the answer changing:
   * Sentences light up green (knows), yellow (infers) or red (guessing)
   * Hedge words like *might*, *generally*, *probably* get a wavy underline
   * A scorecard appears: **50% fact, 40% inference, 10% guess**, plus an average confidence score

That's the moment it clicks. The answer wasn't as solid as it sounded.

## Six ways to argue back

After the first click, six modes open up. Each one looks at the same answer from a different angle.

| Mode | What it asks | What you see |
|---|---|---|
| **Show Assumptions** | What has to be true for this answer to hold? | A tree of hidden assumptions, each tagged critical or minor, valid or questionable, with the exact situation where it breaks |
| **Strip Filler** | Which parts carry weight and which are padding? | Three columns: the answer said with full certainty, the answer admitting its doubts, and what it actually said |
| **Rate Yourself** | How confident should you be in each sentence? | Every sentence gets a 0 to 100 score and a KNOW / INFER / GUESS badge. Hover to see why |
| **Rephrase Assumptions** | What if a key assumption is false? | Stacked cards showing how the answer shifts when you flip one assumption at a time |
| **Opposite Premise** | What is the strongest case that this is wrong? | Side by side: the original, and the best defensible opposite answer, plus how to tell which one applies to you |
| **Textbook vs. Actual** | Where does the principle stop matching real life? | Two columns: what the answer treats as universal, and where it breaks in practice |

## How it works

Argue Back splits the work in two.

**Local analysis, instant and free.** Before any network call, the extension parses the answer in your browser. It splits sentences, finds hedge words (grouped into possibility, frequency, softeners, opinion and appeals to authority), flags absolute claims like *always* and *never*, and spots sentences that rest on a condition (*if*, *assuming*, *as long as*). This part runs in milliseconds and powers the underlines.

**One focused model call per mode.** For the semantic part, like finding assumptions nobody wrote down, the extension sends the answer to a model through OpenRouter with a strict prompt: *do not rewrite this, analyse it, reply in JSON.* Structured output means the UI never depends on how the model felt like formatting things that day.

**Everything is cached.** Results are stored by answer and mode, so clicking the same button twice costs nothing and loads instantly.

**The page is never modified.** Inline colors use the browser's CSS Custom Highlight API. We paint over the answer without touching the chat app's DOM, so nothing breaks when the site re-renders.

```
 chat page                    extension                         OpenRouter
 ─────────                    ─────────                         ──────────
 answer text  ──►  analyzer.js (sentences, hedges, premises)
                        │
                        ▼
                   modes.js builds a strict JSON prompt
                        │
                        ▼
                   background.js  ── cache hit? ──► return instantly
                        │ miss
                        ▼
                   llm_client.js  ─────────────────────►  free model
                        │                                  (auto fallback
                        ▼                                   if one is busy)
                   render tree / columns / cards / badges
                   + highlight the original answer in place
```

## Free to run

It uses free models on OpenRouter, so a full demo costs nothing. The default is **Nemotron 3 Super 120B**. Free endpoints sometimes get rate limited, so the extension automatically falls back through Gemma 4 31B, Qwen 3.8 27B and Nemotron 3 Ultra if the first one is busy. You can also pin a specific model in settings.

## Install it (2 minutes)

1. Clone this repo
   ```bash
   git clone https://github.com/adwaitm0106/argue-back.git
   ```
2. Open `chrome://extensions` and switch on **Developer mode** (top right)
3. Click **Load unpacked** and pick the `argue-back` folder
4. Click the Argue Back icon in your toolbar and paste your OpenRouter key. You can get one free at [openrouter.ai/keys](https://openrouter.ai/keys)
5. Open [chatgpt.com](https://chatgpt.com), ask anything, and click **Argue Back** under the answer

Your key stays in Chrome's storage and is only ever sent to openrouter.ai.

**Developer shortcut:** copy `config.example.js` to `config.js` and put your key there to skip the settings page. `config.js` is gitignored.

## Project layout

| File | Job |
|---|---|
| `manifest.json` | Extension config and permissions |
| `content_script.js` | Finds finished answers, adds the button bar, runs modes, draws the scorecard |
| `analyzer.js` | Local parsing: sentences, hedges, claims, premises, hedge density |
| `modes.js` | The six modes. Each one has its prompt and its renderer side by side |
| `utils.js` | Site adapters, text extraction, caching keys, inline highlighting |
| `background.js` | Holds the key, runs the network call, owns the cache |
| `llm_client.js` | OpenRouter client with free model fallback and robust JSON parsing |
| `options.html` | Settings page for the key and model choice |
| `styles.css` | All styling, scoped so it never leaks into the host page |

## What we deliberately did not build

* **A regenerate button.** There are plenty. They make the problem worse.
* **A "better answer" mode.** We're not competing with the model, we're auditing it.
* **A confidence model that re-answers.** The answer you got is the one you'll act on, so that's the one worth checking.

## Adding a new chat site

Every site is one entry in `AB.SITES` inside `utils.js`: a selector for answers, a selector for user messages, and a way to tell if the reply is still streaming. Add the host to `manifest.json` and you're done.

## Author

Built by **Adwait M.** ([@adwaitm0106](https://github.com/adwaitm0106))

## License

MIT
