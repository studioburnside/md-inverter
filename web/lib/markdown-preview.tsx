/* markdown-preview.tsx — VISUAL preview renderer for the paper pane.
   This is presentation only — it is NOT a fourth conversion engine.
   The three real engines (md_inverter.py / markdown-to-rtf.ts /
   extension popup.js) stay the source of truth for output bytes;
   this just shows the reader what the RTF will look like in Pages/Word. */

import React from "react";

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = text;
  let k = 0;
  const patterns: [RegExp, (m: RegExpMatchArray, key: string) => React.ReactNode][] = [
    [/^`([^`]+)`/, (m, key) => <code key={key}>{m[1]}</code>],
    [/^\*\*([^*]+)\*\*/, (m, key) => <b key={key}>{renderInline(m[1], key)}</b>],
    [/^__([^_]+)__/, (m, key) => <b key={key}>{renderInline(m[1], key)}</b>],
    [/^\*([^*]+)\*/, (m, key) => <i key={key}>{renderInline(m[1], key)}</i>],
    [/^_([^_]+)_/, (m, key) => <i key={key}>{renderInline(m[1], key)}</i>],
    [/^~~([^~]+)~~/, (m, key) => <span key={key} className="del">{renderInline(m[1], key)}</span>],
    [/^!\[([^\]]*)\]\(([^)]*)\)/, () => null],
    [/^\[([^\]]+)\]\(([^)]*)\)/, (m, key) => <span key={key}>{renderInline(m[1], key)}</span>],
  ];
  outer: while (rest.length) {
    for (const [re, build] of patterns) {
      const m = rest.match(re);
      if (m) {
        const node = build(m, `${keyBase}-${k++}`);
        if (node !== null) out.push(node);
        rest = rest.slice(m[0].length);
        continue outer;
      }
    }
    // consume plain text up to the next possible marker
    const next = rest.slice(1).search(/[`*_~[!]/);
    const take = next === -1 ? rest.length : next + 1;
    out.push(rest.slice(0, take));
    rest = rest.slice(take);
  }
  return out;
}

export function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // fenced code block
    const fence = line.match(/^```/);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```/)) { buf.push(lines[i]); i++; }
      i++; // closing fence
      blocks.push(<div key={k++} className="codeblock">{buf.join("\n")}</div>);
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const content = renderInline(h[2], `h${k}`);
      blocks.push(
        level === 1 ? <h3 key={k++}>{content}</h3> :
        level === 2 ? <h4 key={k++}>{content}</h4> :
        <h5 key={k++} style={{ margin: "0.5rem 0 0.3rem", fontSize: "1rem" }}>{content}</h5>
      );
      i++;
      continue;
    }

    // horizontal rule
    if (/^(\s*)(---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push(<hr key={k++} style={{ border: "none", borderTop: "1px solid rgba(38,33,25,.25)", margin: "0.8rem 0" }} />);
      i++;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push(<blockquote key={k++}>{renderInline(buf.join(" "), `q${k}`)}</blockquote>);
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(<li key={`li${k}-${items.length}`}>{renderInline(lines[i].replace(/^\s*[-*+]\s+/, ""), `ul${k}-${items.length}`)}</li>);
        i++;
      }
      blocks.push(<ul key={k++}>{items}</ul>);
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(<li key={`oli${k}-${items.length}`}>{renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""), `ol${k}-${items.length}`)}</li>);
        i++;
      }
      blocks.push(<ol key={k++} style={{ margin: "0.2rem 0 0.6rem 1.4rem" }}>{items}</ol>);
      continue;
    }

    // paragraph: gather until blank line
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>\s?|\s*[-*+]\s|\s*\d+\.\s)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(<p key={k++}>{renderInline(buf.join(" "), `p${k}`)}</p>);
  }

  return <div className="rich preview-doc">{blocks}</div>;
}
