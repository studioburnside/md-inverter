// markdown-to-rtf.ts — Core Markdown → RTF conversion logic
// Ported from md-inverter/md_inverter.py (Python 3)
// Pure TypeScript, no external deps, runs in browser

// ─── Plain text conversion (regex-based fallback, zero deps) ──────────────

export function mdToPlaintext(md: string): string {
  let t = md;

  // Strip headings
  t = t.replace(/^#{1,6}\s+/gm, "");
  // Strip bold/italic/strikethrough
  t = t.replace(/\*\*(.+?)\*\*/g, "$1");
  t = t.replace(/__(.+?)__/g, "$1");
  t = t.replace(/\*(.+?)\*/g, "$1");
  t = t.replace(/_(.+?)_/g, "$1");
  t = t.replace(/~~(.+?)~~/g, "$1");
  // Strip code blocks (triple backtick)
  t = t.replace(/```[\s\S]*?```/g, "");
  // Strip inline code
  t = t.replace(/`(.+?)`/g, "$1");
  // Strip images (keep alt text)
  t = t.replace(/!\[.*?\]\(.*?\)/g, "");
  // Strip link formatting, keep link text
  t = t.replace(/\[(.+?)\]\(.*?\)/g, "$1");
  // Strip list markers
  t = t.replace(/^[-*+]\s+/gm, "");
  t = t.replace(/^\d+\.\s+/gm, "");
  // Strip blockquote markers
  t = t.replace(/^>\s?/gm, "");
  // Strip horizontal rules
  t = t.replace(/^---$/gm, "");
  // Collapse excessive newlines
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// ─── RTF utilities ──────────────────────────────────────────────────────

function rtfEscape(s: string): string {
  // Escape RTF special characters and encode non-ASCII as \uN
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (ch === "\\") {
      out += "\\\\";
    } else if (ch === "{") {
      out += "\\{";
    } else if (ch === "}") {
      out += "\\}";
    } else if (code > 127) {
      // Use a space as the RTF fallback character (instead of '?')
      // so Unicode chars like em-dash render correctly
      out += `\\u${code} `;
    } else {
      out += ch;
    }
  }
  return out;
}

// Inline markdown → RTF with proper escaping
function inlineRtf(text: string): string {
  // Use sentinel approach: replace markdown spans with placeholders,
  // escape plain text, then restore RTF spans
  const PLACEHOLDER = "\x00RTF\x00";
  const spans: string[] = [];

  function store(rtfChunk: string): string {
    spans.push(rtfChunk);
    return PLACEHOLDER;
  }

  let working = text;

  // Bold: **text** or __text__
  working = working.replace(/\*\*(.+?)\*\*/g, (_, inner) => store(`{\\b ${rtfEscape(inner)}}`));
  working = working.replace(/__(.+?)__/g, (_, inner) => store(`{\\b ${rtfEscape(inner)}}`));
  // Italic: *text* or _text_
  working = working.replace(/\*(.+?)\*/g, (_, inner) => store(`{\\i ${rtfEscape(inner)}}`));
  working = working.replace(/_(.+?)_/g, (_, inner) => store(`{\\i ${rtfEscape(inner)}}`));
  // Strikethrough: ~~text~~
  working = working.replace(/~~(.+?)~~/g, (_, inner) => store(`{\\strike ${rtfEscape(inner)}}`));
  // Inline code: `text`
  working = working.replace(/`(.+?)`/g, (_, inner) => store(`{\\f1\\fs22 ${rtfEscape(inner)}}`));
  // Links: [text](url) → keep text only
  working = working.replace(/\[(.+?)\]\(.*?\)/g, (_, inner) => store(rtfEscape(inner)));

  // Escape all plain-text segments (everything between placeholders)
  const parts = working.split(PLACEHOLDER);
  const escapedParts = parts.map((p) => rtfEscape(p));

  // Reassemble: interleave escaped plain text with stored RTF spans
  const result: string[] = [];
  for (let i = 0; i < escapedParts.length; i++) {
    result.push(escapedParts[i]);
    if (i < spans.length) {
      result.push(spans[i]);
    }
  }
  return result.join("");
}

// ─── Markdown → RTF ─────────────────────────────────────────────────────

export function mdToRtf(md: string): string {
  const lines = md.split("\n");
  const parts: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");

    // Code fence detection
    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeBuf = [];
      } else {
        inCode = false;
        const escaped = rtfEscape(codeBuf.join("\n")).replace(/\n/g, "\\line\n");
        parts.push(`{\\pard\\f1\\fs20 ${escaped}\\par}`);
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // Heading: # through ######
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizes: Record<number, number> = { 1: 36, 2: 30, 3: 26, 4: 22, 5: 20, 6: 18 };
      const fs = sizes[level] || 24;
      parts.push(`{\\pard\\sb240\\sa120\\b\\fs${fs} ${inlineRtf(headingMatch[2])}\\par}`);
      continue;
    }

    // Horizontal rule: --- or *** or ___
    if (/^[-*_]{3,}$/.test(line)) {
      parts.push("{\\pard\\brdrb\\brdrs\\brdrw10\\brsp20 \\par}");
      continue;
    }

    // Blockquote: > text
    const bqMatch = line.match(/^>\s?(.*)/);
    if (bqMatch) {
      parts.push(`{\\pard\\li720\\ri720\\i ${inlineRtf(bqMatch[1])}\\par}`);
      continue;
    }

    // Unordered list: - or * or +
    const ulMatch = line.match(/^[-*+]\s+(.*)/);
    if (ulMatch) {
      parts.push(`{\\pard\\li360\\fi-360\\bullet\\tx360\\tab ${inlineRtf(ulMatch[1])}\\par}`);
      continue;
    }

    // Ordered list: 1. 2. etc.
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      parts.push(`{\\pard\\li360\\fi-360 ${rtfEscape(olMatch[1])}.\\tab ${inlineRtf(olMatch[2])}\\par}`);
      continue;
    }

    // Blank line
    if (!line) {
      parts.push("{\\pard\\sa80\\par}");
      continue;
    }

    // Regular paragraph
    parts.push(`{\\pard\\sa120 ${inlineRtf(line)}\\par}`);
  }

  // Close any unclosed code block
  if (inCode && codeBuf.length > 0) {
    const escaped = rtfEscape(codeBuf.join("\n")).replace(/\n/g, "\\line\n");
    parts.push(`{\\pard\\f1\\fs20 ${escaped}\\par}`);
  }

  // Assemble full RTF document
  const body = parts.join("\n");
  const fontSize = 24; // 12pt * 2 (RTF uses half-points)
  return (
    "{\\rtf1\\ansi\\ansicpg1252\\uc1\\cocoartf2639" +
    "{\\fonttbl{\\f0\\fswiss\\fcharset0 Helvetica Neue;}{\\f1\\fmodern\\fcharset0 Courier New;}}" +
    "{\\colortbl;\\red0\\green0\\blue0;}" +
    "\\paperw12240\\paperh15840\\margl1440\\margr1440" +
    `\n\\f0\\fs${fontSize} \\cf1 \n` +
    body +
    "\n}"
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────

export function downloadRtf(rtfContent: string, filename: string): void {
  const blob = new Blob([rtfContent], { type: "application/rtf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyRtfToClipboard(rtfContent: string, fallbackText: string = ""): Promise<boolean> {
  try {
    // Modern Clipboard API supports custom MIME types in some browsers
    const blob = new Blob([rtfContent], { type: "application/rtf" });
    await navigator.clipboard.write([
      new ClipboardItem({ "application/rtf": blob })
    ]);
    return true;
  } catch {
    // Fallback: copy plain text
    if (fallbackText) {
      await navigator.clipboard.writeText(fallbackText);
    }
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}