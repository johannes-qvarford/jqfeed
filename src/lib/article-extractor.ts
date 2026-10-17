import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import type { FeedTransformer } from "./types";

export function extractMainArticle(html: string, pageUrl: string) {
  const dom = new JSDOM(html, { url: pageUrl });

  try {
    const article = new Readability(dom.window.document).parse();
    if (!article?.content?.trim()) {
      throw new Error(`No readable article content found at ${pageUrl}`);
    }

    return {
      title: article.title?.trim() || undefined,
      contentHtml: article.content,
    };
  } finally {
    dom.window.close();
  }
}

export function readabilityTransformer(options: { preferArticlePage?: boolean } = {}): FeedTransformer {
  return async (item, context) => {
    const feedContent =
      item.contentEncoded ?? item.content ?? item.description ?? item.summary ?? "";
    const link = item.link?.trim();

    if (options.preferArticlePage && link) {
      try {
        const page = await context.fetchArticlePage(link);
        const article = extractMainArticle(page.html, page.finalUrl);
        return {
          title: item.title?.trim() || article.title,
          url: link,
          publishedAt: item.isoDate ?? item.pubDate ?? null,
          contentHtml: article.contentHtml,
        };
      } catch (error) {
        if (!feedContent.trim()) throw error;
      }
    }

    if (feedContent.trim()) {
      return {
        title: item.title?.trim(),
        url: link,
        publishedAt: item.isoDate ?? item.pubDate ?? null,
        contentHtml: feedContent,
      };
    }

    if (link) {
      const page = await context.fetchArticlePage(link);
      const article = extractMainArticle(page.html, page.finalUrl);
      return {
        title: item.title?.trim() || article.title,
        url: link,
        publishedAt: item.isoDate ?? item.pubDate ?? null,
        contentHtml: article.contentHtml,
      };
    }

    throw new Error("Feed entry has no content or linked article page");
  };
}
