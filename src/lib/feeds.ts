import type { FeedDefinition, FeedItem } from "./types";
import { readabilityTransformer } from "./article-extractor";

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
    id: "martin-fowler",
    name: "Martin Fowler",
    url: "https://martinfowler.com/feed.atom",
    transform: articleAwareTransformer(),
  },
  {
    id: "simon-willison",
    name: "Simon Willison — longer posts",
    url: "https://simonwillison.net/atom/entries/",
    transform: articleAwareTransformer(),
  },
  {
    id: "inside-java",
    name: "Inside Java",
    url: "https://inside.java/feed.xml",
    transform: articleAwareTransformer(),
  },
  {
    id: "oracle-java",
    name: "Oracle Java blog",
    url: "https://blogs.oracle.com/java/rss",
    transform: articleAwareTransformer(),
  },
  {
    id: "planet-mysql",
    name: "Planet MySQL",
    url: "https://planet.mysql.com/rss20.xml",
    transform: articleAwareTransformer(),
  },
  {
    id: "percona",
    name: "Percona Database Performance Blog",
    url: "https://www.percona.com/blog/feed/",
    transform: articleAwareTransformer(),
  },
  {
    id: "python-insider",
    name: "Python Insider",
    url: "https://blog.python.org/rss.xml",
    transform: articleAwareTransformer(),
  },
  {
    id: "python-peps",
    name: "Recent Python PEPs",
    url: "https://peps.python.org/peps.rss",
    transform: articleAwareTransformer(),
  },
  {
    id: "typescript",
    name: "TypeScript team blog",
    url: "https://devblogs.microsoft.com/typescript/feed/",
    transform: articleAwareTransformer(),
  },
  {
    id: "effective-typescript",
    name: "Effective TypeScript",
    url: "https://effectivetypescript.com/atom.xml",
    transform: articleAwareTransformer(),
  },
  {
    id: "rust-blog",
    name: "Rust project blog",
    url: "https://blog.rust-lang.org/feed.xml",
    transform: articleAwareTransformer(),
  },
  {
    id: "inside-rust",
    name: "Inside Rust",
    url: "https://blog.rust-lang.org/inside-rust/feed.xml",
    transform: articleAwareTransformer(),
  },
];
