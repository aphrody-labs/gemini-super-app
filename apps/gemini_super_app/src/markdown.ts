/** Convert untrusted Markdown into a data-only tree; no model HTML is returned. */
export interface MarkdownNode { type: string; text?: string; href?: string; level?: number; ordered?: boolean; start?: number; children?: MarkdownNode[] }

export function parseMessageMarkdown(source: string): MarkdownNode[] {
  const children = (value: string): MarkdownNode[] => JSON.parse(`[${value.replaceAll("\n", '{"type":"text","text":"\\n"},')}null]`).filter((node: MarkdownNode | null) => node !== null);
  const leaf = (text: string) => `${JSON.stringify({ type: "text", text })},`;
  const wrap = (type: string, value: string, extra: object = {}) => `${JSON.stringify({ type, children: children(value), ...extra })},`;
  try {
    const output = Bun.markdown.render(source, {
      text: leaf,
      paragraph: value => wrap("paragraph", value),
      heading: (value, meta) => wrap("heading", value, { level: meta.level }),
      strong: value => wrap("strong", value),
      emphasis: value => wrap("emphasis", value),
      strikethrough: value => wrap("strikethrough", value),
      codespan: value => wrap("codespan", value),
      code: value => wrap("code", value),
      blockquote: value => wrap("blockquote", value),
      list: (value, meta) => wrap("list", value, { ordered: meta.ordered, start: meta.start }),
      listItem: value => wrap("listItem", value),
      link: (value, meta) => wrap("link", value, { href: meta.href }),
      image: value => wrap("image", value),
      hr: () => `${JSON.stringify({ type: "hr" })},`,
      table: value => wrap("table", value),
      thead: value => wrap("thead", value),
      tbody: value => wrap("tbody", value),
      tr: value => wrap("tr", value),
      th: value => wrap("th", value),
      td: value => wrap("td", value),
      html: value => leaf(value),
    }, { noHtmlBlocks: true, noHtmlSpans: true });
    return children(output);
  } catch {
    return [{ type: "text", text: source }];
  }
}
