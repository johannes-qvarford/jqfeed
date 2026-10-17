import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { sanitizeEntryHtml } from "./content";
import type { FeedDefinition, FeedItem, NormalizedEntry, TransformedEntry } from "./types";

const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT = "jqfeed/1.0 (+https://github.com/)";

type Fetcher = typeof fetch;

function parseHttpUrl(value: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute HTTP or HTTPS URL: ${value}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} must use HTTP or HTTPS: ${value}`);
  }
  return url;
}

async function fetchText(url: string, fetcher: Fetcher, kind: string): Promise<{ text: string; finalUrl: string }> {
  parseHttpUrl(url, kind);
  const response = await fetcher(url, {
    headers: {
      accept: kind === "feed" ? "application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5" : "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${kind} request returned HTTP ${response.status} for ${url}`);
  }

  return { text: await response.text(), finalUrl: response.url || url };
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function feedItemIdentity(feedId: string, item: FeedItem): string {
  const identity = item.guid?.trim() || item.link?.trim();
  if (identity) return `${feedId}\n${identity}`;

  return `${feedId}\n${item.title?.trim() ?? ""}\n${item.isoDate ?? item.pubDate ?? ""}`;
}

function makeEntryId(identity: string): string {
  return createHash("sha256").update(identity).digest("hex").slice(0, 20);
}

function stableKey(feedId: string, item: FeedItem): string {
  return createHash("sha256").update(feedItemIdentity(feedId, item)).digest("hex");
}

function compareEntries(left: NormalizedEntry, right: NormalizedEntry): number {
  if (left.publishedAt && right.publishedAt) {
    const dateDifference = Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    if (dateDifference !== 0) return dateDifference;
  } else if (left.publishedAt) {
    return -1;
  } else if (right.publishedAt) {
    return 1;
  }

  return left.id.localeCompare(right.id);
}

function normalizeEntry(
  feed: FeedDefinition,
  item: FeedItem,
  transformed: TransformedEntry,
  identity: string,
): NormalizedEntry {
  const title = transformed.title?.trim() || item.title?.trim();
  const url = transformed.url?.trim() || item.link?.trim();
  if (!title) throw new Error("transformed entry is missing a title");
  if (!url) throw new Error("transformed entry is missing a source URL");
  parseHttpUrl(url, "entry source URL");

  const contentHtml = sanitizeEntryHtml(transformed.contentHtml, url).trim();
  if (!contentHtml) throw new Error("transformed entry has no safe displayable content");

  return {
    id: makeEntryId(identity),
    feedId: feed.id,
    feedName: feed.name,
    title,
    url,
    publishedAt: normalizeDate(transformed.publishedAt ?? item.isoDate ?? item.pubDate),
    contentHtml,
  };
}

export async function buildEntries(
  feeds: FeedDefinition[],
  options: { fetcher?: Fetcher } = {},
): Promise<NormalizedEntry[]> {
  const fetcher = options.fetcher ?? fetch;
  const feedIds = new Set<string>();
  for (const feed of feeds) {
    if (feedIds.has(feed.id)) throw new Error(`Duplicate feed id: ${feed.id}`);
    feedIds.add(feed.id);
    parseHttpUrl(feed.url, `Feed "${feed.id}" URL`);
  }

  const entries: NormalizedEntry[] = [];
  const parser = new Parser<Record<string, unknown>, FeedItem>({
    customFields: {
      item: [["content:encoded", "contentEncoded"]],
    },
  });

  for (const feed of feeds) {
    try {
      const { text: xml } = await fetchText(feed.url, fetcher, `Feed "${feed.id}"`);
      const parsed = await parser.parseString(xml);
      const seen = new Set<string>();

      for (const item of parsed.items ?? []) {
        const identity = feedItemIdentity(feed.id, item);
        const key = stableKey(feed.id, item);
        if (seen.has(key)) continue;
        seen.add(key);

        try {
          const transformed = await feed.transform(item, {
            fetchArticlePage: async (url) => {
              const page = await fetchText(url, fetcher, `Article for feed "${feed.id}"`);
              return { html: page.text, finalUrl: page.finalUrl };
            },
          });
          entries.push(normalizeEntry(feed, item, transformed, identity));
        } catch (error) {
          throw new Error(
            `Entry "${item.title ?? item.guid ?? item.link ?? "(unknown)"}" could not be transformed: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
          );
        }
      }
    } catch (error) {
      throw new Error(
        `Feed "${feed.id}" (${feed.url}) failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  return entries.sort(compareEntries);
}
