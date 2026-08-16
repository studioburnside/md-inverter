"use client";

import { useState, useEffect } from "react";
import Converter from "@/components/Converter";

// Landing page content
const features = [
  {
    title: "Local Processing",
    description: "All conversion happens in your browser. No servers, no cloud uploads, no data leaving your machine.",
    icon: "🛡️"
  },
  {
    title: "Rich Formatting",
    description: "Headings, bold, italic, code blocks, lists, blockquotes — everything converts to properly formatted RTF.",
    icon: "🎨"
  },
  {
    title: "Browser Extension",
    description: "Convert Markdown from any webpage instantly with a right-click using our browser extension.",
    icon: "⚡"
  }
];

const faqs = [
  {
    question: "Is my data safe?",
    answer: "Yes. All conversion happens locally in your browser. No data is sent to any server."
  },
  {
    question: "Do I need to sign up?",
    answer: "No signup required. Convert up to 1 document per day for free. Premium ($9 one-time) unlocks unlimited conversions."
  },
  {
    question: "What file formats are supported?",
    answer: "Convert Markdown to RTF (.rtf) or plain text (.txt). RTF files work with Pages, Word, Google Docs, and TextEdit."
  }
];

export default function LandingPage() {
  const [showConverter, setShowConverter] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-[var(--bs-surface)]/90 backdrop-blur border-b border-[var(--bs-burgundy)]" 
          : "bg-transparent"
      }`}>
        <nav className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--bs-gold)] rounded-lg flex items-center justify-center text-[var(--bs-bg)] font-bold text-sm">M</div>
            <span className="text-xl font-semibold text-[var(--bs-gold-champagne)]">.MDinverter</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => scrollTo("features")}
              className="text-sm text-[var(--bs-bronze)] hover:text-[var(--bs-creme)] transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => scrollTo("pricing")}
              className="text-sm text-[var(--bs-bronze)] hover:text-[var(--bs-creme)] transition-colors"
            >
              Pricing
            </button>
            <button 
              onClick={() => scrollTo("faq")}
              className="text-sm text-[var(--bs-bronze)] hover:text-[var(--bs-creme)] transition-colors"
            >
              FAQ
            </button>
            <button
              onClick={() => setShowConverter(true)}
              className="text-xs px-4 py-2 bg-[var(--bs-gold)] text-[var(--bs-bg)] font-medium rounded-lg hover:bg-[var(--bs-gold-champagne)] transition-colors"
            >
              Try Free
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="min-h-screen flex items-center bg-[var(--bs-bg)] pt-16">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-[var(--bs-creme)] mb-4 leading-tight">
                Convert Markdown to RTF
                <br />
                <span className="text-[var(--bs-gold)]">In your browser. No cloud.</span>
              </h1>
              <p className="text-lg text-[var(--bs-bronze)] mb-6">
                Paste Markdown and get formatted RTF ready for Pages, Word, or Google Docs. 
                Runs 100% locally — your text never leaves your machine.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowConverter(true)}
                  className="px-6 py-3 bg-[var(--bs-gold)] text-[var(--bs-bg)] font-medium rounded-lg hover:bg-[var(--bs-gold-champagne)] transition-colors flex items-center justify-center gap-2"
                >
                  Try It Free
                </button>
                <button
                  onClick={() => scrollTo("features")}
                  className="px-6 py-3 border border-[var(--bs-burgundy)] text-[var(--bs-creme)] font-medium rounded-lg hover:bg-[var(--bs-walnut)] transition-colors"
                >
                  Learn More
                </button>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-[var(--bs-bronze)]">
                <span>✓ No signup required</span>
                <span>✓ 100% private</span>
                <span>✓ Works offline</span>
              </div>
            </div>
            <div className="bg-[var(--bs-surface)] border border-[var(--bs-burgundy)] rounded-xl p-6">
              <div className="bg-[var(--bs-bg)] rounded-lg p-4 mb-4">
                <pre className="text-xs text-[var(--bs-bronze)] overflow-x-auto whitespace-pre-wrap break-all">
{`{\\rtf\\ansi\\ansicpg1252
\\b Heading 1\\b0\\par
\\i Italic text\\i0\\par
• List item 1\\par
• List item 2\\par
}`}
                </pre>
              </div>
              <div className="text-center text-sm text-[var(--bs-bronze)]">
                Example RTF output — copy &amp; paste into any rich text editor
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 bg-[var(--bs-surface)]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[var(--bs-creme)] mb-12">
            Everything you need
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-[var(--bs-gold)]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-[var(--bs-gold)] font-bold">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-[var(--bs-creme)] mb-2">{feature.title}</h3>
                <p className="text-[var(--bs-bronze)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Converter */}
      <section className="py-16 bg-[var(--bs-bg)]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[var(--bs-creme)] mb-4">
            Try it below
          </h2>
          <p className="text-center text-[var(--bs-bronze)] mb-8">
            Paste your Markdown and convert to RTF or plaintext instantly
          </p>
          {showConverter && <Converter />}
          {!showConverter && (
            <div className="text-center py-12 border border-[var(--bs-burgundy)] rounded-xl bg-[var(--bs-surface)]">
              <button
                onClick={() => setShowConverter(true)}
                className="px-6 py-3 bg-[var(--bs-gold)] text-[var(--bs-bg)] font-medium rounded-lg hover:bg-[var(--bs-gold-champagne)] transition-colors"
              >
                Show Converter
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-[var(--bs-bg)]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[var(--bs-creme)] mb-4">
            Simple pricing
          </h2>
          <p className="text-[var(--bs-bronze)] mb-12">
            Plaintext conversion is always free. Premium unlocks RTF downloads, bulk mode, and custom filenames.
          </p>
          <div className="max-w-md mx-auto bg-[var(--bs-surface)] border-2 border-[var(--bs-gold)] rounded-xl p-8">
            <h3 className="text-2xl font-bold text-[var(--bs-creme)] mb-4">Premium</h3>
            <div className="text-4xl font-bold text-[var(--bs-gold)] mb-6">$9<span className="text-lg text-[var(--bs-bronze)]">/one-time</span></div>
            <ul className="text-left mb-6 space-y-3">
              <li className="flex items-center gap-2 text-[var(--bs-creme)]">✓ Unlimited RTF conversions</li>
              <li className="flex items-center gap-2 text-[var(--bs-creme)]">✓ Bulk conversion mode</li>
              <li className="flex items-center gap-2 text-[var(--bs-creme)]">✓ Custom filenames</li>
              <li className="flex items-center gap-2 text-[var(--bs-creme)]">✓ RTF clipboard copy</li>
            </ul>
            <button
              onClick={() => {
                window.location.href = "https://buy.stripe.com/test_4gobV9bRzduFb0I3UU";
              }}
              className="w-full px-6 py-3 bg-[var(--bs-emerald)] text-[var(--bs-bg)] font-medium rounded-lg hover:bg-[var(--bs-emerald-deep)] transition-colors"
            >
              Get Premium — $9
            </button>
            <p className="text-xs text-[var(--bs-bronze)] mt-4">
              One-time payment. No subscription. Lifetime access.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 bg-[var(--bs-surface)]">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[var(--bs-creme)] mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[var(--bs-bg)] border border-[var(--bs-burgundy)] rounded-xl p-6">
                <h3 className="text-xl font-semibold text-[var(--bs-creme)] mb-2">{faq.question}</h3>
                <p className="text-[var(--bs-bronze)]">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--bs-burgundy)] bg-[var(--bs-surface)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[var(--bs-gold)] rounded flex items-center justify-center text-[var(--bs-bg)] font-bold text-xs">M</div>
            <span className="text-[var(--bs-creme)] font-semibold">.MDinverter</span>
          </div>
          <div className="text-sm text-[var(--bs-bronze)]">
            Built by studioburnside · MIT licensed
          </div>
        </div>
      </footer>
    </>
  );
}