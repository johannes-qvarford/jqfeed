import type { FeedDefinition, FeedItem } from "./types";
import { readabilityTransformer } from "./article-extractor";
import { parseMoonshotListing } from "./moonshot-feed";

function preferArticlePageForShortFeedContent(item: FeedItem) {
  const feedContent =
    item.contentEncoded ?? item.content ?? item.description ?? item.summary ?? "";
  const textLength = feedContent
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length;

  return textLength < 1_200;
}

function articleAwareTransformer() {
  return readabilityTransformer({
    preferArticlePage: preferArticlePageForShortFeedContent,
  });
}

/**
 * ACM Queue's supplied queuecontent.xml endpoint currently returns HTTP 410
 * with "This channel is discontinued". Since a failed feed blocks a build,
 * add it back once ACM provides a working feed URL.
 */
export const feeds: FeedDefinition[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    source: {
      type: "rss",
      url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_claude.xml",
    },
    transform: articleAwareTransformer(),
  },
  {
    id: "moonshot-ai",
    name: "Moonshot AI",
    source: {
      type: "html",
      url: "https://www.kimi.ai/blog/",
      parseItems: parseMoonshotListing,
    },
    transform: articleAwareTransformer(),
  },
  {
    id: "martin-fowler",
    name: "Martin Fowler",
    source: { type: "rss", url: "https://martinfowler.com/feed.atom" },
    transform: articleAwareTransformer(),
  },
  {
    id: "simon-willison",
    name: "Simon Willison — longer posts",
    source: { type: "rss", url: "https://simonwillison.net/atom/entries/" },
    transform: articleAwareTransformer(),
  },
  {
    id: "inside-java",
    name: "Inside Java",
    source: { type: "rss", url: "https://inside.java/feed.xml" },
    transform: articleAwareTransformer(),
  },
  {
    id: "oracle-java",
    name: "Oracle Java blog",
    source: { type: "rss", url: "https://blogs.oracle.com/java/rss" },
    transform: articleAwareTransformer(),
  },
  {
    id: "meeting-cpp",
    name: "Meeting C++ Blog",
    source: { type: "rss", url: "https://meetingcpp.com/blogen.xml" },
    transform: articleAwareTransformer(),
  },
  {
    id: "old-new-thing",
    name: "The Old New Thing",
    source: { type: "rss", url: "https://devblogs.microsoft.com/oldnewthing/feed/" },
    transform: articleAwareTransformer(),
  },
  {
    id: "cpp-team-blog",
    name: "C++ Team Blog",
    source: { type: "rss", url: "https://devblogs.microsoft.com/cppblog/feed/" },
    transform: articleAwareTransformer(),
  },
  {
    id: "braden-plusplus",
    name: "Braden++",
    source: { type: "rss", url: "https://blog.ganets.ky/feed.xml" },
    transform: articleAwareTransformer(),
  },
  {
    id: "planet-mysql",
    name: "Planet MySQL",
    source: { type: "rss", url: "https://planet.mysql.com/rss20.xml" },
    transform: articleAwareTransformer(),
  },
  {
    id: "python-insider",
    name: "Python Insider",
    source: { type: "rss", url: "https://blog.python.org/rss.xml" },
    transform: articleAwareTransformer(),
  },
  {
    id: "openai-news",
    name: "OpenAI News",
    source: { type: "rss", url: "https://openai.com/news/rss.xml" },
    transform: articleAwareTransformer(),
  },
  {
    id: "intellij-idea",
    name: "IntelliJ IDEA Blog",
    source: { type: "rss", url: "https://blog.jetbrains.com/idea/feed/" },
    transform: articleAwareTransformer(),
  },
  {
    id: "gemini",
    name: "Gemini",
    source: { type: "rss", url: "https://blog.google/products/gemini/rss/" },
    transform: articleAwareTransformer(),
  },
  {
    id: "python-peps",
    name: "Recent Python PEPs",
    source: { type: "rss", url: "https://peps.python.org/peps.rss" },
    transform: articleAwareTransformer(),
  },
  {
    id: "typescript",
    name: "TypeScript team blog",
    source: { type: "rss", url: "https://devblogs.microsoft.com/typescript/feed/" },
    transform: articleAwareTransformer(),
  },
  {
    id: "effective-typescript",
    name: "Effective TypeScript",
    source: { type: "rss", url: "https://effectivetypescript.com/atom.xml" },
    transform: articleAwareTransformer(),
  },
  {
    id: "rust-blog",
    name: "Rust project blog",
    source: { type: "rss", url: "https://blog.rust-lang.org/feed.xml" },
    transform: articleAwareTransformer(),
  },
  {
    id: "inside-rust",
    name: "Inside Rust",
    source: { type: "rss", url: "https://blog.rust-lang.org/inside-rust/feed.xml" },
    transform: articleAwareTransformer(),
  },
  {
    id: "this-week-in-rust",
    name: "This Week in Rust",
    source: { type: "rss", url: "https://this-week-in-rust.org/rss.xml" },
    transform: articleAwareTransformer(),
  },
];
