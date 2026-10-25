import type Parser from "rss-parser";

export type FeedItem = Parser.Item & {
  contentEncoded?: string;
  description?: string;
  updated?: string;
};

export type TransformedEntry = {
  title?: string;
  url?: string;
  publishedAt?: string | null;
  contentHtml: string;
};

export type NormalizedEntry = {
  id: string;
  feedId: string;
  feedName: string;
  title: string;
  url: string;
  publishedAt: string | null;
  contentHtml: string;
};

export type FeedTransformContext = {
  fetchArticlePage: (url: string) => Promise<{ html: string; finalUrl: string }>;
};

export type FeedTransformer = (
  item: FeedItem,
  context: FeedTransformContext,
) => Promise<TransformedEntry> | TransformedEntry;

export type FeedSource =
  | {
      type: "rss";
      url: string;
    }
  | {
      type: "html";
      url: string;
      parseItems: (html: string, pageUrl: string) => FeedItem[];
    };

export type FeedDefinition = {
  id: string;
  name: string;
  source: FeedSource;
  transform: FeedTransformer;
};
