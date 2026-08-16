"use client";

import { useState, useEffect, useCallback } from "react";
import { mdToRtf, mdToPlaintext, downloadRtf, downloadText, copyToClipboard, copyRtfToClipboard } from "@/lib/markdown-to-rtf";

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

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDailyCount() {
  const key = `mdinvert_daily_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || "0", 10);
}

function getMonthlyCount() {
  const key = `mdinvert_monthly_${getMonthKey()}`;
  return parseInt(localStorage.getItem(key) || "0", 10);
}

function incrementDaily() {
  const key = `mdinvert_daily_${getTodayKey()}`;
  const count = getDailyCount();
  localStorage.setItem(key, String(count + 1));
}

function incrementMonthly() {
  const key = `mdinvert_monthly_${getMonthKey()}`;
  const count = getMonthlyCount();
  localStorage.setItem(key, String(count + 1));
}

export default function Converter() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [outputFormat, setOutputFormat] = useState<"rtf" | "text" | "both">("rtf");
  const [isPremium, setIsPremium] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [fileName, setFileName] = useState("document");
  const [dailyCount, setDailyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [conversionUsed, setConversionUsed] = useState(false);

  // Check for premium status from URL (for Stripe redirect flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("premium") === "true") {
      setIsPremium(true);
      localStorage.setItem("mdinvert_premium", "true");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const stored = localStorage.getItem("mdinvert_premium");
      if (stored === "true") setIsPremium(true);
    }
  }, []);

  // Load usage counts
  useEffect(() => {
    setDailyCount(getDailyCount());
    setMonthlyCount(getMonthlyCount());
  }, []);

  // Determine if free-tier user can still do a pro conversion today
  const canUseFreePro = !isPremium && !conversionUsed && dailyCount < DAILY_LIMIT && monthlyCount < MONTHLY_LIMIT;
  const freeProExhausted = !isPremium && !canUseFreePro;
  const dailyRemaining = DAILY_LIMIT - dailyCount;
  const monthlyRemaining = MONTHLY_LIMIT - monthlyCount;

  // Generate outputs
  const rtfContent = mdToRtf(markdown);
  const textContent = mdToPlaintext(markdown);

  const handleDownload = useCallback(() => {
    // Free tier: allow basic conversion always, but "pro" features (bulk, custom filename, RTF copy) consume quota
    if (!isPremium && (outputFormat === "rtf" || outputFormat === "both")) {
      // RTF download is a "pro" feature
      if (canUseFreePro) {
        incrementDaily();
        incrementMonthly();
        setDailyCount(getDailyCount());
        setMonthlyCount(getMonthlyCount());
        setConversionUsed(true);
      } else {
        alert(
          `You've used your free pro conversion quota.\n` +
          `Daily remaining: ${dailyRemaining}/${DAILY_LIMIT}\n` +
          `Monthly remaining: ${monthlyRemaining}/${MONTHLY_LIMIT}\n\n` +
          `Upgrade to Premium for unlimited conversions!`
        );
        return;
      }
    }

    if (outputFormat === "rtf" || outputFormat === "both") {
      downloadRtf(rtfContent, `${fileName}.rtf`);
    }
    if (outputFormat === "text" || outputFormat === "both") {
      downloadText(textContent, `${fileName}.txt`);
    }
  }, [outputFormat, rtfContent, textContent, fileName, isPremium, canUseFreePro, dailyCount, monthlyCount]);

  const handleCopyRtf = useCallback(async () => {
    // RTF clipboard copy is a "pro" feature
    if (!isPremium) {
      if (canUseFreePro) {
        incrementDaily();
        incrementMonthly();
        setDailyCount(getDailyCount());
        setMonthlyCount(getMonthlyCount());
        setConversionUsed(true);
      } else {
        alert(
          `You've used your free pro conversion quota.\n` +
          `Daily remaining: ${dailyRemaining}/${DAILY_LIMIT}\n` +
          `Monthly remaining: ${monthlyRemaining}/${MONTHLY_LIMIT}\n\n` +
          `Upgrade to Premium for unlimited conversions!`
        );
        return;
      }
    }
    const success = await copyRtfToClipboard(rtfContent, textContent);
    if (!success) {
      // Fallback already handled inside the function
    }
  }, [rtfContent, textContent, isPremium, canUseFreePro, dailyCount, monthlyCount]);

  const handleCopyText = useCallback(async () => {
    // Plaintext copy is free
    await copyToClipboard(textContent);
  }, [textContent]);

  const handleBulkConvert = useCallback(() => {
    // Bulk conversion is premium only
    if (!isPremium) {
      alert("Bulk conversion is a Premium feature. Upgrade for $9 one-time.");
      return;
    }
    const chunks = markdown.split(/\n\n\n+/).filter(c => c.trim());
    if (outputFormat === "rtf" || outputFormat === "both") {
      chunks.forEach((chunk, i) => {
        downloadRtf(mdToRtf(chunk), `${fileName}-${i + 1}.rtf`);
      });
    }
  }, [markdown, outputFormat, fileName, isPremium]);

  const handleBulkConvertClick = useCallback(() => {
    if (!isPremium && freeProExhausted) {
      alert("Bulk conversion requires Premium. Upgrade for $9 one-time.");
      return;
    }
    handleBulkConvert();
  }, [isPremium, freeProExhausted, handleBulkConvert]);

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
                <input
                  type="checkbox"
                  checked={bulkMode}
                  onChange={(e) => setBulkMode(e.target.checked)}
                />
                bulk
              </label>
            </>
          )}
          {outputFormat !== "both" && (
            <button
              onClick={outputFormat === "rtf" ? handleCopyRtf : handleCopyText}
              className="btn btn-ghost btn-sm"
              title={outputFormat === "rtf" && !isPremium ? "RTF copy is a pro feature — uses 1 free conversion" : ""}
            >
              Copy
            </button>
          )}
          <button
            onClick={bulkMode && isPremium ? handleBulkConvertClick : handleDownload}
            className="btn btn-blue btn-sm"
          >
            Download{outputFormat === "both" ? " all" : ""}
          </button>
        </div>
      </div>

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
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="conv-input"
            placeholder="Paste your Markdown here…"
            spellCheck={false}
            aria-label="Markdown input"
          />
          {!isPremium && (
            <div className="conv-quota">
              free tier: {dailyRemaining} of {DAILY_LIMIT} pro conversion{s(dailyRemaining)} today · {monthlyRemaining} of {MONTHLY_LIMIT} this month
              <b> · plaintext is always free</b>
            </div>
          )}
        </div>

        {/* Paper: rich text out */}
        <div className="conv-col paper">
          <div className="bar">
            <span>
              {outputFormat === "rtf" ? "rich text out (.rtf)" : outputFormat === "text" ? "plaintext out (.txt)" : "both outputs"}
            </span>
          </div>

          {outputFormat === "rtf" && (
            <pre className="conv-output" aria-label="RTF output">{rtfContent}</pre>
          )}

          {outputFormat === "text" && (
            <pre className="conv-output" aria-label="Plaintext output">{textContent}</pre>
          )}

          {outputFormat === "both" && (
            <div>
              <pre className="conv-output half" aria-label="RTF output (truncated)">
                {rtfContent.substring(0, 500)}
                {rtfContent.length > 500 && "\n… (truncated — download for the full file)"}
              </pre>
              <pre className="conv-output half" aria-label="Plaintext output">{textContent}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Upsell strip */}
      <div className="upsell">
        {!isPremium ? (
          <>
            <p className="t">
              <b>Premium — $9, once.</b> Unlimited RTF, bulk mode, custom filenames, rich-text clipboard.
            </p>
            <button
              onClick={() => { window.location.href = "https://buy.stripe.com/test_4gobV9bRzduFb0I3UU"; }}
              className="btn btn-quill btn-sm"
            >
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
    </div>
  );
}

function s(n: number) {
  return n === 1 ? "" : "s";
}
