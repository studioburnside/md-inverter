# .MDinverter

> Convert Markdown into rich text (`.rtf`) or clean plaintext — interactively, locally, no cloud required.

[![Python 3.9+](https://img.shields.io/badge/python-3.9%2B-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform: macOS · Linux · Windows](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)]()

---

## What It Does

`.MDinverter` takes Markdown-formatted text — pasted directly into your terminal, piped from another tool, or read from a `.md` file — and converts it to:

- **Rich Text (`.rtf`)** — fully formatted with headings, bold, italic, code blocks, lists, and blockquotes, ready to open in Pages, Word, TextEdit, or Google Docs
- **Plaintext (`.txt`)** — all Markdown syntax stripped away, clean prose ready to paste anywhere

Everything runs **100% locally**. No internet connection, no API keys, no data leaves your machine.

---

## Quick Start

### 1. Install

```bash
# Clone the repo
git clone https://github.com/yourusername/md-inverter.git
cd md-inverter

# Install with uv (recommended)
uv sync
uv pip install -e .

# Or with pip
pip install -e .
```

> After install, the `mdinvert` command is available in your shell.

### 2. Optional dependency

```bash
pip install mistune
```

> `mistune` improves plaintext accuracy via HTML parsing. The script works without it using a built-in regex fallback.

---

## Usage

### Interactive mode (recommended)

Just run `mdinvert` with no arguments — it will guide you through everything:

```bash
mdinvert
```

You'll be prompted to:
1. Paste your Markdown (then press `Ctrl+D`)
2. Choose output format (RTF, plaintext, or both)
3. Choose where to save the file (current directory or a custom path)
4. Choose a filename (or accept the default `[source-name]-inverted.rtf`)

### Convert a file

```bash
mdinvert notes.md
mdinvert -p notes.md          # same, explicit flag
```

The output defaults to `notes-inverted.rtf` in the same folder as the source file. Interactive prompts let you override both.

### Pipe from clipboard or another tool

```bash
# From clipboard (macOS)
pbpaste | mdinvert

# From a file via pipe
cat README.md | mdinvert

# Pipe with explicit format flag (skips format prompt)
pbpaste | mdinvert --rtf
```

### Non-interactive / scripting mode

```bash
# RTF only, default filename, current directory
mdinvert --rtf --no-prompt

# Plaintext only, custom output name
mdinvert --text --out my_document --no-prompt

# Both formats, custom name
mdinvert --both --out report --no-prompt

# Convert a file non-interactively
mdinvert notes.md --rtf --no-prompt
```

---

## Command Reference

```
mdinvert [file] [options]
```

| Argument / Flag | Description |
| :-- | :-- |
| `file` | Path to a `.md` file to convert (positional) |
| `-p FILE`, `--path FILE` | Path to a `.md` file to convert (explicit flag) |
| `--rtf` | Output RTF only |
| `--text` | Output plaintext only |
| `--both` | Output both RTF and plaintext |
| `--out NAME` | Override output filename base (no extension); skips filename prompt |
| `--no-prompt` | Skip all interactive prompts; use defaults |
| `-h`, `--help` | Show help and exit |

### Default output filename

When no `--out` is given, the output filename is derived from the source:

| Input source | Default output name |
| :-- | :-- |
| `mdinvert notes.md` | `notes-inverted.rtf` |
| `pbpaste \| mdinvert` | `output-inverted.rtf` |
| `mdinvert` (paste mode) | `output-inverted.rtf` |

---

## Supported Markdown

| Element | RTF Output | Plaintext Output |
| :-- | :-- | :-- |
| `# H1` – `###### H6` | Scaled font sizes | Heading text only |
| `**bold**`, `__bold__` | Bold (`\b`) | Plain text |
| `*italic*`, `_italic_` | Italic (`\i`) | Plain text |
| `~~strikethrough~~` | Strikethrough (`\strike`) | Plain text |
| `` `inline code` `` | Courier New, 11pt | Plain text |
| ```` ```code blocks``` ```` | Monospace block | Plain text |
| `- unordered lists` | Bulleted, indented | Plain text |
| `1. ordered lists` | Numbered, indented | Plain text |
| `> blockquotes` | Indented italic | Plain text |
| `[link](url)` | Display text only | Display text only |
| `---` horizontal rule | Border rule | Removed |
| Em-dashes `—`, smart quotes, ellipsis `…` | Correct RTF Unicode escapes (`\uN `) | Preserved as-is |

> **Note on special characters:** Em-dashes (`—`), curly quotes, ellipses, and all other non-ASCII characters are encoded as RTF Unicode escapes (`\u8212 ` etc.) so they render correctly in all RTF readers — not as `?`.

---

## Project Structure

```
md-inverter/
├── md_inverter.py      # Core script — all logic self-contained
├── pyproject.toml      # Project definition + mdinvert entry point
├── requirements.txt    # Optional: mistune only
├── uv.lock             # Fully pinned dependency lock
├── .gitignore
└── README.md
```

---

## Setup with `uv` (recommended)

[`uv`](https://github.com/astral-sh/uv) is the modern Python package manager — faster than pip, handles virtual environments and lock files automatically.

```bash
# Install uv (once)
brew install uv

# Clone and set up the project
git clone https://github.com/yourusername/md-inverter.git
cd md-inverter
uv sync                  # Creates .venv and installs deps from uv.lock
uv pip install -e .      # Registers the mdinvert shell command

# Run
mdinvert
uv run mdinvert          # Alternative if mdinvert isn't on your PATH
```

To generate a `requirements.txt` for legacy tooling:

```bash
uv export --format requirements-txt > requirements.txt
```

---

## Clipboard Behavior by Platform

| Platform | `--text` clipboard | `--rtf` clipboard |
| :-- | :-- | :-- |
| macOS | `pbcopy` (plaintext) | `osascript` (native rich text) |
| Linux | `xclip` (plaintext) | Raw RTF string |
| Windows | `clip` (plaintext) | Raw RTF string |

On macOS with `--rtf`, the clipboard receives actual rich text — paste directly into Pages, Mail, Notes, or any RTF-aware app and formatting is preserved.

---

## Roadmap

### iOS App — `.MDinverter for iOS`

The core conversion logic (`md_to_rtf`, `md_to_plaintext`) is intentionally isolated with no side effects, written specifically to be portable to a native iOS app.

**Planned iOS experience:**

- Paste Markdown into a clean, focused text editor
- One-tap export to RTF (share sheet → Pages, Mail, etc.) or copy as plaintext
- Shortcuts / Share Extension support — invoke from any app that can share text
- iCloud sync of recent conversions
- Offline-first, zero network calls — same privacy guarantee as the CLI

**Web App (planned):**

- Minimal two-panel interface: Markdown in → rich preview out
- `/convert` API endpoint (FastAPI) — same Python core functions, HTTP-wrapped
- Self-hostable; intended as the backend for the iOS app

---

## Privacy

- No network requests of any kind
- No telemetry, analytics, or logging
- All processing happens in-process, in memory
- Output files written only to your specified path

---

## Dependencies

| Package | Purpose | Required? |
| :-- | :-- | :-- |
| `mistune` | Accurate MD→HTML→text parsing | Optional |
| Python stdlib only | Regex fallback + RTF writer | Always available |

The RTF writer is hand-rolled and pure Python — no Pandoc, no `textutil`, no native binaries. This keeps the script fully portable to iOS Python runtimes (Pythonista, Pyto).

---

## License

MIT — free to use, modify, and distribute. See [LICENSE](LICENSE).

---

*Built by studioburnside · Part of the `.MDinverter` project · iOS app coming soon*
