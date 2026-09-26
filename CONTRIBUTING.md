# Contributing to Argue Back

Thanks for considering a contribution. This project is a Chrome extension with no build step, so getting set up is quick.

## Setup

1. Clone the repo and load it unpacked:
   ```bash
   git clone https://github.com/adwaitm0106/argue-back.git
   ```
   Then `chrome://extensions` → **Developer mode** → **Load unpacked** → select the `argue-back` folder.
2. Copy `config.example.js` to `config.js` and paste an [OpenRouter key](https://openrouter.ai/keys) in, so you don't need to go through the settings page while iterating. `config.js` is gitignored and never committed.
3. Run the test suite before and after your change:
   ```bash
   node tests/run.js
   ```
   No dependencies, no build step. It should finish in under a second and print `X passed, 0 failed`.

## Before opening a pull request

- Run `node tests/run.js` and make sure it's still green. If you touched `modes.js` or `analyzer.js`, add a fixture or edge case to `tests/run.js` that covers what you changed — see the existing fixtures for the pattern (well-formed input, missing fields, wrong types, empty arrays).
- If you touched anything user-facing, reload the unpacked extension and check it against a real page (a chat site, or the right-click floating panel on any page) rather than relying on tests alone.
- Keep functions small and single-purpose, and comment the *why*, not the *what* — the codebase leans on short doc comments above each function rather than long inline narration.
- Match the existing tone in comments and UI copy: plain, direct, no filler.

## Adding support for a new AI chat site

This is the most common kind of contribution. Every site is one entry in `AB.SITES` inside `utils.js`: a selector for answer elements, a selector for the user's own messages, and a way to detect whether a reply is still streaming. Add the site's host to `manifest.json`'s `host_permissions` and `content_scripts.matches`, then test on the real site — selectors written from a guess at a site's structure are exactly the kind of thing that silently breaks, so please verify against the live page before opening the PR.

## Reporting bugs and requesting features

Open an issue using the templates under **New issue**. For a bug, include the site you were on, what you clicked, and what happened instead of what you expected — a screenshot or the browser console output helps a lot.

## Code of conduct

Participation in this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
