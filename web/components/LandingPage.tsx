"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Converter from "@/components/Converter";

/* ============================================================
   .MDinverter landing — Fable design pass, 2026-08-16.
   The hero is the product: markdown types itself on the ink
   pane, then the inversion sweeps it onto paper as rich text.
   ============================================================ */

type Seg = { cls: "tok" | "txt" | "dim"; s: string };

const SNIPPETS: { src: Seg[]; rich: React.ReactNode[] }[] = [
  {
    src: [
      { cls: "tok", s: "# " }, { cls: "txt", s: "The pitch\n\n" },
      { cls: "txt", s: "Ship the " }, { cls: "tok", s: "**" }, { cls: "txt", s: "bold" }, { cls: "tok", s: "**" }, { cls: "txt", s: " version.\n\n" },
      { cls: "tok", s: "- " }, { cls: "txt", s: "No cloud\n" },
      { cls: "tok", s: "- " }, { cls: "txt", s: "No signup\n" },
      { cls: "tok", s: "- " }, { cls: "txt", s: "Nothing leaves the machine\n\n" },
      { cls: "tok", s: "> " }, { cls: "dim", s: "`.md`" }, { cls: "txt", s: " in — " }, { cls: "dim", s: "`.rtf`" }, { cls: "txt", s: " out." },
    ],
    rich: [
      <h3 key="h">The pitch</h3>,
      <p key="p">Ship the <b>bold</b> version.</p>,
      <ul key="u"><li>No cloud</li><li>No signup</li><li>Nothing leaves the machine</li></ul>,
      <blockquote key="q"><code>.md</code> in — <code>.rtf</code> out.</blockquote>,
    ],
  },
  {
    src: [
      { cls: "tok", s: "## " }, { cls: "txt", s: "Meeting notes\n\n" },
      { cls: "txt", s: "Decisions in " }, { cls: "tok", s: "*" }, { cls: "txt", s: "italics" }, { cls: "tok", s: "*" },
      { cls: "txt", s: ", " }, { cls: "tok", s: "~~" }, { cls: "txt", s: "cut scope" }, { cls: "tok", s: "~~" }, { cls: "txt", s: " shipped.\n\n" },
      { cls: "tok", s: "```python\n" }, { cls: "dim", s: 'print("hello, rich text")\n' }, { cls: "tok", s: "```" },
    ],
    rich: [
      <h4 key="h">Meeting notes</h4>,
      <p key="p">Decisions in <i>italics</i>, <span className="del">cut scope</span> shipped.</p>,
      <div key="c" className="codeblock">{'print("hello, rich text")'}</div>,
    ],
  },
];

function useReveals() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || rm) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      }),
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Diptych() {
  const [snip, setSnip] = useState(0);
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState<"typing" | "rich">("typing");
  const rm = useRef(false);

  const flat = useMemo(
    () => SNIPPETS[snip].src.flatMap((seg) => [...seg.s].map((ch) => ({ ch, cls: seg.cls }))),
    [snip]
  );

  useEffect(() => {
    rm.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rm.current) { setChars(flat.length); setPhase("rich"); }
  }, [flat.length]);

  useEffect(() => {
    if (rm.current) return;
    if (phase === "typing") {
      if (chars < flat.length) {
        const t = setTimeout(() => setChars((c) => c + 1), 26);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("rich"), 350);
      return () => clearTimeout(t);
    }
    // rich phase: hold, then advance
    const t = setTimeout(() => {
      setSnip((s) => (s + 1) % SNIPPETS.length);
      setChars(0);
      setPhase("typing");
    }, 4600);
    return () => clearTimeout(t);
  }, [phase, chars, flat.length]);

  // group visible chars back into spans
  const spans: { cls: string; s: string }[] = [];
  for (let i = 0; i < chars; i++) {
    const { ch, cls } = flat[i];
    const last = spans[spans.length - 1];
    if (last && last.cls === cls) last.s += ch;
    else spans.push({ cls, s: ch });
  }

  return (
    <div className="diptych reveal" style={{ "--d": ".25s" } as React.CSSProperties}>
      <div className="pane pane-ink">
        <div className="pane-bar"><span className="pane-dots"><i /><i /><i /></span> notes.md</div>
        <div className="pane-body">
          <div className="md-src" aria-label="Markdown source being typed">
            {spans.map((sp, i) => (
              <span key={i} className={sp.cls === "txt" ? undefined : sp.cls}>{sp.s}</span>
            ))}
            {phase === "typing" && <span className="caret" aria-hidden="true" />}
          </div>
        </div>
      </div>

      <div className="seam-badge" aria-hidden="true">
        <span className={"gl" + (phase === "rich" ? "" : "")}>{phase === "rich" ? "↦" : "·"}</span>
      </div>

      <div className={"pane pane-paper" + (phase === "rich" ? " sweep" : "")}>
        <div className="pane-bar"><span className="pane-dots"><i /><i /><i /></span> notes.rtf</div>
        <div className="pane-body">
          <div className="rich" aria-label="The same content rendered as rich text">
            {SNIPPETS[snip].rich.map((node, i) => (
              <div
                key={`${snip}-${i}`}
                className={phase === "rich" ? "on" : undefined}
                style={{ transitionDelay: `${0.15 + i * 0.14}s` }}
              >
                {node}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  useReveals();

  return (
    <>
      <nav className="mdi-nav" aria-label="Main">
        <div className="wrap row">
          <a className="mdi-mark" href="#top" style={{ fontSize: "1.15rem" }}>
            <span className="md">.MD</span><span className="inv">inverter</span>
          </a>
          <div className="links">
            <a href="#converter">Converter</a>
            <a href="#why">Why</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <a className="btn btn-quill btn-sm" href="#pricing">Premium — $9</a>
        </div>
      </nav>

      <main id="top">
        {/* ============ HERO ============ */}
        <header className="hero">
          <div className="wrap">
            <div className="hero-head">
              <p className="kicker reveal">$ mdinvert --both</p>
              <h1 className="reveal" style={{ "--d": ".08s" } as React.CSSProperties}>
                <span className="mono-side">Markdown in.</span>{" "}
                <span className="serif-side">Rich text out.</span>
              </h1>
              <p className="sub reveal" style={{ "--d": ".16s" } as React.CSSProperties}>
                Headings, bold, lists, quotes, code — converted to flawless RTF for Pages,
                Word, and Google Docs, <b>entirely in your browser</b>. No cloud. No signup.
                Nothing leaves your machine.
              </p>
              <div className="hero-ctas reveal" style={{ "--d": ".24s" } as React.CSSProperties}>
                <a className="btn btn-blue" href="#converter">Invert something ↓</a>
                <a className="btn btn-ghost" href="#pricing">See pricing</a>
              </div>
              <p className="hero-fine reveal" style={{ "--d": ".3s" } as React.CSSProperties}>
                Free every day · $9 once for everything, forever
              </p>
            </div>
            <Diptych />
          </div>
        </header>

        {/* ============ THE PROBLEM ============ */}
        <section className="section" id="problem">
          <div className="wrap">
            <div className="section-head reveal">
              <p className="kicker">the problem</p>
              <h2>You've pasted Markdown into Word before.</h2>
              <p>The asterisks came too.</p>
            </div>
            <div className="shame reveal">
              <div className="doc">
                <div className="pane-bar"><span className="pane-dots"><i /><i /><i /></span> Untitled.docx</div>
                <div className="body">
                  <p><span className="squig">#</span> Q3 update</p>
                  <p>Revenue is up <span className="squig">**</span>forty percent<span className="squig">**</span> and churn is <span className="squig">*</span>finally<span className="squig">*</span> flat.</p>
                  <p><span className="squig">-</span> Ship the new pricing page</p>
                  <p><span className="squig">-</span> Close the Henderson deal</p>
                  <p><span className="squig">&gt;</span> <span className="squig">`</span>deadline<span className="squig">`</span> is Friday.</p>
                </div>
              </div>
              <p className="cap">Every marker you typed, <b>published</b>. Your reader saw the plumbing.</p>
              <p className="fixline"><a className="btn btn-blue" href="#converter">Never again ↓</a></p>
            </div>
          </div>
        </section>

        <div className="rule" aria-hidden="true" />

        {/* ============ CONVERTER ============ */}
        <section className="section" id="converter">
          <div className="wrap">
            <div className="section-head reveal">
              <p className="kicker">the tool itself</p>
              <h2>Paste. Invert. Paste anywhere.</h2>
              <p>The full converter, right here — plaintext output is always free, and RTF comes out of the paper side.</p>
            </div>
            <div className="reveal"><Converter /></div>
          </div>
        </section>

        <div className="rule" aria-hidden="true" />

        {/* ============ WHY ============ */}
        <section className="section" id="why">
          <div className="wrap">
            <div className="section-head reveal">
              <p className="kicker">why this one</p>
              <h2>One job, done obsessively well.</h2>
            </div>
            <div className="cards3">
              <div className="wcard reveal">
                <span className="glyph">~/local</span>
                <h3>Runs where your text is</h3>
                <p>Every conversion happens <b>in the page you're looking at</b> — works offline, keeps drafts private, and the browser extension inverts any selected text with a right-click.</p>
              </div>
              <div className="wcard reveal" style={{ "--d": ".1s" } as React.CSSProperties}>
                <span className="glyph">1:1</span>
                <h3>Fidelity is the feature</h3>
                <p>Six heading levels, nested lists, quotes, code blocks, strikethrough — each lands in RTF exactly. Em-dashes and smart quotes survive as themselves, <b>never as question marks</b>.</p>
              </div>
              <div className="wcard reveal" style={{ "--d": ".2s" } as React.CSSProperties}>
                <span className="glyph">$9·∞</span>
                <h3>Priced like a tool</h3>
                <p>A real free tier every day, and one honest price for the rest: <b>$9, once</b>. No subscription, no account, no "contact sales".</p>
              </div>
            </div>
          </div>
        </section>

        <div className="rule" aria-hidden="true" />

        {/* ============ PRICING ============ */}
        <section className="section" id="pricing">
          <div className="wrap">
            <div className="section-head reveal">
              <p className="kicker">pricing</p>
              <h2>Two tiers. Zero subscriptions.</h2>
            </div>
            <div className="pricing">
              <div className="price-card price-ink reveal">
                <h3>free — the daily driver</h3>
                <p className="amount">$0</p>
                <ul>
                  <li>Unlimited plaintext conversion &amp; copy</li>
                  <li>1 RTF pro conversion a day (20 a month)</li>
                  <li>The browser extension</li>
                  <li>Everything stays local</li>
                </ul>
              </div>
              <div className="price-card price-paper reveal" style={{ "--d": ".12s" } as React.CSSProperties}>
                <h3>Premium — the whole desk</h3>
                <p className="amount">$9 <small>once, forever</small></p>
                <ul>
                  <li>Unlimited RTF conversions</li>
                  <li>Bulk mode — many documents in one pass</li>
                  <li>Custom filenames</li>
                  <li>Rich-text straight to the clipboard</li>
                </ul>
                <a
                  className="btn btn-quill"
                  href="https://buy.stripe.com/test_4gobV9bRzduFb0I3UU"
                  style={{ justifySelf: "start" }}
                >
                  Go Premium
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="rule" aria-hidden="true" />

        {/* ============ FAQ ============ */}
        <section className="section" id="faq">
          <div className="wrap">
            <div className="section-head reveal">
              <p className="kicker">faq</p>
              <h2>Fair questions.</h2>
            </div>
            <div className="faq reveal">
              <details>
                <summary>Is my text safe?</summary>
                <p>Yes — conversion runs in your browser's own JavaScript. There is no server, no upload, no analytics. Disconnect from the internet after loading the page and it keeps working.</p>
              </details>
              <details>
                <summary>Do I need an account?</summary>
                <p>No. The free tier works without signing up for anything, and Premium is a one-time checkout — your license lives in your browser, not in a database of users.</p>
              </details>
              <details>
                <summary>What formats come out?</summary>
                <p>RTF (.rtf) — which opens with formatting intact in Pages, Word, TextEdit, and Google Docs — and clean plaintext (.txt) with every bit of Markdown syntax stripped.</p>
              </details>
              <details>
                <summary>What does the extension do?</summary>
                <p>Right-click any selected Markdown on any webpage and convert it in place — to rich text on your clipboard or plain text. Manifest V3, Chrome and Edge today; it makes no network calls at all.</p>
              </details>
              <details>
                <summary>What exactly does $9 buy?</summary>
                <p>Unlimited RTF conversions, bulk mode, custom filenames, rich-text clipboard copy, and freely selectable output — for life. It's a tool, so it's priced like one: once.</p>
              </details>
              <details>
                <summary>Why can't I select text in the output?</summary>
                <p>On the free tier the Copy button is the only door — it's what makes the free conversion count. The upside: once you've converted something, that exact text is yours to re-copy and re-download as often as you like. Edit it, and the editor highlights precisely what changed so you can revert. Premium removes the lock entirely.</p>
              </details>
              <details>
                <summary>Is there a referral program?</summary>
                <p>At launch: refer three friends who each make a conversion and take a week of Premium on us — and if someone you referred goes lifetime, you get a month. Codes arrive with the public release.</p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <footer className="mdi-footer">
        <p>
          <a className="mdi-mark" href="#top"><span className="md">.MD</span><span className="inv">inverter</span></a>
        </p>
        <p>A Studio Burnside tool · everything stays in your browser</p>
        <p><a href="mailto:darnell@studioburnside.com">darnell@studioburnside.com</a></p>
      </footer>
    </>
  );
}
