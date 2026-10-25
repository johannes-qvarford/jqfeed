import { JSDOM } from "jsdom";
import type { FeedItem } from "./types";

const ARTICLE_CARD_SELECTOR = ".cards-list .menu-card";

export function parseMoonshotListing(html: string, pageUrl: string): FeedItem[] {
  const dom = new JSDOM(html, { url: pageUrl });

  try {
    const pageOrigin = new URL(pageUrl).origin;
    const cards = Array.from(
      dom.window.document.querySelectorAll(ARTICLE_CARD_SELECTOR),
    ).filter((card) => card.querySelector('a[href^="/blog/"]'));
    if (cards.length === 0) {
      throw new Error("no article cards found in the Moonshot research listing");
    }

    return cards.map((card, index) => {
      const linkElement = card.querySelector<HTMLAnchorElement>('a[href^="/blog/"]');
      const linkValue = linkElement?.getAttribute("href")?.trim();
      const title =
        card.querySelector(".card-title")?.textContent?.trim() ||
        linkElement?.getAttribute("aria-label")?.trim();
      const dateText = card.querySelector(".card-date")?.textContent?.trim();

      if (!linkValue || !title || !dateText) {
        throw new Error(
          "article card " + (index + 1) + " is missing a title, link, or date",
        );
      }

      const articleUrl = new URL(linkValue, pageUrl);
      if (articleUrl.origin !== pageOrigin || !articleUrl.pathname.startsWith("/blog/")) {
        throw new Error("article card " + (index + 1) + " has an unexpected article URL");
      }

      const publishedTimestamp = Date.parse(dateText);
      if (!Number.isFinite(publishedTimestamp)) {
        throw new Error("article card " + (index + 1) + " has an invalid publication date");
      }

      const publishedAt = new Date(publishedTimestamp);
      return {
        title,
        link: articleUrl.href,
        guid: articleUrl.href,
        pubDate: publishedAt.toUTCString(),
        isoDate: publishedAt.toISOString(),
      };
    });
  } finally {
    dom.window.close();
  }
}
