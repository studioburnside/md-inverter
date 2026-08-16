"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { mdToRtf, mdToPlaintext, downloadRtf, downloadText, copyToClipboard, copyRtfToClipboard } from "@/lib/markdown-to-rtf";
import { MarkdownPreview } from "@/lib/markdown-preview";

const SAMPLE_MARKDOWN = `# Heading 1

This is a paragraph with **bold** and *italic* text.

## Heading 2

- Unordered list item one
- Unordered list item two
- With **bold** formatting

1. Ordered list item one
2. Ordered list item two

> This is a blockquote with \`inline code\`.

\`\`\`python
def hello():
    print("Hello, World!")
\`\`\`

A paragraph with ~~strikethrough~~ text.

[Link text](https://example.com) — and here's \`inline code\`.

---

Final paragraph.`;

// Free tier limits
const DAILY_LIMIT = 1;     // 1 free pro conversion per day
const MONTHLY_LIMIT = 20;  // 20 free pro conversions per month
const LICENSE_KEY = "mdinvert_licensed_input";
const STRIPE_URL = "https://buy.stripe.com/test_4gobV9bRzduFb0I3UU";

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDailyCount() {
  return parseInt(localStorage.getItem(`mdinvert_daily_${getTodayKey()}`) || "0", 10);
}

function getMonthlyCount() {
  return parseInt(localStorage.getItem(`mdinvert_monthly_${getMonthKey()}`) || "0", 10);
}

function incrementCounts() {
  localStorage.setItem(`mdinvert_daily_${getTodayKey()}`, String(getDailyCount() + 1));
  localStorage.setItem(`mdinvert_monthly_${getMonthKey()}`, String(getMonthlyCount() + 1));
}

/* ---------- word diff (for the "why can't I copy" highlight) ----------
   LCS over word tokens; marks tokens in the CURRENT text that are not
   part of the licensed conversion. Capped for very large inputs. */
type DiffTok = { s: string; changed: boolean };

function wordDiff(licensed: string, current: string): { toks: DiffTok[]; changes: number } | null {
  const a = licensed.split(/(\s+)/);
  const b = current.split(/(\s+)/);
  if (a.length * b.length > 4_000_000) return null; // too big — banner only
  const n = a.length, m = b.length;
  const dp: Uint32Array[] = [];
  for (let i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const toks: DiffTok[] = [];
  let i = 0, j = 0, changes = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { toks.push({ s: b[j], changed: false }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { i++; if (a[i - 1].trim()) changes++; } // deletion
    else { toks.push({ s: b[j], changed: true }); if (b[j].trim()) changes++; j++; }
  }
  while (j < m) { toks.push({ s: b[j], changed: true }); if (b[j].trim()) changes++; j++; }
  while (i < n) { if (a[i].trim()) changes++; i++; }
  return { toks, changes };
}

type ModalKind = null | "quota" | "quota-edited" | "bulk";

export default function Converter() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [outputFormat, setOutputFormat] = useState<"rtf" | "text" | "both">("rtf");
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const [isPremium, setIsPremium] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [fileName, setFileName] = useState("document");
  const [dailyCount, setDailyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [licensed, setLicensed] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [copied, setCopied] = useState(false);
  const mirrorRef = useRef<HTMLPreElement>(null);

  // Premium status (Stripe redirect flow + stored)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("premium") === "true") {
      setIsPremium(true);
      localStorage.setItem("mdinvert_premium", "true");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (localStorage.getItem("mdinvert_premium") === "true") {
      setIsPremium(true);
    }
  }, []);

  // Usage counts + the licensed conversion snapshot
  useEffect(() => {
    setDailyCount(getDailyCount());
    setMonthlyCount(getMonthlyCount());
    setLicensed(localStorage.getItem(LICENSE_KEY));
  }, []);

  const dailyRemaining = Math.max(0, DAILY_LIMIT - dailyCount);
  const monthlyRemaining = Math.max(0, MONTHLY_LIMIT - monthlyCount);
  const quotaLeft = dailyRemaining > 0 && monthlyRemaining > 0;
  const isLicensedCurrent = licensed !== null && markdown === licensed;
  // Free user, out of quota, sitting on an EDITED copy of their licensed conversion:
  const blockedByEdits = !isPremium && !quotaLeft && licensed !== null && markdown !== licensed;

  const diff = useMemo(
    () => (blockedByEdits ? wordDiff(licensed as string, markdown) : null),
    [blockedByEdits, licensed, markdown]
  );

  // Outputs
  const rtfContent = mdToRtf(markdown);
  const textContent = mdToPlaintext(markdown);

  /* The quota model: a pro action is allowed if premium, OR the editor is
     byte-identical to the already-licensed conversion (re-copying is free),
     OR quota remains (which licenses the current input). */
  const tryProAction = useCallback((): boolean => {
    if (isPremium) return true;
    if (isLicensedCurrent) return true;
    if (quotaLeft) {
      incrementCounts();
      setDailyCount(getDailyCount());
      setMonthlyCount(getMonthlyCount());
      localStorage.setItem(LICENSE_KEY, markdown);
      setLicensed(markdown);
      return true;
    }
    setModal(licensed !== null ? "quota-edited" : "quota");
    return false;
  }, [isPremium, isLicensedCurrent, quotaLeft, markdown, licensed]);

  const flashCopied = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };

  const handleDownload = useCallback(() => {
    if ((outputFormat === "rtf" || outputFormat === "both") && !tryProAction()) return;
    if (outputFormat === "rtf" || outputFormat === "both") downloadRtf(rtfContent, `${fileName}.rtf`);
    if (outputFormat === "text" || outputFormat === "both") downloadText(textContent, `${fileName}.txt`);
  }, [outputFormat, rtfContent, textContent, fileName, tryProAction]);

  const handleCopyRtf = useCallback(async () => {
    if (!tryProAction()) return;
    await copyRtfToClipboard(rtfContent, textContent);
    flashCopied();
  }, [rtfContent, textContent, tryProAction]);

  const handleCopyText = useCallback(async () => {
    await copyToClipboard(textContent); // plaintext is always free
    flashCopied();
  }, [textContent]);

  const handleBulk = useCallback(() => {
    if (!isPremium) { setModal("bulk"); return; }
    const chunks = markdown.split(/\n\n\n+/).filter(c => c.trim());
    if (outputFormat === "rtf" || outputFormat === "both") {
      chunks.forEach((chunk, i) => downloadRtf(mdToRtf(chunk), `${fileName}-${i + 1}.rtf`));
    }
  }, [markdown, outputFormat, fileName, isPremium]);

  const revertToLicensed = useCallback(() => {
    if (licensed !== null) { setMarkdown(licensed); setModal(null); }
  }, [licensed]);

  // Output pane is locked for free users: the Copy button is the only door.
  const lockOutput = !isPremium;
  const blockEvent = (e: React.SyntheticEvent) => { if (lockOutput) e.preventDefault(); };

  const syncMirror = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (mirrorRef.current) {
      mirrorRef.current.scrollTop = e.currentTarget.scrollTop;
      mirrorRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="conv-shell">
      {/* Toolbar */}
      <div className="conv-toolbar">
        <div className="left">
          <div className="seg" role="group" aria-label="Output format">
            <button aria-pressed={outputFormat === "rtf"} onClick={() => setOutputFormat("rtf")}>.rtf</button>
            <button aria-pressed={outputFormat === "text"} onClick={() => setOutputFormat("text")}>.txt</button>
            <button aria-pressed={outputFormat === "both"} onClick={() => setOutputFormat("both")}>both</button>
          </div>
          {isPremium ? (
            <span className="chip chip-premium">● premium — unlimited</span>
          ) : isLicensedCurrent && !quotaLeft ? (
            <span className="chip chip-ok">✓ this conversion is yours — copy it anytime</span>
          ) : (
            <span className="chip chip-free">free · {dailyRemaining}/{DAILY_LIMIT} today · {monthlyRemaining}/{MONTHLY_LIMIT} this month</span>
          )}
        </div>
        <div className="right">
          {isPremium && (
            <>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="mdi-input"
                placeholder="filename"
                aria-label="Output filename"
              />
              <label className="mdi-check">
                <input type="checkbox" checked={bulkMode} onChange={(e) => setBulkMode(e.target.checked)} />
                bulk
              </label>
            </>
          )}
          {outputFormat !== "both" && (
            <button
              onClick={outputFormat === "rtf" ? handleCopyRtf : handleCopyText}
              className="btn btn-ghost btn-sm"
              title={outputFormat === "rtf" && !isPremium ? "RTF copy licenses this exact text — re-copy it as often as you like" : ""}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          )}
          <button onClick={bulkMode && isPremium ? handleBulk : handleDownload} className="btn btn-blue btn-sm">
            Download{outputFormat === "both" ? " all" : ""}
          </button>
        </div>
      </div>

      {/* Edits-block banner: exactly why copy is blocked, and the two ways out */}
      {blockedByEdits && (
        <div className="diff-banner" role="status">
          <span>
            <b>{diff ? diff.changes : "Some"} change{diff && diff.changes === 1 ? "" : "s"}</b> since your converted
            version — the <mark className="mdiff demo">highlights</mark> below block re-copying on the free tier.
          </span>
          <span className="acts">
            <button className="btn btn-ghost btn-sm" onClick={revertToLicensed}>Revert my edits</button>
            <a className="btn btn-quill btn-sm" href={STRIPE_URL}>Go Premium — $9</a>
          </span>
        </div>
      )}

      {/* Two worlds */}
      <div className="conv-grid">
        {/* Ink: markdown in */}
        <div className="conv-col ink">
          <div className="bar">
            <span>markdown in</span>
            <button onClick={() => setMarkdown(SAMPLE_MARKDOWN)} className="btn btn-ghost btn-sm" style={{ textTransform: "none", letterSpacing: 0 }}>
              Load example
            </button>
          </div>
          <div className="editor-stack">
            {blockedByEdits && diff && (
              <pre ref={mirrorRef} className="editor-mirror" aria-hidden="true">
                {diff.toks.map((t, i) => (t.changed ? <mark key={i} className="mdiff">{t.s}</mark> : t.s))}
              </pre>
            )}
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              onScroll={syncMirror}
              className={"conv-input" + (blockedByEdits && diff ? " diffing" : "")}
              placeholder="Paste your Markdown here…"
              spellCheck={false}
              aria-label="Markdown input"
            />
          </div>
          {!isPremium && !blockedByEdits && (
            <div className="conv-quota">
              {isLicensedCurrent && !quotaLeft
                ? <>this exact text is your licensed conversion — <b>copy and download it freely</b></>
                : <>free tier: {dailyRemaining} of {DAILY_LIMIT} pro conversion{s(dailyRemaining)} today · {monthlyRemaining} of {MONTHLY_LIMIT} this month<b> · plaintext is always free</b></>}
            </div>
          )}
        </div>

        {/* Paper: rich text out */}
        <div
          className={"conv-col paper" + (lockOutput ? " locked" : "")}
          onCopy={blockEvent}
          onCut={blockEvent}
          onContextMenu={blockEvent}
        >
          <div className="bar">
            <span>
              {outputFormat === "rtf" ? "rich text out (.rtf)" : outputFormat === "text" ? "plaintext out (.txt)" : "both outputs"}
            </span>
            {outputFormat === "rtf" && (
              <span className="ptabs" role="group" aria-label="Output view">
                <button aria-pressed={viewMode === "preview"} onClick={() => setViewMode("preview")}>preview</button>
                <button aria-pressed={viewMode === "source"} onClick={() => setViewMode("source")}>source</button>
              </span>
            )}
          </div>

          {outputFormat === "rtf" && viewMode === "preview" && (
            <div className="conv-output as-doc" aria-label="Formatted preview of the RTF output">
              <MarkdownPreview markdown={markdown} />
            </div>
          )}

          {outputFormat === "rtf" && viewMode === "source" && (
            <pre className="conv-output" aria-label="RTF source">{rtfContent}</pre>
          )}

          {outputFormat === "text" && (
            <pre className="conv-output" aria-label="Plaintext output">{textContent}</pre>
          )}

          {outputFormat === "both" && (
            <div>
              <pre className="conv-output half" aria-label="RTF source (truncated)">
                {rtfContent.substring(0, 500)}
                {rtfContent.length > 500 && "\n… (truncated — download for the full file)"}
              </pre>
              <pre className="conv-output half" aria-label="Plaintext output">{textContent}</pre>
            </div>
          )}

          {lockOutput && (
            <div className="lock-hint" aria-hidden="true">output copies via the Copy button</div>
          )}
        </div>
      </div>

      {/* Upsell strip */}
      <div className="upsell">
        {!isPremium ? (
          <>
            <p className="t">
              <b>Premium — $9, once.</b> Unlimited RTF, bulk mode, custom filenames, select-anything output.
            </p>
            <button onClick={() => { window.location.href = STRIPE_URL; }} className="btn btn-quill btn-sm">
              Go Premium
            </button>
          </>
        ) : (
          <>
            <p className="t"><b>Premium active — thank you.</b> Lifetime license, all features unlocked.</p>
            <button onClick={() => setIsPremium(false)} className="btn btn-ghost btn-sm">
              Preview free tier
            </button>
          </>
        )}
      </div>

      {/* Branded moment-of-truth modal (replaces browser alerts) */}
      {modal && (
        <div className="mdi-overlay" onClick={() => setModal(null)} role="dialog" aria-modal="true" aria-label="Premium upgrade">
          <div className="mdi-modal" onClick={(e) => e.stopPropagation()}>
            <p className="kicker">
              {modal === "bulk" ? "premium feature" : "daily limit reached"}
            </p>
            <h3>
              {modal === "bulk"
                ? "Bulk mode inverts a whole folder's worth at once."
                : modal === "quota-edited"
                ? "Your edits outgrew today's free conversion."
                : "That was today's free pro conversion."}
            </h3>
            <p className="body">
              {modal === "quota-edited"
                ? "The conversion you already made is still yours — revert the highlighted edits and keep copying it. Or go Premium and never think about this again."
                : modal === "bulk"
                ? "Split by blank lines, each section becomes its own RTF file with your filename pattern. It's part of Premium, along with unlimited conversions."
                : "Come back tomorrow for another — or make it unlimited, forever, for less than lunch."}
            </p>
            <ul className="perks">
              <li>Unlimited RTF conversions &amp; clipboard copy</li>
              <li>Bulk mode &amp; custom filenames</li>
              <li>Select and copy output directly</li>
              <li>$9 once — no subscription, ever</li>
            </ul>
            <div className="acts">
              {modal === "quota-edited" && (
                <button className="btn btn-ghost" onClick={revertToLicensed}>Revert my edits</button>
              )}
              <a className="btn btn-quill" href={STRIPE_URL}>Go Premium — $9</a>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                {modal === "quota" ? "Maybe tomorrow" : "Not now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function s(n: number) {
  return n === 1 ? "" : "s";
}
