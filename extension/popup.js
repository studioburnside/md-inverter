// popup.js — Browser extension popup logic

// --- Inline RTF converter (minimal, must match web version) ---

function rtfEscape(s) {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (ch === "\\") out += "\\\\";
    else if (ch === "{") out += "\\{";
    else if (ch === "}") out += "\\}";
    else if (code > 127) out += `\\u${code} `;
    else out += ch;
  }
  return out;
}

function inlineRtf(text) {
  const PH = "\x00RTF\x00";
  const spans = [];
  let t = text;
  t = t.replace(/\*\*(.+?)\*\*/g, (_, i) => { spans.push(`{\\b ${rtfEscape(i)}}`); return PH; });
  t = t.replace(/__(.+?)__/g, (_, i) => { spans.push(`{\\b ${rtfEscape(i)}}`); return PH; });
  t = t.replace(/\*(.+?)\*/g, (_, i) => { spans.push(`{\\i ${rtfEscape(i)}}`); return PH; });
  t = t.replace(/_(.+?)_/g, (_, i) => { spans.push(`{\\i ${rtfEscape(i)}}`); return PH; });
  t = t.replace(/~~(.+?)~~/g, (_, i) => { spans.push(`{\\strike ${rtfEscape(i)}}`); return PH; });
  t = t.replace(/`(.+?)`/g, (_, i) => { spans.push(`{\\f1\\fs22 ${rtfEscape(i)}}`); return PH; });
  t = t.replace(/\[(.+?)\]\(.*?\)/g, (_, i) => { spans.push(rtfEscape(i)); return PH; });
  const parts = t.split(PH);
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    result += rtfEscape(parts[i]);
    if (i < spans.length) result += spans[i];
  }
  return result;
}

function mdToRtf(md) {
  const lines = md.split("\n");
  const parts = [];
  let inCode = false;
  let codeBuf = [];
  const sizes = { 1: 36, 2: 30, 3: 26, 4: 22, 5: 20, 6: 18 };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (line.startsWith("```")) {
      if (!inCode) { inCode = true; codeBuf = []; }
      else {
        inCode = false;
        const escaped = rtfEscape(codeBuf.join("\n")).replace(/\n/g, "\\line\n");
        parts.push(`{\\pard\\f1\\fs20 ${escaped}\\par}`);
      }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const fs = sizes[level] || 24;
      parts.push(`{\\pard\\sb240\\sa120\\b\\fs${fs} ${inlineRtf(headingMatch[2])}\\par}`);
      continue;
    }
    if (/^[-*_]{3,}$/.test(line)) {
      parts.push("{\\pard\\brdrb\\brdrs\\brdrw10\\brsp20 \\par}");
      continue;
    }
    const bqMatch = line.match(/^>\s?(.*)/);
    if (bqMatch) {
      parts.push(`{\\pard\\li720\\ri720\\i ${inlineRtf(bqMatch[1])}\\par}`);
      continue;
    }
    const ulMatch = line.match(/^[-*+]\s+(.*)/);
    if (ulMatch) {
      parts.push(`{\\pard\\li360\\fi-360\\bullet\\tx360\\tab ${inlineRtf(ulMatch[1])}\\par}`);
      continue;
    }
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      parts.push(`{\\pard\\li360\\fi-360 ${rtfEscape(olMatch[1])}.\\tab ${inlineRtf(olMatch[2])}\\par}`);
      continue;
    }
    if (!line) { parts.push("{\\pard\\sa80\\par}"); continue; }
    parts.push(`{\\pard\\sa120 ${inlineRtf(line)}\\par}`);
  }
  if (inCode && codeBuf.length > 0) {
    const escaped = rtfEscape(codeBuf.join("\n")).replace(/\n/g, "\\line\n");
    parts.push(`{\\pard\\f1\\fs20 ${escaped}\\par}`);
  }

  return (
    "{\\rtf1\\ansi\\ansicpg1252\\uc1\\cocoartf2639" +
    "{\\fonttbl{\\f0\\fswiss\\fcharset0 Helvetica Neue;}{\\f1\\fmodern\\fcharset0 Courier New;}}" +
    "{\\colortbl;\\red0\\green0\\blue0;}" +
    "\\paperw12240\\paperh15840\\margl1440\\margr1440" +
    `\n\\f0\\fs24 \\cf1 \n` +
    parts.join("\n") +
    "\n}"
  );
}

function mdToPlaintext(md) {
  let t = md;
  t = t.replace(/^#{1,6}\s+/gm, "");
  t = t.replace(/\*\*(.+?)\*\*/g, "$1");
  t = t.replace(/__(.+?)__/g, "$1");
  t = t.replace(/\*(.+?)\*/g, "$1");
  t = t.replace(/_(.+?)_/g, "$1");
  t = t.replace(/~~(.+?)~~/g, "$1");
  t = t.replace(/```[\s\S]*?```/g, "");
  t = t.replace(/`(.+?)`/g, "$1");
  t = t.replace(/!\[.*?\]\(.*?\)/g, "");
  t = t.replace(/\[(.+?)\]\(.*?\)/g, "$1");
  t = t.replace(/^[-*+]\s+/gm, "");
  t = t.replace(/^\d+\.\s+/gm, "");
  t = t.replace(/^>\s?/gm, "");
  t = t.replace(/^---$/gm, "");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// --- Extension logic ---

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showStatus("Copied to clipboard!");
  } catch (e) {
    showStatus("Copy failed. Please copy manually.");
  }
}

async function copyRtf(rtf) {
  try {
    const blob = new Blob([rtf], { type: "application/rtf" });
    await navigator.clipboard.write([new ClipboardItem({ "application/rtf": blob })]);
    showStatus("RTF copied!");
  } catch (e) {
    showStatus("RTF copy failed (browser unsupported). Try the web app.");
  }
}

function showStatus(msg) {
  const existing = document.getElementById("status");
  if (existing) existing.remove();
  const div = document.createElement("div");
  div.id = "status";
  div.style.cssText = "position:fixed;top:8px;right:8px;background:#50c878;color:#17090e;padding:6px 10px;border-radius:4px;font-size:11px;font-weight:600;z-index:9999;";
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

async function convert(format) {
  const input = document.getElementById("md-input").value;
  if (!input.trim()) {
    showStatus("Please enter some Markdown first.");
    return;
  }
  if (format === "rtf") {
    await copyRtf(mdToRtf(input));
  } else if (format === "text") {
    await copyText(mdToPlaintext(input));
  } else if (format === "both") {
    await copyRtf(mdToRtf(input));
    await copyText(mdToPlaintext(input));
  }
}

// Context menu — right-click on selected text
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "convert-md-rtf",
    title: "Convert to RTF with .MDinverter",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "convert-md-text",
    title: "Convert to Plaintext with .MDinverter",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.selectionText) return;
  if (info.menuItemId === "convert-md-rtf") {
    const rtf = mdToRtf(info.selectionText);
    copyRtf(rtf);
  } else if (info.menuItemId === "convert-md-text") {
    const text = mdToPlaintext(info.selectionText);
    copyText(text);
  }
});