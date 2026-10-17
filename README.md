# jqfeed

A static Next.js reader for RSS and Atom feeds. Each build fetches the entries currently published by the configured feeds, extracts their content, and sorts them newest first. The site does not keep an archive, so an entry disappears when its feed drops it.

## Add feeds

Edit [`src/lib/feeds.ts`](src/lib/feeds.ts). Each feed has its own TypeScript transformer. The provided `readabilityTransformer` uses the feed's full content when available and can extract the linked article page when needed:

```ts
import { readabilityTransformer } from "./article-extractor";
import type { FeedDefinition } from "./types";

export const feeds: FeedDefinition[] = [
  {
    id: "example",
    name: "Example Magazine",
    url: "https://example.com/feed.xml",
    transform: readabilityTransformer({ preferArticlePage: true }),
  },
];
```

For custom extraction, a transformer receives the parsed feed entry and a `fetchArticlePage(url)` helper. It returns `contentHtml` and may override the title, source URL, or publication date. The build sanitizes the returned HTML before displaying it. If article-page extraction fails but the feed entry contains content, the built-in transformer falls back to that feed content.

Feed IDs should be stable and unique. Entries are deduplicated within each feed by its GUID, then link, then title and publication date. A feed or entry that cannot be fetched or transformed fails the build; GitHub Pages keeps serving the last successful deployment.

## Run locally

Requires Node.js 22.12 or newer. The Pages workflow uses Node.js 24.

```sh
npm ci
npm run dev
```

The development command generates the current feed data before starting Next.js. With the starter's empty feed list, the site shows an empty state. Run `npm test` and `npm run typecheck` to check changes, and `npm run build` to generate the static export in `out/`.

## Deploy to GitHub Pages

1. Add feed URLs and transformers, then push the project to GitHub.
2. In repository **Settings → Pages**, set the publishing source to **GitHub Actions**.
3. The workflow builds and deploys on pushes, can be run manually from the Actions tab, and refreshes daily at 04:17 Europe/Stockholm time.

The workflow passes the base path reported by GitHub Pages to Next.js, so project sites and custom domains use the right path. A failed fetch or transform prevents deployment, leaving the last successful static site online. The generated output is a static export and does not need a Next.js server at runtime.
