import { expect, test } from "bun:test";
import { parseMessageMarkdown } from "./markdown";

test("parses headings, lists and code into data-only nodes", () => {
  const nodes = parseMessageMarkdown("## Titre **fort**\n\n- Un\n- Deux\n\n```js\nconst x = 1;\n```");
  expect(nodes.map(node => node.type)).toEqual(["heading", "list", "code"]);
  expect(nodes[0]?.children?.[1]?.type).toBe("strong");
  expect(nodes[1]?.children).toHaveLength(2);
  expect(nodes[2]?.children?.map(node => node.text).join("")).toBe("const x = 1;\n");
});

test("treats raw HTML as text and does not render image URLs", () => {
  const nodes = parseMessageMarkdown('<img src=x onerror=alert(1)>\n\n![secret](https://example.invalid/tracker)');
  expect(JSON.stringify(nodes)).toContain("<img src=x onerror=alert(1)>");
  expect(JSON.stringify(nodes)).not.toContain("example.invalid");
  expect(nodes[1]?.children?.[0]?.type).toBe("image");
});
