import { describe, expect, it, vi } from "vitest";
import { buildEntries } from "./feed-builder";
import { extractMainArticle, readabilityTransformer } from "./article-extractor";
import { sanitizeEntryHtml } from "./content";
import type { FeedDefinition, FeedItem } from "./types";

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel><title>Example</title><link>https://example.com</link><description>Example feed</description>
    <item><title>Older item</title><link>https://example.com/older</link><guid>older-id</guid><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate><content:encoded><![CDATA[<p>Older body</p>]]></content:encoded></item>
    <item><title>Latest item</title><link>https://example.com/latest</link><guid>latest-id</guid><pubDate>Wed, 03 Jan 2024 00:00:00 GMT</pubDate><content:encoded><![CDATA[<p>Latest body</p>]]></content:encoded></item>
    <item><title>Duplicate</title><link>https://example.com/ignored</link><guid>latest-id</guid><pubDate>Wed, 03 Jan 2024 00:00:00 GMT</pubDate><content:encoded><![CDATA[<p>Duplicate body</p>]]></content:encoded></item>
    <item><title>Undated item</title><link>https://example.com/undated</link><guid>undated-id</guid><description><![CDATA[<p>No date</p>]]></description></item>
  </channel>
</rss>`;

const atomXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom example</title><link href="https://atom.example/" />
  <entry><title>Atom item</title><link href="https://atom.example/item" rel="alternate" /><id>tag:atom.example,2024:item</id><updated>2024-04-05T10:30:00Z</updated><content type="html">&lt;p&gt;Atom body&lt;/p&gt;</content></entry>
</feed>`;

const rawTransformer: FeedDefinition["transform"] = (item: FeedItem) => ({
  title: item.title,
  url: item.link,
  publishedAt: item.isoDate ?? item.pubDate,
  contentHtml: item.contentEncoded ?? item.content ?? item.description ?? "",
});

function feed(url = "https://example.com/feed.xml", transform = rawTransformer): FeedDefinition {
  return { id: "example", name: "Example", url, transform };
}

function fetcherFor(xml: string): typeof fetch {
  return (async () => new Response(xml, { status: 200 })) as typeof fetch;
}

describe("buildEntries", () => {
  it("parses RSS, deduplicates within a feed, sorts newest first, and puts undated entries last", async () => {
    const entries = await buildEntries([feed()], { fetcher: fetcherFor(rssXml) });

    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.title)).toEqual([
      "Latest item",
      "Older item",
      "Undated item",
    ]);
    expect(entries[0].publishedAt).toBe("2024-01-03T00:00:00.000Z");
    expect(entries[2].publishedAt).toBeNull();
    expect(entries[0].contentHtml).toContain("Latest body");
  });

  it("parses Atom entries and uses updated as their publication date", async () => {
    const entries = await buildEntries([feed("https://atom.example/feed", rawTransformer)], {
      fetcher: fetcherFor(atomXml),
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "Atom item",
      url: "https://atom.example/item",
      publishedAt: "2024-04-05T10:30:00.000Z",
    });
    expect(entries[0].contentHtml).toContain("Atom body");
  });

  it("returns an empty list without making requests when no feeds are configured", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    await expect(buildEntries([], { fetcher })).resolves.toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("allows a transformer to fetch and extract an article page when the feed body is empty", async () => {
    const xml = `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Example</title><link>https://example.com</link><description>Feed</description>
      <item><title>Story</title><link>https://example.com/story</link><guid>story</guid><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item>
    </channel></rss>`;
    const calls: string[] = [];
    const fetcher: typeof fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("feed.xml")) return new Response(xml, { status: 200 });
      return new Response(
        `<html><head><title>Story</title></head><body><nav>Navigation</nav><article><h1>Story title</h1><p>This is the article's main content and it is long enough for extraction.</p><p>A second paragraph makes it a complete story.</p></article><footer>Footer</footer></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    }) as typeof fetch;
    const entries = await buildEntries(
      [feed("https://example.com/feed.xml", readabilityTransformer())],
      { fetcher },
    );

    expect(calls).toEqual(["https://example.com/feed.xml", "https://example.com/story"]);
    expect(entries[0].contentHtml).toContain("main content");
    expect(entries[0].contentHtml).not.toContain("Navigation");
    expect(entries[0].contentHtml).not.toContain("Footer");
  });

  it("falls back to feed content if preferred article-page extraction fails", async () => {
    const xml = `<rss version="2.0"><channel><title>Example</title><link>https://example.com</link><description>Feed</description>
      <item><title>Story</title><link>https://example.com/story</link><guid>story</guid><content:encoded><![CDATA[<p>Feed body remains available</p>]]></content:encoded></item>
    </channel></rss>`;
    const fetcher: typeof fetch = (async (input: RequestInfo | URL) =>
      String(input).endsWith("feed.xml")
        ? new Response(xml, { status: 200 })
        : new Response("Unavailable", { status: 503 })) as typeof fetch;
    const entries = await buildEntries(
      [feed("https://example.com/feed.xml", readabilityTransformer({ preferArticlePage: true }))],
      { fetcher },
    );

    expect(entries[0].contentHtml).toContain("Feed body remains available");
  });

  it("fails the build when a configured feed cannot be fetched", async () => {
    const fetcher = (async () => new Response("Unavailable", { status: 503 })) as typeof fetch;

    await expect(buildEntries([feed()], { fetcher })).rejects.toThrow(/HTTP 503/);
  });

  it("fails the build when an entry transformer throws", async () => {
    const transform: FeedDefinition["transform"] = () => {
      throw new Error("extractor failed");
    };

    await expect(buildEntries([feed("https://example.com/feed.xml", transform)], {
      fetcher: fetcherFor(rssXml),
    })).rejects.toThrow(/extractor failed/);
  });
});

describe("content safety and extraction", () => {
  it("removes scripts and unsafe URLs while resolving relative links and images", () => {
    const safe = sanitizeEntryHtml(
      `<script>alert(1)</script><p><a href="javascript:alert(1)">bad</a><a href="/related">good</a><img src="/photo.jpg" onerror="alert(1)"></p>`,
      "https://example.com/story",
    );

    expect(safe).not.toContain("<script");
    expect(safe).not.toContain("javascript:");
    expect(safe).not.toContain("onerror");
    expect(safe).toContain('href="https://example.com/related"');
    expect(safe).toContain('src="https://example.com/photo.jpg"');
  });

  it("extracts the main article and rejects pages without readable content", () => {
    const article = extractMainArticle(
      `<html><body><nav>Menu</nav><article><h1>Title</h1><p>A substantial paragraph for a readable article with enough words to qualify.</p><p>A second paragraph gives the content additional length.</p></article></body></html>`,
      "https://example.com/article",
    );
    expect(article.contentHtml).toContain("substantial paragraph");
    expect(() => extractMainArticle("<html><body></body></html>", "https://example.com/empty")).toThrow();
  });
});
