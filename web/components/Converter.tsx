"use client";

import { use, useState, useEffect, useCallback } from "react";
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
    <div className="flex flex-col min-h-screen bg-[var(--bs-bg)] text-[var(--bs-creme)]">
      {/* Header */}
      <header className="border-b border-[var(--bs-burgundy)] bg-[var(--bs-surface)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--bs-gold)] rounded-lg flex items-center justify-center text-[var(--bs-bg)] font-bold text-sm">M</div>
            <h1 className="text-xl font-semibold text-[var(--bs-gold-champagne)]">.MDinverter</h1>
            <span className="text-sm text-[var(--bs-bronze)]">v2.0 online</span>
          </div>
          <div className="flex items-center gap-2">
            {isPremium && (
              <span className="text-xs px-2 py-1 bg-[var(--bs-emerald-deep)] text-[var(--bs-creme)] rounded">
                ● PREMIUM
              </span>
            )}
            {!isPremium && (
              <span className="text-xs px-2 py-1 bg-[var(--bs-royal)] text-white rounded">
                Free: {dailyRemaining}/1 today · {monthlyRemaining}/20 this month
              </span>
            )}
            <button
              onClick={() => setIsPremium(!isPremium)}
              className="text-xs px-3 py-1 bg-[var(--bs-royal)] text-white rounded hover:bg-[var(--bs-royal-deep)] transition-colors"
            >
              {isPremium ? "Free Tier" : "Go Premium — $9"}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {/* Format selector */}
        <div className="flex gap-4 mb-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="format"
              checked={outputFormat === "rtf"}
              onChange={() => setOutputFormat("rtf")}
              className="accent-[var(--bs-gold)]"
            />
            <span>RTF (.rtf)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="format"
              checked={outputFormat === "text"}
              onChange={() => setOutputFormat("text")}
              className="accent-[var(--bs-gold)]"
            />
            <span>Plaintext (.txt)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="format"
              checked={outputFormat === "both"}
              onChange={() => setOutputFormat("both")}
              className="accent-[var(--bs-gold)]"
            />
            <span>Both</span>
          </label>
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-[var(--bs-bronze)]">Markdown Input</label>
              <button
                onClick={() => setMarkdown(SAMPLE_MARKDOWN)}
                className="text-xs px-2 py-1 bg-[var(--bs-walnut)] text-[var(--bs-creme)] rounded hover:bg-[var(--bs-burgundy)] transition-colors"
              >
                Load Example
              </button>
            </div>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="w-full h-[500px] p-4 bg-[var(--bs-surface)] border border-[var(--bs-burgundy)] rounded-lg font-mono text-sm resize-none focus:outline-none focus:border-[var(--bs-gold)]"
              placeholder="Paste your Markdown here..."
              spellCheck={false}
            />
            {!isPremium && (
              <div className="mt-2 text-xs text-[var(--bs-bronze)]">
                Free tier: {dailyRemaining} of {DAILY_LIMIT} pro conversion{s(dailyRemaining)} today · {monthlyRemaining} of {MONTHLY_LIMIT} this month
                <span className="text-[var(--bs-gold)]"> · Plaintext is always free</span>
              </div>
            )}
          </div>

          {/* Output panel */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-[var(--bs-bronze)]">
                {outputFormat === "rtf" ? "RTF Output" : outputFormat === "text" ? "Plaintext Output" : "Both Outputs"}
              </label>
              <div className="flex gap-2">
                {/* File name (premium only) */}
                {isPremium && (
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="text-xs px-2 py-1 bg-[var(--bs-bg)] border border-[var(--bs-burgundy)] rounded text-[var(--bs-creme)] focus:outline-none focus:border-[var(--bs-gold)]"
                    placeholder="filename"
                  />
                )}
                {/* Copy button — RTF copy is pro, plaintext copy is free */}
                {outputFormat !== "both" && (
                  <button
                    onClick={outputFormat === "rtf" ? handleCopyRtf : handleCopyText}
                    className={`text-xs px-3 py-1 rounded transition-colors
                      ${outputFormat === "rtf" && !isPremium
                        ? "bg-[var(--bs-walnut)] text-[var(--bs-creme)] hover:bg-[var(--bs-burgundy)]"
                        : "bg-[var(--bs-walnut)] text-[var(--bs-creme)] hover:bg-[var(--bs-burgundy)]"
                      }`}
                    title={outputFormat === "rtf" && !isPremium ? "RTF copy is a pro feature — uses 1 free conversion" : ""}
                  >
                    Copy
                  </button>
                )}
                {/* Bulk mode toggle (premium only) */}
                {isPremium && (
                  <label className="text-xs flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={bulkMode}
                      onChange={(e) => setBulkMode(e.target.checked)}
                      className="accent-[var(--bs-gold)]"
                    />
                    Bulk
                  </label>
                )}
                {/* Download button */}
                <button
                  onClick={bulkMode && isPremium ? handleBulkConvertClick : handleDownload}
                  className="text-xs px-3 py-1 bg-[var(--bs-gold)] text-[var(--bs-bg)] font-medium rounded hover:bg-[var(--bs-gold-champagne)] transition-colors"
                >
                  Download {outputFormat === "both" ? "All" : ""}
                </button>
              </div>
            </div>

            {outputFormat === "rtf" && (
              <pre className="w-full h-[500px] p-4 bg-[var(--bs-surface)] border border-[var(--bs-burgundy)] rounded-lg font-mono text-xs overflow-auto resize-none text-[var(--bs-creme)]">
                {rtfContent}
              </pre>
            )}

            {outputFormat === "text" && (
              <pre className="w-full h-[500px] p-4 bg-[var(--bs-surface)] border border-[var(--bs-burgundy)] rounded-lg font-mono text-sm overflow-auto resize-none text-[var(--bs-creme)]">
                {textContent}
              </pre>
            )}

            {outputFormat === "both" && (
              <div className="space-y-4 h-[500px]">
                <div className="h-1/2">
                  <div className="text-xs text-[var(--bs-bronze)] mb-1">RTF:</div>
                  <pre className="w-full h-[240px] p-3 bg-[var(--bs-bg)] border border-[var(--bs-burgundy)] rounded-lg font-mono text-xs overflow-auto text-[var(--bs-creme)]">
                    {rtfContent.substring(0, 500)}
                    {rtfContent.length > 500 && "\n... (truncated)"}
                  </pre>
                </div>
                <div className="h-1/2">
                  <div className="text-xs text-[var(--bs-bronze)] mb-1">Plaintext:</div>
                  <pre className="w-full h-[240px] p-3 bg-[var(--bs-bg)] border border-[var(--bs-burgundy)] rounded-lg font-mono text-sm overflow-auto text-[var(--bs-creme)]">
                    {textContent}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer with premium upsell */}
      <footer className="border-t border-[var(--bs-burgundy)] bg-[var(--bs-surface)] mt-8">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {!isPremium ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[var(--bs-gold-champagne)] font-semibold mb-1">Unlock Premium — $9 one-time</h3>
                <p className="text-sm text-[var(--bs-bronze)]">
                  Unlimited pro conversions, bulk mode, custom filenames, RTF clipboard copy.
                  You get {DAILY_LIMIT} free pro conversion{s(DAILY_LIMIT)} per day ({MONTHLY_LIMIT} per month) —
                  or upgrade for unlimited.
                </p>
              </div>
              <button
                onClick={() => {
                  window.location.href = "https://buy.stripe.com/test_4gobV9bRzduFb0I3UU";
                }}
                className="px-6 py-2 bg-[var(--bs-emerald)] text-[var(--bs-bg)] font-medium rounded-lg hover:bg-[var(--bs-emerald-deep)] transition-colors"
              >
                Go Premium
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[var(--bs-emerald)]">●</span>
                <span className="text-[var(--bs-creme)] font-medium">Premium active — thank you!</span>
              </div>
              <span className="text-sm text-[var(--bs-bronze)]">Lifetime license • All features unlocked</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

function s(n: number) {
  return n === 1 ? "" : "s";
}