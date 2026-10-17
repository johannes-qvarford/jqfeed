import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "a",
  "blockquote",
  "br",
  "caption",
  "code",
  "dd",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
];

function absolutize(
  value: string | undefined,
  baseUrl: string,
  allowedProtocols: string[],
): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value, baseUrl);
    return allowedProtocols.includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function sanitizeEntryHtml(html: string, baseUrl: string): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    transformTags: {
      a: (_tagName, attributes) => {
        const href = absolutize(attributes.href, baseUrl, ["http:", "https:", "mailto:"]);
        const attribs: Record<string, string> = {};
        if (attributes.title) attribs.title = attributes.title;
        if (href) {
          attribs.href = href;
          attribs.target = "_blank";
          attribs.rel = "noopener noreferrer";
        }
        return {
          tagName: "a",
          attribs,
        };
      },
      img: (_tagName, attributes) => {
        const src = absolutize(attributes.src, baseUrl, ["http:", "https:"]);
        const attribs: Record<string, string> = { alt: attributes.alt ?? "" };
        if (src) attribs.src = src;
        if (attributes.title) attribs.title = attributes.title;
        if (attributes.width) attribs.width = attributes.width;
        if (attributes.height) attribs.height = attributes.height;
        if (src) attribs.loading = "lazy";
        return {
          tagName: "img",
          attribs,
        };
      },
    },
  });
}
