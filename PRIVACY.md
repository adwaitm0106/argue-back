# Privacy Policy for Argue Back

Argue Back does not collect, transmit, or sell any personal data.

## What the extension reads

When you click "Argue Back" or use the right-click menu, the extension reads the visible text of the AI answer (or the text you selected) and the question that preceded it, directly on the page in your own browser. This text is not sent anywhere except to the AI provider you've chosen in settings (Groq or Google Gemini), and only when you explicitly trigger an analysis.

## What gets sent, and to whom

The answer text and question are sent to whichever provider you picked in settings, [Groq](https://groq.com) or [Google Gemini](https://ai.google.dev), so that a language model can analyze them. Nothing else on the page, and no browsing history, is ever read or sent. The request also includes the API key for that provider, which is required to use their service.

## What is stored, and where

* Your API key(s) and model preferences are stored per-provider in `chrome.storage.sync`, which is Chrome's own encrypted, account-scoped storage. It is never sent to us or to any server we control.
* Analysis results are cached locally in `chrome.storage.local` purely to avoid repeat API calls for the same answer. This cache never leaves your device.

## What we do not do

* We do not run our own servers that see your data.
* We do not include analytics, trackers, or telemetry of any kind.
* We do not sell or share data with advertisers or any third party other than the provider you've selected, and only for the single purpose described above.

## Permissions used

* `storage`: to save your API key(s) and the local result cache.
* `activeTab` / `scripting`: to read the page you right-click on and show the floating panel, only when you invoke it.
* `contextMenus`: to add the "Argue Back" right-click menu item.
* Host access to supported chat sites and to Groq/Gemini's APIs: to show the inline button and make the analysis request.

## Contact

Open an issue on the [GitHub repository](https://github.com/adwaitm0106/argue-back) with any privacy questions.
