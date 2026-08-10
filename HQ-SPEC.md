# .MDinverter — HQ Specification

> **Product**: .MDinverter — Markdown→RTF converter as web app + browser extension  
> **Goal**: $25 by Wednesday, $100 by Sunday  
> **Repo**: https://github.com/studioburnside/md-inverter  
> **Current state**: MVP built, QA tested, pushed to Git, local preview running  

---

## 1. Product Vision

Convert Markdown to rich-text (RTF) in the browser — no install, no cloud upload, no signup. The extension is the acquisition channel: right-click any Markdown text on any webpage and convert instantly. The web app is the conversion engine. Premium unlocks bulk operations.

### Pareto focus (1 job, done obsessively well)

The core value prop: **Markdown → RTF conversion that preserves rich formatting** (bold, italic, headings, lists, code blocks, blockquotes, strikethrough, links, images). This is the 20% of features that covers 80% of use cases — writers pasting into Pages, academics formatting papers, content creators moving Markdown to rich-text editors.

### Tier structure

| Tier | Daily Pro | Monthly Pro | Features | Price |
|---|---|---|---|---|
| Free | 1 | 20 | Markdown→RTF, plaintext always free, download | $0 |
| Premium | Unlimited | Unlimited | Bulk conversion, custom filenames, RTF clipboard copy | $9 one-time |

**Pro features** (consume quota): RTF download, RTF clipboard copy
**Free features**: Plaintext conversion/download/copy always free

Quota tracking: localStorage (`mdinvert_daily_YYYY-MM-DD`, `mdinvert_monthly_YYYY-MM`). No server, no accounts.
|---|---|---|---|
| Two-panel Markdown→RTF converter | Medium | High | **P0** |
| Browser extension context menu | Low | High | **P0** |
| Copy RTF to clipboard (application/rtf) | Low | High | **P0** |
| Download .rtf file | Low | Medium | **P0** |
| Premium ($9 lifetime) checkout | Medium | High | **P0** |
| Bulk conversion (premium) | Medium | Medium | **P1** |
| Ads integration | Low | Medium | **P2** |

### Non-goals

- Markdown→HTML conversion (there are 100 other tools for this)
- Real-time collaborative editing
- Backend user accounts
- Mobile app

---

## 2. Architecture

```
md-inverter/
├── web/                     # Next.js 15 (App Router) — static export
│   ├── app/
│   │   ├── layout.tsx        # Root layout + metadata
│   │   ├── page.tsx           # Landing page → renders <Converter />
│   │   └── globals.css        # House-Style palette (CSS vars, no Tailwind dep)
│   ├── components/
│   │   └── Converter.tsx      # Two-panel UI, premium logic, Stripe redirect
│   ├── lib/
│   │   └── markdown-to-rtf.ts # Core conversion: mdToRtf(), mdToPlaintext()
│   ├── public/
│   │   ├── favicon.ico
│   │   └── icons/             # PWA icons
│   ├── package.json           # Next.js 15, React 19
│   ├── tsconfig.json          # ESNext, bundler resolution, @/* paths
│   └── next.config.js         # output: "export" (static site)
├── extension/               # Chrome/Firefox extension (Manifest V3)
│   ├── manifest.json          # Context menu permissions
│   ├── popup.html             # Popup UI
│   ├── popup.js               # Self-contained conversion logic
│   └── icons/                 # Extension icons (16/32/48/128px)
├── md_inverter.py             # Original Python CLI (source of truth for conversion)
├── AGENTS.md                  # Maintenance guide for future agents
└── .gitignore                 # Excludes node_modules, .next, build artifacts
```

### Key design decisions

1. **Static export** (`output: "export"` in next.config.js) — no Node.js backend needed, deploy anywhere
2. **No Tailwind dependency** — uses plain CSS with CSS variables matching the Studio Burnside palette (per HOUSE-STYLE.md)
3. **Dual conversion engines** — TypeScript port in the web app, JavaScript copy in the extension (both must stay in sync with the Python original)
4. **Premium state in localStorage** — no server-side user accounts, no database
5. **Stripe checkout URL** is a placeholder — replace with real product ID

---

## 3. Verification Criteria

### Conversion accuracy
- [x] Heading levels 1–6 produce correct RTF font sizes (36, 30, 26, 22, 20, 18)
- [x] Bold (`**text**`, `__text__`) → `{\b text}`
- [x] Italic (`*text*`, `_text_`) → `{\i text}`
- [x] Strikethrough (`~~text~~`) → `{\strike text}`
- [x] Inline code (`` `code` ``) → Courier New 11pt
- [x] Code blocks (``` ```lang ... ``` ```) → monospace paragraph block
- [x] Unordered lists (`-`, `*`, `+`) → bullet items
- [x] Ordered lists (`1.`, `2.`) → numbered items
- [x] Blockquotes (`> text`) → indented italic
- [x] Horizontal rules (`---`, `***`) → border line
- [x] Links `[text](url)` → text only (URL discarded)
- [x] Images `![alt](url)` → stripped
- [x] Unicode characters → RTF `\uN` escapes
- [x] Non-ASCII (em-dashes, smart quotes) → preserved via `\uN ` with space fallback

### Web app functionality
- [x] Page loads with sample markdown pre-filled
- [x] Format toggle (RTF / Plaintext / Both)
- [x] Download button produces valid .rtf file
- [x] Copy button copies RTF via Clipboard API
- [x] Load Example button resets to sample
- [x] Premium toggle shows/hides premium features
- [x] Bulk mode splits by paragraph separators
- [x] Custom filename input (premium only)
- [x] Stripe checkout button redirects

### Browser extension
- [x] Context menu appears on selected text
- [x] "Convert to RTF" copies RTF to clipboard
- [x] "Convert to Plaintext" copies plain text
- [x] Popup UI works independently
- [x] All conversion logic self-contained (no external imports)

### Design
- [x] Uses House-Style palette (burgundy `#a63a50`, gold `#d4af37`, creme `#f2e8d5`)
- [x] Night mode default (dark background)
- [x] Day mode via `data-theme="light"` attribute
- [x] Responsive layout (mobile-friendly grid)
- [x] Consistent typography (SF Mono for code, system font for UI)

### Security
- [x] No secrets in codebase
- [x] No API keys committed
- [x] .env files excluded
- [x] No server-side user data storage

---

## 4. Deployment Guide

### Web app (burnsidecloud-mach1 VM)

The web app is built as a static export. To deploy:

1. **Copy static files to VM**:
   ```bash
   # From /tmp/md-inverter/web on the VM
   cp -r out/* /var/www/md-inverter/
   ```

2. **Configure NGINX** (add to `/etc/nginx/sites-available/md-inverter`):
   ```nginx
   server {
       listen 80;
       server_name md-inverter.com;
       root /var/www/md-inverter;
       index index.html;
       
       location / {
           try_files $uri $uri/ =404;
       }
       
       # Serve static assets with caching
       location /_next/ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

3. **Enable site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/md-inverter /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. **Replace Stripe product ID** in `web/components/Converter.tsx`:
   ```
   Change: "https://buy.stripe.com/test_4gobV9bRzduFb0I3UU"
   To: your actual Stripe product URL
   ```

5. **Optional — ads**: Add AdSense script to `web/app/layout.tsx` `<head>`

### Browser extension

1. **Package extension**:
   ```bash
   cd extension
   zip -r md-inverter-extension.zip *
   ```

2. **Chrome Web Store**: Upload `md-inverter-extension.zip`
3. **Firefox**: Submit to addons.mozilla.org

---

## 5. Zette Continuation Plan

### Phase 1: Polish & Ship (Zette ownership)

**Tasks for Zette to recursively improve:**

1. **Ad integration** — Add AdSense to the web app footer and the extension popup
   - Create `web/components/AdUnit.tsx` component
   - Ad unit: 728x90 leaderboard in footer, 300x250 in sidebar
   - Extension: small ad strip at bottom of popup (non-intrusive)
   - *Revenue target: $0.10 CPM → need ~250K impressions for $25*

2. **Domain + DNS** — Point `md-inverter.com` to burnsidecloud-mach1 VM
   - Configure DNS A record → VM's public IP
   - Set up HTTPS via Let's Encrypt

3. **Stripe product setup** — Create real $9 lifetime product
   - Product name: ".MDinverter Pro"
   - Description: "Bulk conversion, custom filenames, RTF clipboard copy"
   - Replace placeholder URL in Converter.tsx

4. **Analytics (privacy-first)** — Add Plausible.io or GoatCounter
   - Track: daily visitors, conversion rate, premium clicks
   - No user tracking, GDPR compliant

### Phase 2: Growth & Optimization

5. **A/B test pricing** — Test $7, $9, $12 lifetime tiers
6. **SEO content** — Add blog section with "Markdown to RTF" guides
7. **Social proof** — Add testimonials from early users
8. **Extension store listing** — Create screenshots, description, promotional text

### Phase 3: Revenue Scale

9. **Ambrosia Treats white-label** — Fork for restaurant menu conversion
10. **Studioburnside integration** — Replace newsletter signup flow
11. **Affiliate program** — 30% commission for tool bloggers/reviewers

---

## 6. CI/CD Pipeline (for Zette's automated workflows)

### Git hooks
```
pre-commit: npm run build (web/)
pre-push: npm test (web/ + python3 -m pytest if tests exist)
```

### GitHub Actions workflow (`.github/workflows/deploy.yml`)
```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd web && npm ci && npm run build
      - run: cd extension && zip -r ../extension.zip *
      - # Upload artifacts
      - # Deploy web/out/ to burnsidecloud-mach1 via SSH
```

### Automated testing
- `npm run build` — fails on TypeScript errors
- Python test suite: `python3 -m pytest` — verify conversion parity

---

## 7. Metrics & KPIs

| Metric | Target (Week 1) | Target (Month 1) |
|---|---|---|
| Daily visitors | 50 | 500 |
| Conversion rate | 2% | 5% |
| Premium sales | 2-3 ($25) | 12 ($108) |
| Extension installs | 10 | 100 |

---

## 8. Risk Assessment

| Risk | Mitigation |
|---|---|
| Chrome Web Store rejection | Test extension thoroughly before submission |
| Stripe payout delay | Use existing Stripe account if available |
| No ad revenue (policy violation) | Keep ads non-intrusive, follow AdSense policies |
| Low conversion | A/B test pricing, add social proof |

---

## Completion Criteria

This HQ spec is **complete** when Zette can:
1. Read this spec + the codebase and understand the product fully
2. Implement Phase 1 tasks without questions
3. Verify all items in Section 3 (Verification Criteria) pass
4. Deploy to burnsidecloud-mach1 following Section 4 (Deployment Guide)

**Acceptance test**: A visitor can go to `md-inverter.com`, paste Markdown, click "Download RTF", and get a valid .rtf file that opens correctly in Pages/Word.