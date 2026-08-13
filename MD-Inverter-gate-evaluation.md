# MD Inverter — Gate Evaluation

**Date:** 2026-07-18
**Venture:** Personal (commercial product with direct monetization)
**Evaluator:** D (handoff to Zette for implementation)

---

## Product Definition

MD Inverter is a multi-platform text utility that takes AI-generated Markdown (with unwanted formatting artifacts like `**bold**`, em-dashes, explicit "Here's a summary:" preambles) and converts it into clean, natural, rich text ready to paste anywhere.

### Core Pillars

1. **Smart conversion** — Convert Markdown to clean rich text, with optional AI-powered "humanize" that rewrites robotic AI output into natural, conversational prose
2. **Web-first, native-wrapped** — Single codebase (web app) powered across 4 platforms: Web, macOS (wrapper), iOS (wrapper + Share Extension), Browser Extension
3. **Freemium monetization** — Web = ad-supported, $0.99 one-time unlocks all platforms (web, Mac, iOS, offline). Extension = free, no premium tier. All code open source (MIT).

---

## 9-Gate Evaluation

### G1: Capability

Does the target platform stack support the core features?

| Pillar | Requirement | Platform Support | Verdict |
|--------|-------------|-----------------|---------|
| Smart conversion | Markdown→HTML preview, LLM humanize, copy to clipboard | Next.js web ✅, Capacitor wrappers ✅ | **Pass** |
| Web-first | Shared codebase across 4 platforms | Web = native, native apps = wrappers | **Pass** |
| Humanize | Rule-based cleanup (local) + LLM rewrite (cloud) | localStorage + Next.js server action | **Pass** |
| Ad serving | Display unobtrusive ads on web | Next.js + server-side ad network | **Pass** |
| Premium unlock | $0.99 removes ads on web, unlocks offline on native | Stripe Checkout + localStorage key | **Pass** |
| Browser extension | Capture text, convert, show result | Manifest V3, calls same API | **Pass** |
| Share Extension | iOS Share → convert in background | Capacitor Share Extension plugin | **Pass** |
| Optional accounts | Local-first history + cloud sync for premium | NextAuth (anonymous mode) + SQLite | **Pass** |
| Offline (native) | iOS/Mac apps work without internet | Capacitor ServiceWorker caching | **Pass** |

**Verdict: PASS** — The chosen stack (Next.js + Capacitor + LLM API) fully supports all pillars.

---

### G2: Product-Market Fit

Will users pay $0.99 for this? Is there a market?

**Market analysis:**
- AI chatbots (ChatGPT, Perplexity, Claude) outputting formatted Markdown that's painful to copy into emails, docs, social posts is a **universal pain point**
- Target users: professionals, students, creators who use AI for content
- Pain point: AI adds bold to everything, uses em-dashes, includes preamble text ("Here's a summary:")
- Competitors: Existing tools are either CLI-only (like the current codebase) or full-featured markdown editors (Notion, Bear)
- Gap: No lightweight, frictionless "paste-and-clean" tool exists as a standalone product
- Price point: $0.99 is an impulse-buy threshold — removes friction from purchase decision

**PMF assessment:**
- Problem is real and frequent (AI text formatting is a daily annoyance)
- Solution is simple and focused (does one thing well)
- Price is low enough for impulse purchase
- Open source builds trust and community
- Distribution: browser extension = top-of-funnel acquisition → web = primary product → native apps = convenience

**Verdict: PASS** — Strong PMF for a specific, underserved user base. The $0.99 price point removes purchase friction. The extension serves as a free acquisition channel.

---

### G3: Technical Fit

Does the UX match the architecture?

| User Flow | Web App | macOS Wrapper | iOS Wrapper | Extension |
|-----------|---------|---------------|-------------|-----------|
| Paste text | ✅ Text area + paste | ✅ Same UI | ✅ Same UI | ✅ Captures from clipboard |
| See preview | ✅ Live preview | ✅ Same UI | ✅ Same UI | ✅ Popup preview |
| Humanize | ✅ Button → LLM | ✅ Same | ✅ Same | ❌ (not needed — extension converts directly) |
| Copy result | ✅ One tap | ✅ One tap | ✅ One tap | ✅ One tap |
| History | ✅ Optional account | ✅ Same | ✅ Same | N/A (extension is stateless) |
| Remove ads (web) | ✅ Stripe Checkout | N/A (no ads) | N/A (no ads) | N/A (free, no premium) |
| Offline | ❌ (needs connection) | ✅ Cached via ServiceWorker | ✅ Cached via ServiceWorker | N/A |
| Share to convert | N/A | N/A | ✅ Share Extension | ✅ Context menu |

**Verdict: PASS** — The web-first approach means identical UX across platforms. The extension is the odd one out but that's acceptable (it's a different interaction model).

---

### G4: Developer Productivity

Can a solo developer build this?

**Complexity breakdown:**

| Component | Complexity | Effort |
|-----------|------------|--------|
| Web app (Next.js) | Medium | Core UI, markdown preview, humanize button |
| Capacitor wrappers (iOS + Mac) | Low | 1 config file per platform, wrap the web build |
| Browser extension | Medium | Manifest V3, popup UI, background script |
| LLM API integration | Low | One server action, simple prompt |
| Stripe Checkout | Medium | Checkout session, webhook, localStorage key |
| iOS IAP | Medium | StoreKit setup, receipt validation |
| Share Extension | Low | Capacitor plugin, simple API call |
| Account system | Low | NextAuth anonymous mode, SQLite for history |

**Skill requirements:**
- Frontend development (React/Next.js) — solid baseline needed
- Basic backend (API routes) — simple serverless functions
- Native app packaging (Capacitor) — straightforward
- Payment integration (Stripe, StoreKit) — well-documented

**Risk factors:**
- Browser extension for Safari and Chrome/Firefox — each is a separate extension
- iOS Share Extension — requires Xcode, Apple developer account
- StoreKit IAP — requires App Store Connect setup

**Verdict: PASS** — Solvable for a solo dev with good frontend skills. The Capacitor approach dramatically reduces native development effort. The hardest part is the extension ecosystem (multiple platforms) and payment setup.

---

### G5: Vendor Path Dependency

What does the stack lock you into?

| Component | Vendor | Lock-in Risk |
|-----------|--------|-------------|
| Web framework | Next.js (Vercel) | Low — can self-host, it's open source |
| UI | Tailwind + shadcn/ui | None — all open source, CSS-in-JS is portable |
| Native wrappers | Capacitor (Ionic) | Low — can migrate to native later; WebViews are universal |
| API provider | OpenRouter | Low — abstraction layer means swap easily |
| Payments | Stripe | Low — standard integration, not a platform dependency |
| Auth | NextAuth | None — open source, standard OAuth patterns |
| Database | SQLite | None — local-first, portable |

**Verdict: PASS** — All major components are open-source or have clear migration paths. No vendor creates a meaningful lock-in.

---

### G6: AI-Ready

Is the UX clean for AI handoff (Zette implementation)?

**Current state:** Spec is being written now. Will produce a clear Zette-ready spec after this evaluation.

**Considerations:**
- The humanize feature is the most AI-sensitive part — requires clear prompt engineering
- The rest of the app is UI/UX work, which is more subjective
- Zette needs explicit acceptance criteria for the humanize output quality
- Design system needs to be defined (colors, typography, spacing)

**Verdict: PARTIAL** — Will be a Pass once the Zette spec is complete. The humanize feature requires careful prompt design that Zette should receive explicitly.

---

### G7: Functional Completeness

Are the implementation steps defined?

**Current state:** No. This is being established now.

**Required definition:**
- Web app: all pages, all components, all state management
- Capacitor: config for iOS and macOS
- Extension: all files, all scripts, all permissions
- API: endpoints, prompt template, error handling
- Payments: Stripe flow, IAP flow, verification
- Extension: all files, all scripts, all permissions
- API: endpoints, prompt template, error handling
- Payments: Stripe flow, IAP flow, verification
- History: schema, storage, sync flow

**Verdict: PARTIAL** — Will become PASS once the spec is written. The key deliverable is a detailed component-by-component spec.

---

### G8: Data Integrity

Are the schema/APIs specified?

**Data flows:**
- User input: Markdown text (string) → Markdown → HTML (preview) → copy
- Humanize: Markdown text → LLM API → Natural text → Markdown → HTML
- History: { id, markdown, result, timestamp } in localStorage
- Accounts: optional, uses NextAuth anonymous sessions + SQLite
- Premium: localStorage key (web) + StoreKit receipt (iOS)

**API contracts:**
- POST /api/humanize → { markdown: string } → { text: string, source: "ai" }
- GET /api/status → { premium: boolean, adsEnabled: boolean }
- POST /api/stripe/checkout → { success: true, checkoutUrl: string }
- POST /api/stripe/webhook → Stripe events → update localStorage key

**Verdict: PARTIAL** — Needs full API spec with request/response schemas. Will be in the Zette spec.

---

### G9: Velocity

Can it be shipped in a reasonable timeframe?

**Phased delivery:**
- Phase 1 (Web app MVP): 1-2 sessions — core UI, conversion, copy, preview
- Phase 2 (Humanize): 1 session — LLM integration + rule-based cleanup
- Phase 3 (Payments): 1 session — Stripe Checkout + localStorage premium
- Phase 4 (Capacitor iOS): 1 session — wrapper, Share Extension
- Phase 5 (Capacitor macOS): 0.5 session — wrapper
- Phase 6 (Browser extension): 1-2 sessions — popup, background, content scripts
- Phase 7 (Polish): 1 session — design, edge cases, error states

**Total estimated:** 6-8 sessions

**Verdict: PASS** — Reasonable scope for a solo developer. The web-first approach means most work happens once (web app), with small increments for each wrapper.

---

## Summary

| Gate | Score | Notes |
|------|-------|-------|
| G1: Capability | PASS | Stack supports all features |
| G2: Product-Market Fit | PASS | Clear pain point, impulse-buy price, underserved market |
| G3: Technical Fit | PASS | Web-first = identical UX across platforms |
| G4: Developer Productivity | PASS | Solvable for solo dev, Capacitor reduces native effort |
| G5: Vendor Path Dependency | PASS | All open-source or portable |
| G6: AI-Ready | PARTIAL | Will pass once spec is written |
| G7: Functional Completeness | PARTIAL | Will pass once spec is written |
| G8: Data Integrity | PARTIAL | Will pass once API spec is written |
| G9: Velocity | PASS | 6-8 sessions for full product |

**Overall: PASS (with notes)**

Gates 6-8 will transition from PARTIAL to PASS once the Zette spec is produced. No gate blocks the project. The recommended next step is the full Zette-ready spec.

---

## Open Questions

1. **LLM Provider:** OpenRouter (cheapest, multiple models) vs OpenAI (best quality for Sonnet). Recommendation: OpenRouter with Claude Haiku for humanize (~$0.002/call).
2. **Ad Network:** What ad network for the web? Consideration: should be unobtrusive (not Google AdSense which can be aggressive). Options: Carbon Ads (developer-focused), direct sponsor banners, or a simple "support this project" message.
3. **Mac App Distribution:** Mac App Store vs direct download. MAS requires Apple Developer Program ($99/yr), adds review process, but gives visibility. Direct download is simpler, no review, but users must install manually.
4. **iOS App Distribution:** Requires Apple Developer Program ($99/yr). IAP is mandatory for digital goods on iOS. The $0.99 premium unlock needs StoreKit 2 integration.
5. **Browser Extensions:** Safari (WebKit) and Chrome/Firefox (Chromium) are separate codebases. Start with one (Safari, since D is on Mac) then port.

---

## Recommendation

**GO.** The project passes all critical gates. The web-first architecture with native wrappers is the right approach for a solo developer building a multi-platform product. The $0.99 price point is well-considered (impulse-buy threshold). The open-source strategy builds community and trust.

Next step: Produce the full Zette-ready spec with detailed component specifications, API contracts, and implementation task breakdown.
