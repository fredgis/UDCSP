// Tiny Markdown renderer for the Citizen Assistant chat replies.
// Supports: **bold**, *italic*, `code`, [text](url), bullet lists (-, *),
// numbered lists (1.), inline line breaks, paragraph breaks.
// Inputs are first HTML-escaped — only the markdown tokens above produce tags,
// so no user/agent text can inject script. Links open in a new tab with
// rel="noopener noreferrer".

import type { ReactNode } from 'react';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(line: string): string {
  let s = escapeHtml(line);
  // links [text](url) — only allow http(s)/relative
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (_, t, u) => {
    return `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`;
  });
  // bold **x**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic *x* (single star, not crossing whitespace)
  s = s.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
  // inline code `x`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

type Block =
  | { kind: 'p'; html: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

function tokenize(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let buf: string[] = [];
  let listKind: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];

  const flushPara = () => {
    if (buf.length) {
      blocks.push({ kind: 'p', html: buf.map(renderInline).join('<br/>') });
      buf = [];
    }
  };
  const flushList = () => {
    if (listKind && listItems.length) {
      blocks.push({ kind: listKind, items: listItems.map(renderInline) });
      listItems = [];
      listKind = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    const ulMatch = /^[-*]\s+(.*)$/.exec(line);
    const olMatch = /^(\d+)\.\s+(.*)$/.exec(line);
    if (ulMatch) {
      flushPara();
      if (listKind && listKind !== 'ul') flushList();
      listKind = 'ul';
      listItems.push(ulMatch[1]);
      continue;
    }
    if (olMatch) {
      flushPara();
      if (listKind && listKind !== 'ol') flushList();
      listKind = 'ol';
      listItems.push(olMatch[2]);
      continue;
    }
    flushList();
    buf.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

export function MiniMarkdown({ text }: { text: string }): ReactNode {
  const blocks = tokenize(text);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'p') {
          return <p key={i} className="md-p" dangerouslySetInnerHTML={{ __html: b.html }} />;
        }
        if (b.kind === 'ul') {
          return (
            <ul key={i} className="md-ul">
              {b.items.map((it, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
              ))}
            </ul>
          );
        }
        return (
          <ol key={i} className="md-ol">
            {b.items.map((it, j) => (
              <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
            ))}
          </ol>
        );
      })}
    </>
  );
}
