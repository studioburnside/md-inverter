# AGENTS.md — md-inverter Web + Extension

> **md-inverter** is a self-contained Markdown→RTF/plaintext converter: a web app
> (Next.js) and a browser extension (Manifest V3). This file tells every agent
> how to read, modify, and extend this codebase without surprises.

## Quick start

```bash
cd web
npm install
npm run dev    # http://localhost:3200
```

## Architecture

```
md-inverter/
├── web/                    # Next.js 15 (App Router) — the core product
│   ├── app/
│   │   ├── layout.tsx      # Root layout + metadata
│   │   ├── page.tsx        # Landing page (renders <Converter />)
│   │   └── globals.css     # Tailwind + House-Style palette (CSS vars)
│   ├── components/
│   │   └── Converter.tsx   # Two-panel Markdown↔RTF converter
│   ├── lib/
│   │   └── markdown-to-rtf.ts  # Core conversion logic (ported from Python)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── extension/              # Chrome/Firefox extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html          # Popup UI
│   ├── popup.js            # Conversion logic (inline, no imports)
│   └── icons/              # Extension icons (16/32/48/128px)
├── md_inverter.py          # Original Python CLI (do NOT delete — the source of truth)
├── AGENTS.md               # This file
└── .gitignore
```

## Core conversion logic

The TypeScript conversion logic in `web/lib/markdown-to-rtf.ts` is a port of the
Python logic in `md_inverter.py`. **Keep them in sync.** The extension's
`popup.js` also contains an inline copy of the logic (no imports for MV3
isolation). Three copies exist:

1. `md_inverter.py` — original Python (source of truth)
2. `web/lib/markdown-to-rtf.ts` — TypeScript for the web app
3. `extension/popup.js` — JavaScript for the browser extension

When modifying conversion behavior, update all three.

**NOT part of the sync set:** `web/lib/markdown-preview.tsx` renders a visual
preview for the paper pane only. If conversion behavior changes visibly,
update it for looks — but it never defines output bytes.

## House Style

The project uses the Studio Burnside palette (see FLEET.md HOUSE-STYLE.md):
- **Night mode (default)**: `#17090e` bg, `#221219` surface, gold `#D4AF37` accents
- **Day mode**: `#FAF3E7` bg, `#F3E7D3` surface, brass `#A67C00` accents
- **Never hardcode hex values** — use CSS variables `--bs-*`

## Monetization

- **Web**: Free tier with $9 one-time Stripe checkout (product ID in Converter.tsx)
- **Extension**: Always free (acquisition funnel)
- **Premium features**: Bulk conversion, custom filenames, RTF clipboard copy

## Security

- **Never commit `.env` files** — they are in .gitignore
- **Never commit API keys** — Stripe keys, ad network keys, etc. go in `.env.local`
- **Never commit generated files** — check .gitignore
- The extension's `popup.js` contains no external network calls

## Testing

After changes:
1. Run the web app: `cd web && npm run dev`
2. Test conversion: paste Markdown, verify RTF/plaintext output
3. Test premium toggle (click "Go Premium")
4. For extension: load `extension/` as unpacked in chrome://extensions
5. Test context menu: right-click on selected Markdown text

## Deployment

- Web: deploy `web/` to Vercel/Netlify/anywhere (static export supported)
- Extension: package `extension/` directory, upload to Chrome Web Store
- Host on burnsidecloud-mach1 VM (port 3200) for staging

## Conventions

- All timestamps in UTC
- No external analytics (no GA, Plausible, etc.) — privacy first
- Extension must work offline (no network calls in popup.js)
- Premium state is stored in localStorage (no server-side accounts)

## Related

- [family-tree FLEET.md](https://github.com/studioburnside/family-tree/blob/main/FLEET.md)
- [family-tree HOUSE-STYLE.md](https://github.com/studioburnside/family-tree/blob/main/HOUSE-STYLE.md)
- [family-tree SANDBOX-PLAYBOOK.md](https://github.com/studioburnside/family-tree/blob/main/SANDBOX-PLAYBOOK.md)