# Repository guidance

## Project shape

- `app/` contains the Next.js App Router page, document metadata, and global styles.
- `src/components/` contains the reader UI and its component tests.
- `src/lib/` contains feed definitions, feed fetching and normalization, article extraction, HTML sanitization, and generated-entry loading.
- `scripts/generate-entries.ts` fetches and transforms feed entries into `.generated/entries.json`.
- `.generated/`, `.next/`, and `out/` are generated output. Do not edit or commit them as source.
- `.github/workflows/pages.yml` runs checks, builds the static export, and deploys it to GitHub Pages.

## Feed and content changes

- Add or change feeds in `src/lib/feeds.ts`. Feed IDs must be stable and unique; feed URLs must use HTTP or HTTPS.
- A feed transformer receives a parsed `FeedItem` and a `fetchArticlePage` helper, and returns `contentHtml` with optional title, source URL, and publication date overrides. Prefer the provided `readabilityTransformer` unless a feed needs custom extraction.
- `buildEntries` keeps entries from the last seven days, deduplicates them within each feed, normalizes their metadata, sanitizes their HTML, and sorts them newest first. A feed fetch or entry transformation failure fails generation and therefore blocks deployment.
- Keep feed content safe for display. `sanitizeEntryHtml` is the boundary before content is rendered; do not bypass it or render raw feed HTML directly in the UI.
- The site is a static export. The home page reads `.generated/entries.json` at build time; runtime server behavior is not part of the deployment model.

## Development checks

- Use Node.js 22.12 or newer and `npm ci` to install the locked dependencies.
- `npm run dev` generates feed data before starting Next.js. Feed generation and `npm run build` contact the configured external feeds.
- Run `npm test` for the Vitest suite and `npm run typecheck` for TypeScript checks after code changes. `npm run build` validates the static export and refreshes generated entries.
- Tests use Vitest with a jsdom environment. Keep tests near the code they cover, following the existing `*.test.ts` and `*.test.tsx` files.
- Keep changes focused and preserve strict TypeScript typing. Put reader presentation changes in `src/components/reader.tsx` and `app/globals.css`; keep feed parsing and extraction in `src/lib/`.
