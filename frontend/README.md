# Argue Back — website

The marketing/demo site for [Argue Back](../README.md), the Chrome extension that takes apart AI chat answers instead of regenerating them.

## Development

You'll need Node.js (or Bun, which this project is set up to use — see `bun.lock`).

```sh
npm i
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build locally
- `npm run lint` — lint this project (scoped to `frontend/`, separate from the extension's own lint setup at the repo root)
- `npm run format` — format with Prettier
