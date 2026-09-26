# Privacy Policy for Argue Back

Argue Back does not collect, transmit, or sell any personal data.

## What the extension reads

When you click "Argue Back" or use the right-click menu, the extension reads the visible text of the AI answer (or the text you selected) and the question that preceded it, directly on the page in your own browser. This text is not sent anywhere except to OpenRouter (see below), and only when you explicitly trigger an analysis.

## What gets sent, and to whom

The answer text and question are sent to [OpenRouter](https://openrouter.ai), a third-party API router, so that a language model can analyze them. Nothing else on the page, and no browsing history, is ever read or sent. The request also includes your OpenRouter API key, which is required to use their service.

## What is stored, and where

* Your OpenRouter API key and model preference are stored in `chrome.storage.sync`, which is Chrome's own encrypted, account-scoped storage. It is never sent to us or to any server we control.
* Analysis results are cached locally in `chrome.storage.local` purely to avoid repeat API calls for the same answer. This cache never leaves your device.

## What we do not do

* We do not run our own servers that see your data.
* We do not include analytics, trackers, or telemetry of any kind.
* We do not sell or share data with advertisers or any third party other than OpenRouter, and only for the single purpose described above.

## Permissions used

* `storage` — to save your API key and the local result cache.
* `activeTab` / `scripting` — to read the page you right-click on and show the floating panel, only when you invoke it.
* `contextMenus` — to add the "Argue Back" right-click menu item.
* Host access to supported chat sites and OpenRouter — to show the inline button and make the analysis request.

## Contact

Open an issue on the [GitHub repository](https://github.com/adwaitm0106/argue-back) with any privacy questions.
