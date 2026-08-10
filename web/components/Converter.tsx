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

export default function Converter() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [outputFormat, setOutputFormat] = useState<"rtf" | "text" | "both">("rtf");
  const [isPremium, setIsPremium] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [fileName, setFileName] = useState("document");

  // Generate outputs
  const rtfContent = mdToRtf(markdown);
  const textContent = mdToPlaintext(markdown);

  // Check for premium status from URL (for Stripe redirect flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("premium") === "true") {
      setIsPremium(true);
      // Store in localStorage
      localStorage.setItem("mdinvert_premium", "true");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const stored = localStorage.getItem("mdinvert_premium");
      if (stored === "true") setIsPremium(true);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (outputFormat === "rtf" || outputFormat === "both") {
      downloadRtf(rtfContent, `${fileName}.rtf`);
    }
    if (outputFormat === "text" || outputFormat === "both") {
      downloadText(textContent, `${fileName}.txt`);
    }
  }, [outputFormat, rtfContent, textContent, fileName]);

  const handleCopyRtf = useCallback(async () => {
    const success = await copyRtfToClipboard(rtfContent, textContent);
    if (!success) {
      // Fallback already handled inside the function
    }
  }, [rtfContent, textContent]);

  const handleCopyText = useCallback(async () => {
    await copyToClipboard(textContent);
  }, [textContent]);

  const handleBulkConvert = useCallback(() => {
    // Split by triple newline for batch conversion
    const chunks = markdown.split(/\n\n\n+/).filter(c => c.trim());
    if (outputFormat === "rtf" || outputFormat === "both") {
      chunks.forEach((chunk, i) => {
        downloadRtf(mdToRtf(chunk), `${fileName}-${i + 1}.rtf`);
      });
    }
  }, [markdown, outputFormat, fileName]);

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
                {/* Copy button */}
                {outputFormat !== "both" && (
                  <button
                    onClick={outputFormat === "rtf" ? handleCopyRtf : handleCopyText}
                    className="text-xs px-3 py-1 bg-[var(--bs-walnut)] text-[var(--bs-creme)] rounded hover:bg-[var(--bs-burgundy)] transition-colors"
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
                  onClick={bulkMode && isPremium ? handleBulkConvert : handleDownload}
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
                <p className="text-sm text-[var(--bs-bronze)]">Bulk conversion, custom filenames, copy RTF to clipboard. Forever updates included.</p>
              </div>
              <button
                onClick={() => {
                  // Stripe Checkout redirect (replace with real product ID)
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

// Extend Window for the fallback copyRtfToClipboard function
declare global {
  interface Window {
    MD_INPUT?: string;
  }
}