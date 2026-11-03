import { expect, test } from 'bun:test';
import { renderMarkdown } from './markdown-dom.js';
import { parseMessageMarkdown } from './markdown.ts';

test('renders Markdown without creating unsafe HTML, links or images', () => {
  const created = [];
  const doc = {
    createElement(tag) { const node = { tag, children: [], append(child) { this.children.push(child); } }; created.push(node); return node; },
    createTextNode(text) { return { text }; },
  };
  const root = doc.createElement('root');
  const nodes = parseMessageMarkdown('## Titre **fort**\n\n[piège](javascript:alert(1)) [source](https://example.com)\n\n<img src=x onerror=alert(1)>\n\n![pixel](https://example.com/pixel.png)');
  renderMarkdown(nodes, root, doc);
  expect(created.some(node => node.tag === 'h4')).toBe(true);
  expect(created.some(node => node.tag === 'strong')).toBe(true);
  expect(created.filter(node => node.tag === 'a')).toHaveLength(1);
  expect(created.find(node => node.tag === 'a').href).toBe('https://example.com/');
  expect(created.some(node => ['script', 'img'].includes(node.tag))).toBe(false);
  expect(JSON.stringify(root)).toContain('<img src=x onerror=alert(1)>');
});
