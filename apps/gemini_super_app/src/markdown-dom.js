export function renderMarkdown(nodes, parent, doc = document) {
  const tags = { paragraph: 'p', strong: 'strong', emphasis: 'em', strikethrough: 'del', codespan: 'code', blockquote: 'blockquote', listItem: 'li', table: 'table', thead: 'thead', tbody: 'tbody', tr: 'tr', th: 'th', td: 'td', hr: 'hr' };
  for (const node of nodes) {
    if (node.type === 'text') { parent.append(doc.createTextNode(node.text || '')); continue; }
    if (node.type === 'image') { parent.append(doc.createTextNode('Image : ')); renderMarkdown(node.children || [], parent, doc); continue; }
    if (node.type === 'link') {
      let url;
      try { url = new URL(node.href); } catch {}
      if (!url || !['http:', 'https:'].includes(url.protocol)) { renderMarkdown(node.children || [], parent, doc); continue; }
      const link = doc.createElement('a');
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      renderMarkdown(node.children || [], link, doc);
      parent.append(link);
      continue;
    }
    let tag = Object.hasOwn(tags, node.type) ? tags[node.type] : undefined;
    if (node.type === 'heading') tag = `h${Math.max(3, Math.min(6, Number(node.level) + 2 || 3))}`;
    if (node.type === 'list') tag = node.ordered ? 'ol' : 'ul';
    if (node.type === 'code') {
      const pre = doc.createElement('pre');
      const code = doc.createElement('code');
      renderMarkdown(node.children || [], code, doc);
      pre.append(code);
      parent.append(pre);
      continue;
    }
    if (!tag) { renderMarkdown(node.children || [], parent, doc); continue; }
    const element = doc.createElement(tag);
    if (node.type === 'list' && node.ordered && Number.isSafeInteger(node.start) && node.start > 0) element.start = node.start;
    if (node.type === 'th') element.scope = 'col';
    renderMarkdown(node.children || [], element, doc);
    if (node.type === 'table') { const wrapper = doc.createElement('div'); wrapper.className = 'table-scroll'; wrapper.append(element); parent.append(wrapper); }
    else parent.append(element);
  }
}

