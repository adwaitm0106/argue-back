// Flat config (ESLint 9+). Kept intentionally small: this project has no build step
// and no bundler, so every extension file is a plain classic script loaded straight
// by the manifest — the config below just describes that environment accurately
// rather than trying to bolt on a module system that isn't there.
const js = require('@eslint/js');

// Everything the extension's own scripts touch: DOM/browser APIs, the extension
// APIs, and a handful of standard timer/console globals. Kept as one shared object
// so adding a new global only needs to happen in one place.
const extensionGlobals = {
  window: 'readonly',
  document: 'readonly',
  location: 'readonly',
  chrome: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  AbortController: 'readonly',
  Node: 'readonly',
  Range: 'readonly',
  NodeFilter: 'readonly',
  CSS: 'readonly',
  Highlight: 'readonly',
  MutationObserver: 'readonly',
  getComputedStyle: 'readonly',
  getSelection: 'readonly',
  requestAnimationFrame: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  importScripts: 'readonly',
  URLSearchParams: 'readonly'
};

module.exports = [
  js.configs.recommended,
  {
    // This file itself: a plain Node/CommonJS config, not an extension script.
    files: ['eslint.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 2022,
      globals: { require: 'readonly', module: 'writable' }
    }
  },
  {
    // The extension's own source: every top-level .js file in the repo root.
    files: ['*.js'],
    ignores: ['eslint.config.js'],
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 2022,
      globals: extensionGlobals
    },
    rules: {
      // A handful of intentional patterns this codebase relies on throughout:
      // destructuring params that go unused by design, and catch blocks that
      // deliberately swallow an error (e.g. "config.js is optional and gitignored").
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }]
    }
  },
  {
    // background.js loads these via importScripts(), which ESLint can't see through —
    // they're real globals at runtime, just defined in a sibling file.
    files: ['background.js'],
    languageOptions: {
      globals: { OPENROUTER_KEY: 'readonly', callLLM: 'readonly', testProviderKey: 'readonly' }
    }
  },
  {
    // llm_client.js is a library file: callLLM/testProviderKey/etc. are its public API,
    // consumed by background.js (importScripts) and options.js (a <script> tag) — never
    // called from within this file itself, so `vars: "local"` tells no-unused-vars to
    // only flag genuinely-dead locals, not top-level declarations meant to be globals.
    files: ['llm_client.js'],
    rules: {
      'no-unused-vars': ['warn', { vars: 'local', args: 'after-used', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]
    }
  },
  {
    // options.html loads llm_client.js via a plain <script> tag before options.js, so
    // PROVIDERS is a real global by the time this file runs.
    files: ['options.js'],
    languageOptions: {
      globals: { PROVIDERS: 'readonly' }
    }
  },
  {
    // config.js/config.example.js exist purely to be picked up by background.js's
    // importScripts() — declaring OPENROUTER_KEY is their entire job, "unused" here
    // is by design.
    files: ['config.js', 'config.example.js'],
    rules: { 'no-unused-vars': 'off' }
  },
  {
    // The Node-based test suite: CommonJS, plus the same browser-ish globals it
    // stubs out for the DOM shim and the mocked fetch/AbortController in llm_client
    // tests.
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 2022,
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        global: 'writable',
        console: 'readonly',
        fetch: 'writable',
        AbortController: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    ignores: ['node_modules/**', 'web-demo/**']
  }
];
