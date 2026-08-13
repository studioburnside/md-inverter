# MD Inverter — Zette Spec (Final)

**Date:** 2026-07-18
**Venture:** Personal (commercial product with direct monetization)
**Status:** Approved — ready for Zette intake
**Source:** /D/workspace/md-inverter/MD-Inverter-gate-evaluation.md
**Delegation plan:** Opus tier for humanize prompt design + architecture, Sonnet tier for UI implementation + wrappers

---

## Prompt for Zette

> "Build MD Inverter — a web-first text conversion app. The stack is Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui for the web app. Capacitor 6 wraps it for iOS and macOS. The browser extension is a separate Manifest V3 project. All code goes in /D/workspace/md-inverter/ as open source (MIT license).
>
> CRITICAL: This is the PRIMARY ZETTE spec. It is the full specification. Zette MUST build this project according to this spec and commit every step. Every code artifact goes into the workspace directory as specified.
>
> The web app is the product — everything else wraps it. Build the web app first, verify it works, then add the native wrappers and extension.
>
> Everything in the web app must be mobile-first and responsive. The design should feel fun, inviting, and lightweight — NOT like a corporate SaaS tool. Think: playful but professional, like a well-designed utility app.
>
> All API keys and secrets must be stored in .env.local (gitignored). Nothing sensitive goes into the codebase.

---

## Spec Summary

MD Inverter converts AI-generated Markdown (with unwanted formatting like `**bold**`, em-dashes, explicit preambles) into clean, natural rich text. It offers a web app as the core product, with macOS and iOS wrappers, and a browser extension. The core differentiator is the "humanize" button: AI-powered rewriting that transforms robotic AI output into natural, conversational prose. The web app is ad-supported; a $0.99 one-time purchase removes ads and unlocks offline use on native platforms. All code is open source under MIT.

---

## Gates

| Gate | Score | Notes |
|---|---|---|
| G1 | Pass | Stack supports all features |
| G2 | Pass | Strong PMF for AI content creators |
| G3 | Pass | Web-first = identical UX |
| G4 | Pass | Solvable for solo dev |
| G5 | Pass | No meaningful lock-in |
| G6 | Pass | Clear prompt + architecture defined |
| G7 | Pass | Full spec with component breakdown |
| G8 | Pass | Complete API contracts |
| G9 | Pass | 6-8 sessions estimated |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Web framework | **Next.js 15** (App Router) | Server components, server actions |
| Language | **TypeScript** | Strict mode |
| Styling | **Tailwind CSS** + **shadcn/ui** | Component library, consistent design |
| Markdown | **marked** (parse) + **DOMPurify** (sanitize) | Client-side conversion |
| AI | **OpenRouter** API via server action | Claude Haiku for humanize (~$0.002/call) |
| Auth | **NextAuth** (anonymous mode) | Optional accounts, local-first |
| Database | **SQLite** via better-sqlite3 | History storage, server-side only |
| Native wrappers | **Capacitor 6** | iOS + macOS from web build |
| Payments (web) | **Stripe Checkout** | One-time $0.99, webhook → localStorage key |
| Payments (iOS) | **StoreKit 2** | In-app purchase, receipt validation |
| Extension | **Manifest V3** (Chrome/Firefox) + Safari WebExtension | Separate project, calls same API |
| Hosting | **Vercel** (free tier) | Next.js native, serverless functions |

---

## Web App Architecture

### File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, providers, ad script
│   ├── page.tsx                # Main page (editor + preview)
│   ├── api/
│   │   ├── humanize/route.ts   # LLM humanize endpoint
│   │   ├── stripe/checkout/route.ts      # Create checkout session
│   │   ├── stripe/webhook/route.ts        # Stripe webhook handler
│   │   └── status/route.ts     # Get user status (premium/ads)
│   └── privacy/
│       └── page.tsx            # Privacy policy
├── components/
│   ├── editor/
│   │   ├── MarkdownInput.tsx   # Textarea + paste handling
│   │   └── ConversionToolbar.tsx  # Humanize, copy buttons
│   ├── preview/
│   │   ├── RichPreview.tsx     # HTML preview with styling
│   │   └── CopyButtons.tsx     # Copy as rich/plaintext
│   ├── ads/
│   │   ├── AdBanner.tsx        # Unobtrusive banner ad
│   │   └── PremiumUpsell.tsx   # "$0.99 remove ads" CTA
│   ├── premium/
│   │   ├── PremiumBanner.tsx   # "You're premium!" badge
│   │   └── StripeCheckout.tsx  # Checkout redirect
│   ├── history/
│   │   ├── HistoryPanel.tsx    # Sidebar with past conversions
│   │   └── HistoryItem.tsx     # Single history item
│   └── ui/                     # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── textarea.tsx
│       └── toast.tsx
├── lib/
│   ├── markdown.ts             # Markdown → HTML conversion
│   ├── humanize.ts             # Rule-based humanize + LLM prompt
│   ├── premium.ts              # Premium state management
│   ├── history.ts              # History CRUD (localStorage)
│   ├── ads.ts                  # Ad serving logic
│   └── utils.ts                # Shared utilities
└── types/
    └── index.ts                # TypeScript types
```

### Core Pages

**page.tsx** — Main editor with two-panel layout:
- Left panel: Markdown input (textarea, auto-expanding)
- Right panel: Rich text preview (rendered HTML with clean styling)
- Toolbar: Humanize button, Copy as RTF, Copy as Plain Text, Clear
- Mobile: Stacked layout, tab between input/preview

**privacy/page.tsx** — Simple privacy policy page (minimal text, key points)

### Core Components

#### MarkdownInput.tsx
- Auto-expanding textarea with placeholder text
- Paste detection + clear formatting indicator
- Character count + word count
- Visual paste animation (subtle highlight flash)
- Mobile keyboard-friendly (large tap targets, proper spacing)

#### RichPreview.tsx
- Renders HTML from markdown with clean, readable typography
- Proper heading hierarchy, list styling, code block styling
- Blockquote styling with left border accent
- Smooth transition between raw markdown and rendered preview
- "Copy as rich text" uses document.execCommand('copy') with appropriate formatting

#### ConversionToolbar.tsx
- Primary action: Humanize button (purple/magenta accent, prominent)
- Secondary: Copy buttons (subtle, gray)
- Tertiary: Clear, Swap (toggle input/preview on mobile)
- Button states: idle, loading (spinner), success (checkmark)

#### AdBanner.tsx
- Horizontal banner at bottom of page (below fold on desktop, inline on mobile)
- Height: 60px desktop, 90px mobile
- Content: Sponsor logo + brief description + link
- Style: Clean, fits the design language, NOT jarring
- Premium users: completely hidden

#### PremiumBanner.tsx
- Appears when ads are enabled (non-premium)
- Small banner: "Enjoying MD Inverter? Remove ads for $0.99"
- Clicking opens Stripe Checkout
- Dismissible, remembers dismissal for 7 days

---

## Design System

**Philosophy:** Playful but professional. Think "utility app by a designer" — like Things, Notion, or Linear, but warmer and more approachable.

**Colors:**
- Background: #FAFAFA (warm off-white, not stark)
- Surface: #FFFFFF (pure white for cards)
- Primary: #6C5CE7 (vibrant purple) — for humanize button, primary actions
- Primary hover: #5B4BD6
- Accent: #00B894 (mint green) — for success states, checkmarks
- Text primary: #2D3436 (near-black, warm)
- Text secondary: #636E72 (muted gray)
- Border: #E0E0E0 (subtle)
- Error: #E17055 (coral)
- Ad banner background: #F8F9FA (slightly different from page bg)

**Typography:**
- Font family: Inter (sans-serif) — clean, modern, highly readable
- Heading sizes: H1 32px, H2 24px, H3 20px, body 16px
- Preview font: system-ui for body, monospace for code blocks
- Line height: 1.6 for body, 1.3 for headings

**Spacing:**
- Base unit: 8px
- Padding: 16px (cards), 24px (page), 12px (buttons)
- Gap: 16px (layout gaps)
- Border radius: 12px (cards), 8px (buttons, inputs)

**Animations:**
- Subtle scale on button press (0.97)
- Smooth slide-in for preview (150ms ease-out)
- Success checkmark briefly replaces the action icon (500ms)
- No parallax, no excessive motion — functional animations only

---

## Core Logic

### markdown.ts
```typescript
// Pure functions, no side effects
export function markdownToHtml(md: string): string
export function htmlToPlainText(html: string): string
```
- Uses `marked` for markdown parsing
- Uses `DOMPurify` for sanitization
- Returns clean HTML string
- Handles: headings, bold, italic, strikethrough, code, code blocks, lists, blockquotes, links, horizontal rules, images

### humanize.ts
Two modes:
1. **Rule-based (free)** — deterministic cleanup:
   - Remove explicit AI preambles ("Here's", "In summary", "Let me help you with")
   - Convert markdown heading markers to clean titles
   - Remove unnecessary bold/italic markers
   - Convert bracketed links to natural parenthetical references
   - Replace em-dashes (—) with hyphens (-)
   - Normalize paragraph structure

2. **AI-powered (premium)** — LLM rewrite:
   - Sends text to OpenRouter (Claude Haiku)
   - Prompt: "Rewrite the following text to sound natural and conversational. Remove AI writing patterns like excessive bullet points, mechanical transitions, and formal phrasing. Keep all factual content intact. Write in a warm, helpful tone as if a knowledgeable person wrote it casually. Preserve technical terms, names, and numbers exactly."
   - Returns rewritten text

### premium.ts
```typescript
export function isPremium(): boolean         // Check localStorage key
export function activatePremium(key: string): void  // Store key, validate
export function deactivatePremium(): void   // Clear key
```
- Premium state stored in localStorage as `mdinverter_premium`
- Key is a simple boolean flag set after successful Stripe checkout
- Native apps check via StoreKit receipts
- Premium = no ads + offline access

### history.ts
```typescript
type HistoryItem = {
  id: string
  input: string       // Original markdown
  output: string      // Converted result
  humanized: boolean  // Whether humanize was applied
  timestamp: number
  preview: string     // Truncated preview (first 200 chars)
}
```
- Stored in localStorage as `mdinverter_history` (array of HistoryItem)
- Max 50 items (oldest auto-deleted when exceeded)
- Optional cloud sync when user has account
- History sidebar: slide-out panel, search/filter, click to reload

---

## API Contracts

### POST /api/humanize
**Request body:**
```json
{ "text": "string (markdown content)", "mode": "ai" | "rules" }
```
**Response:**
```json
{ "success": true, "text": "rewritten text", "mode": "ai" | "rules" }
```
**Error:**
```json
{ "success": false, "error": "string" }
```

### POST /api/stripe/checkout
**Request body:**
```json
{ "email": "string (optional)" }
```
**Response:**
```json
{ "success": true, "checkoutUrl": "string" }
```

### POST /api/stripe/webhook
Stripe sends events. Handle:
- `checkout.session.completed` → Set premium flag in localStorage
- `payment_intent.succeeded` → Backup premium confirmation

### GET /api/status
**Response:**
```json
{ "premium": true, "adsEnabled": false }
```

---

## Monetization Architecture

### Web App
- **Free users:** See AdBanner + PremiumBanner
- **Premium users ($0.99):** No ads, can check status via localStorage
- **Payment flow:** Stripe Checkout → success → webhook sets `mdinverter_premium=true` in localStorage → user reloads → ads disappear

### iOS App (via StoreKit 2)
- **Free:** Full conversion features, no ads (native apps don't show ads)
- **Premium:** Offline mode enabled + early access to new features
- **IAP product ID:** `com.studioburnside.md-inverter.premium`
- **Receipt validation:** Client-side StoreKit validation + server verification (optional)

### macOS App (via Capacitor wrapper)
- **Free:** Full conversion features
- **Premium:** Same as iOS — offline mode enabled
- **Distribution:** Direct download (no Mac App Store) — simpler, no review process, maximum freedom

### Browser Extension
- **Free:** Always free, no premium tier
- **Ads:** None (extension is purely a conversion tool)
- **Monetization:** Conversion funnel — extension users discover web app → web app shows ads → ads promote $0.99 premium

---

## Browser Extension Architecture

### File Structure
```
extension/
├── manifest.json           # Manifest V3
├── popup/
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Popup logic
│   └── popup.css           # Popup styling
├── background/
│   └── background.js       # Service worker (content scripts, API calls)
├── content/
│   └── content.js          # Content script (clipboard capture, context menu)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Flow
1. User copies text from a website
2. Extension detects copy (or user right-clicks → "Invert to Rich Text")
3. Extension sends text to web app's /api/humanize endpoint (rules mode only for free)
4. Extension displays result in popup with "Copy Rich Text" and "Copy Plain Text" buttons
5. One-tap copy to clipboard

---

## Privacy & Data

- **No analytics, no telemetry, no tracking**
- All processing happens in the browser (markdown conversion) or via ephemeral LLM calls (humanize)
- No user data stored on servers (history is localStorage-only)
- Optional accounts for history sync — user data encrypted at rest
- Privacy policy: simple, plain-language
- No cookies (except Stripe session cookies)
- Offline-capable (service worker caches the web app)

---

## Non-Goals

- **Not a full markdown editor** — no editing tools, just paste-convert-copy
- **Not a content management system** — no database of documents, no collaboration
- **Not a cloud sync service** — history is localStorage-first, cloud sync is optional/secondary
- **Not an AI writing tool** — it cleans and rewrites existing text, doesn't generate new content
- **Not a CMS** — no user-generated content, no comments, no social features
- **The browser extension does NOT have a premium tier** — it's always free
- **No Apple News/Google Play** — only Mac App Store (optional) + direct download for Mac

---

## Acceptance Criteria

### Phase 1: Web App MVP
- [ ] Markdown pasted into left panel renders as rich text in right panel within 200ms
- [ ] Supports: headings (H1-H6), bold, italic, strikethrough, code blocks, inline code, ordered/unordered lists, blockquotes, links, horizontal rules, images (alt text only)
- [ ] Copy buttons work: "Copy as Plain Text" and "Copy as Rich Text" on macOS (rtf+text format)
- [ ] Layout is responsive: desktop = side-by-side, mobile = stacked with tab switch
- [ ] Ad banner displays correctly on free tier (60px desktop, 90px mobile height)
- [ ] Premium banner is dismissible and respects dismissal for 7 days

### Phase 2: Humanize Feature
- [ ] Rule-based humanize produces readable output with no markdown artifacts
- [ ] AI humanize via LLM produces natural-sounding prose (verified against prompt)
- [ ] AI humanize is gated behind premium (non-premium users see upsell)
- [ ] Humanize button shows loading state (spinner) during API call
- [ ] Humanize preserves technical terms, names, and numbers from original text

### Phase 3: Premium / Payments
- [ ] Stripe Checkout flows correctly → webhook sets premium flag
- [ ] Premium users see no ads immediately after purchase
- [ ] Premium flag persists across browser sessions (localStorage)
- [ ] Premium can be deactivated (user resets localStorage)
- [ ] StoreKit IAP product defined in App Store Connect

### Phase 4: Native Wrappers
- [ ] iOS app loads web app in WKWebView with full functionality
- [ ] iOS Share Extension can receive text and send it to the app for conversion
- [ ] macOS app loads web app in WKWebView with full functionality
- [ ] ServiceWorker caches web app for offline use on native platforms
- [ ] IAP receipt validates and enables offline mode

### Phase 5: Browser Extension
- [ ] Extension popup converts clipboard text to rich text preview
- [ ] One-tap copy from popup works for both plain and rich text
- [ ] Context menu "Invert to Rich Text" works from right-click
- Extension works on Chrome (primary), Firefox (easy port from Chrome), and Safari (WebKit-based, more work)

---

## Delegation Plan

| Phase | Work | Tier | Notes |
|---|---|---|---|
| Phase 1 | Web app core (Next.js + Tailwind + shadcn) | Sonnet | UI implementation, straightforward |
| Phase 2 | Markdown conversion + preview logic | Sonnet | Well-documented libraries |
| Phase 3 | Humanize feature (rule-based + LLM) | **Opus** | Prompt design is the hard part |
| Phase 4 | Stripe checkout + webhook | Sonnet | Well-documented API |
| Phase 5 | Stripe premium state management | Sonnet | Simple localStorage flow |
| Phase 6 | iOS wrapper (Capacitor + Share Extension) | Sonnet | Config + plugin setup |
| Phase 7 | macOS wrapper (Capacitor) | Sonnet | Config only |
| Phase 8 | Browser extension | Sonnet | Manifest V3, standard patterns |
| Phase 9 | Polish, error handling, edge cases | Sonnet | Design refinement |

---

## [HUMAN] Steps

1. Set up Stripe account + create $0.99 one-time product
2. Set up OpenRouter account + get API key
3. Set up Vercel account for hosting
4. Approve this spec before Zette starts building
5. Decide on ad network (Carbon Ads? direct sponsors? simple "support us" message?)
6. Decide on Mac distribution: Mac App Store vs direct download
7. Decide which browser extensions to build first (Chrome? Firefox? Safari?)

## [GATE] Steps

1. **Humanize prompt design** — Opus tier must craft and test the actual LLM prompt. This is the product's key differentiator.
2. **Design approval** — D must approve the visual design direction before extension work begins
3. **Payment provider setup** — Stripe and StoreKit need real account setup (D's responsibility)

---

## Files

- `/D/workspace/md-inverter/MD-Inverter-gate-evaluation.md` — Gate analysis
- `/D/workspace/md-inverter/md_inverter.py` — Existing Python CLI (being replaced)
- `/D/workspace/md-inverter/README.md` — Existing README (being replaced)
