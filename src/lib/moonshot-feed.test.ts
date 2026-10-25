import { describe, expect, it } from "vitest";
import { parseMoonshotListing } from "./moonshot-feed";

const listing = [
  '<main><div class="cards-list">',
  '<div class="menu-card"><a href="/blog/kimi-k3" aria-label="Kimi K3"></a>',
  '<h4 class="card-title">Kimi K3</h4><p class="card-date">2026-07-16</p></div>',
  "</div></main>",
].join("");

describe("parseMoonshotListing", () => {
  it("extracts article title, absolute URL, and normalized publication date", () => {
    expect(parseMoonshotListing(listing, "https://www.kimi.ai/blog/")).toEqual([
      {
        title: "Kimi K3",
        link: "https://www.kimi.ai/blog/kimi-k3",
        guid: "https://www.kimi.ai/blog/kimi-k3",
        pubDate: "Thu, 16 Jul 2026 00:00:00 GMT",
        isoDate: "2026-07-16T00:00:00.000Z",
      },
    ]);
  });

  it("ignores research cards that link to external repositories", () => {
    const withRepositoryCard =
      listing.replace(
        "</div></main>",
        '<div class="menu-card"><a href="https://github.com/MoonshotAI/Kimi-Dev" aria-label="Kimi-Dev"></a>' +
          '<h4 class="card-title">Kimi-Dev</h4><p class="card-date">2025-06-17</p></div></div></main>',
      );

    expect(parseMoonshotListing(withRepositoryCard, "https://www.kimi.ai/blog/")).toHaveLength(1);
  });

  it("throws when the listing has no article cards", () => {
    expect(() =>
      parseMoonshotListing("<html><body>No article cards</body></html>", "https://www.kimi.ai/blog/"),
    ).toThrow(/no article cards/);
  });

  it("throws when an article card is missing required metadata", () => {
    const malformed =
      '<div class="cards-list"><div class="menu-card"><a href="/blog/kimi-k3"></a>' +
      '<h4 class="card-title">Kimi K3</h4></div></div>';

    expect(() =>
      parseMoonshotListing(malformed, "https://www.kimi.ai/blog/"),
    ).toThrow(/missing a title, link, or date/);
  });

  it("rejects article links outside the source site", () => {
    const unsafe =
      '<div class="cards-list"><div class="menu-card">' +
      '<a href="/blog/../about" aria-label="Kimi K3"></a>' +
      '<h4 class="card-title">Kimi K3</h4><p class="card-date">2026-07-16</p>' +
      "</div></div>";

    expect(() =>
      parseMoonshotListing(unsafe, "https://www.kimi.ai/blog/"),
    ).toThrow(/unexpected article URL/);
  });
});
