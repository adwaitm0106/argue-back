# Security Policy

## Supported versions

This project ships as source you load directly (`Load unpacked`) rather than through the Chrome Web Store, so there is only one supported version: the latest commit on `main`.

## Reporting a vulnerability

If you find a security issue, anything from a way to leak the stored API key, to a way for a malicious web page to trigger unintended extension behavior, please report it privately rather than opening a public issue:

1. Open a [GitHub security advisory](https://github.com/adwaitm0106/argue-back/security/advisories/new) for this repository (preferred), or
2. Message a maintainer directly through their GitHub profile if advisories aren't available to you.

Please include:
- A description of the issue and its potential impact.
- Steps to reproduce, or a proof of concept if you have one.
- Which file(s)/component you believe are affected.

We'll acknowledge reports as quickly as we can and work with you on a fix before any public disclosure.

## Scope

Relevant areas of this project, roughly by risk:
- **Extension permissions and content-script injection** (`manifest.json`, `background.js`): anything that could grant a page more access than intended.
- **API key storage and handling** (`background.js`, `options.js`): a key should never leave `chrome.storage.sync` except in a request to the provider it belongs to (Groq or Gemini).
- **Inline rendering of model output** (`modes.js`): model responses are untrusted input; anything that could turn a crafted response into script execution is in scope.

Out of scope: issues in Groq's or Google's own services, or in a third-party AI chat site the extension runs on.
