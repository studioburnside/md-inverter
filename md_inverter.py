#!/usr/bin/env python3
"""
md_inverter.py — Markdown → RTF (.rtf) or Plaintext
-----------------------------------------------------
Deps:  pip install mistune   (pure Python, iOS-compatible)

Usage:
  mdinvert                          → interactive mode (paste Markdown)
  mdinvert path/to/file.md          → convert a file
  mdinvert -p path/to/file.md       → convert a file (explicit flag)
  mdinvert --rtf                    → RTF only (non-interactive flags still work)
  mdinvert --text                   → plaintext only
  mdinvert --both                   → both RTF and plaintext

  Pipe input:  echo "**hello**" | mdinvert
"""

import sys, re, argparse, subprocess, platform
from pathlib import Path
from typing import Optional

try:
    import mistune
    _HAVE_MISTUNE = True
except ImportError:
    _HAVE_MISTUNE = False

# ─── 1. INPUT ────────────────────────────────────────────────────────────────
def get_input(path: Optional[str] = None) -> str:
    """Read Markdown from a file path, stdin pipe, or interactive paste."""
    if path:
        p = Path(path)
        if not p.exists():
            print(f"  ✗ File not found: {path}")
            sys.exit(1)
        return p.read_text(encoding="utf-8")
    if not sys.stdin.isatty():
        return sys.stdin.read()
    print("Paste Markdown below. Press Ctrl+D when done:\n")
    lines = []
    try:
        while True:
            lines.append(input())
    except EOFError:
        pass
    return "\n".join(lines)

# ─── 2. INTERACTIVE PROMPTS ──────────────────────────────────────────────────
def ask_save_directory(source_path: Optional[str]) -> Path:
    """Ask the user where to save the output file."""
    cwd = Path.cwd()
    if source_path:
        source_dir = Path(source_path).resolve().parent
        default_label = f"same folder as source ({source_dir})"
        default_dir = source_dir
    else:
        default_label = f"current directory ({cwd})"
        default_dir = cwd

    print(f"\n  Where should the output be saved?")
    print(f"  [1] {default_label}  ← default")
    print(f"  [2] Enter a custom path")
    choice = input("  Choice [1]: ").strip()

    if choice == "2":
        custom = input("  Enter directory path: ").strip()
        out_dir = Path(custom).expanduser().resolve()
        if not out_dir.exists():
            create = input(f"  Directory doesn't exist. Create it? [y/N]: ").strip().lower()
            if create == "y":
                out_dir.mkdir(parents=True, exist_ok=True)
                print(f"  ✓ Created: {out_dir}")
            else:
                print("  Using default directory instead.")
                out_dir = default_dir
        return out_dir
    return default_dir

def ask_output_filename(source_path: Optional[str], suffix: str) -> str:
    """Ask the user for an output filename (without extension)."""
    if source_path:
        stem = Path(source_path).stem
        default_name = f"{stem}-inverted"
    else:
        default_name = "output-inverted"

    print(f"\n  Output filename (without extension):")
    print(f"  [default: {default_name}{suffix}]")
    name = input(f"  Filename [{default_name}]: ").strip()
    return name if name else default_name

# ─── 3. PLAINTEXT ────────────────────────────────────────────────────────────
def md_to_plaintext(md: str) -> str:
    if _HAVE_MISTUNE:
        html = str(mistune.html(md))
        text = re.sub(r"<[^>]+>", "", html)
        for ent, rep in [("&amp;","&"),("&lt;","<"),("&gt;",">"),("&quot;","''"),("&#39;","'")]:
            text = text.replace(ent, rep)
        return text.strip()
    # Regex fallback (zero deps)
    t = md
    t = re.sub(r"^#{1,6}\s+", "", t, flags=re.MULTILINE)
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = re.sub(r"__(.+?)__", r"\1", t)
    t = re.sub(r"\*(.+?)\*", r"\1", t)
    t = re.sub(r"_(.+?)_", r"\1", t)
    t = re.sub(r"~~(.+?)~~", r"\1", t)
    t = re.sub(r"`{3}.*?`{3}", "", t, flags=re.DOTALL)
    t = re.sub(r"`(.+?)`", r"\1", t)
    t = re.sub(r"!\[.*?\]\(.*?\)", "", t)
    t = re.sub(r"\[(.+?)\]\(.*?\)", r"\1", t)
    t = re.sub(r"^[-*+]\s+", "", t, flags=re.MULTILINE)
    t = re.sub(r"^\d+\.\s+", "", t, flags=re.MULTILINE)
    t = re.sub(r"^>\s+", "", t, flags=re.MULTILINE)
    t = re.sub(r"^---+$", "", t, flags=re.MULTILINE)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()

# ─── 4. RTF ──────────────────────────────────────────────────────────────────
def _rtf_escape(s: str) -> str:
    """Escape a string for RTF, encoding non-ASCII characters as Unicode escapes.

    RTF \\uN; syntax: the character after the semicolon is the fallback for
    readers that don't support Unicode — we use a space instead of '?' so that
    em-dashes and other Unicode characters are not rendered as question marks.
    """
    out = []
    for ch in s:
        if ch == "\\": out.append("\\\\")
        elif ch == "{": out.append("\\{")
        elif ch == "}": out.append("\\}")
        elif ord(ch) > 127:
            # Use a space as the RTF fallback character (instead of '?')
            # so that Unicode chars like em-dash (—, U+2014) render correctly
            # in RTF readers that support \uN and don't show the fallback.
            out.append(f"\\u{ord(ch)} ")
        else:
            out.append(ch)
    return "".join(out)

def _rtf_doc(body: str, font: str = "Helvetica Neue", size_pt: int = 12) -> str:
    fs = size_pt * 2
    return ("{\\rtf1\\ansi\\ansicpg1252\\uc1\\cocoartf2639"
            "{\\fonttbl\\f0\\fswiss\\fcharset0 " + font + ";"
            "\\f1\\fmodern\\fcharset0 Courier New;}"
            "{\\colortbl;\\red0\\green0\\blue0;}"
            "\\paperw12240\\paperh15840\\margl1440\\margr1440"
            f"\n\\f0\\fs{fs} \\cf1 \n"
            + body + "\n}")

def _inline_rtf(text: str) -> str:
    """Convert inline Markdown to RTF, escaping all non-ASCII in plain-text runs."""
    # Use a sentinel to split the string into RTF-already-escaped chunks vs plain text.
    # Strategy: replace each Markdown span with a placeholder, escape the plain-text
    # remainder, then restore the RTF spans.
    PLACEHOLDER = "\x00RTF\x00"
    rtf_spans = []

    def _store(rtf_chunk: str) -> str:
        rtf_spans.append(rtf_chunk)
        return PLACEHOLDER

    text = re.sub(r"\*\*(.+?)\*\*", lambda m: _store("{\\b " + _rtf_escape(m.group(1)) + "}"), text)
    text = re.sub(r"__(.+?)__",     lambda m: _store("{\\b " + _rtf_escape(m.group(1)) + "}"), text)
    text = re.sub(r"\*(.+?)\*",     lambda m: _store("{\\i " + _rtf_escape(m.group(1)) + "}"), text)
    text = re.sub(r"_(.+?)_",       lambda m: _store("{\\i " + _rtf_escape(m.group(1)) + "}"), text)
    text = re.sub(r"~~(.+?)~~",     lambda m: _store("{\\strike " + _rtf_escape(m.group(1)) + "}"), text)
    text = re.sub(r"`(.+?)`",       lambda m: _store("{\\f1\\fs22 " + _rtf_escape(m.group(1)) + "}"), text)
    text = re.sub(r"\[(.+?)\]\(.*?\)", lambda m: _store(_rtf_escape(m.group(1))), text)

    # Escape all plain-text segments (everything between placeholders)
    parts = text.split(PLACEHOLDER)
    escaped_parts = [_rtf_escape(part) for part in parts]

    # Reassemble: interleave escaped plain text with stored RTF spans
    result = []
    for i, plain in enumerate(escaped_parts):
        result.append(plain)
        if i < len(rtf_spans):
            result.append(rtf_spans[i])
    return "".join(result)

def md_to_rtf(md: str) -> str:
    lines = md.split("\n")
    parts = []
    in_code = False
    code_buf = []
    for line in lines:
        if line.startswith("```"):
            if not in_code:
                in_code = True; code_buf = []
            else:
                in_code = False
                escaped = _rtf_escape("\n".join(code_buf)).replace("\n", "\\line\n")
                parts.append("{\\pard\\f1\\fs20 " + escaped + "\\par}")
            continue
        if in_code:
            code_buf.append(line); continue
        s = line.rstrip()
        m = re.match(r"^(#{1,6})\s+(.*)", s)
        if m:
            fs = {1:36,2:30,3:26,4:22,5:20,6:18}.get(len(m.group(1)), 24)
            parts.append(f"{{\\pard\\sb240\\sa120\\b\\fs{fs} {_inline_rtf(m.group(2))}\\par}}")
            continue
        if re.match(r"^[-*_]{3,}$", s):
            parts.append(r"{\pard\brdrb\brdrs\brdrw10\brsp20 \par}"); continue
        m = re.match(r"^>\s?(.*)", s)
        if m:
            parts.append(f"{{\\pard\\li720\\ri720\\i {_inline_rtf(m.group(1))}\\par}}")
            continue
        m = re.match(r"^[-*+]\s+(.*)", s)
        if m:
            parts.append(f"{{\\pard\\li360\\fi-360\\bullet\\tx360\\tab {_inline_rtf(m.group(1))}\\par}}")
            continue
        m = re.match(r"^(\d+)\.\s+(.*)", s)
        if m:
            parts.append(f"{{\\pard\\li360\\fi-360 {_rtf_escape(m.group(1))}.\\tab {_inline_rtf(m.group(2))}\\par}}")
            continue
        if not s:
            parts.append(r"{\pard\sa80\par}"); continue
        parts.append(f"{{\\pard\\sa120 {_inline_rtf(s)}\\par}}")
    return _rtf_doc("\n".join(parts))

# ─── 5. CLIPBOARD ────────────────────────────────────────────────────────────
def copy_text(text: str):
    os_name = platform.system()
    try:
        if os_name == "Darwin":
            subprocess.run("pbcopy", input=text.encode(), check=True)
        elif os_name == "Linux":
            subprocess.run(["xclip","-selection","clipboard"], input=text.encode(), check=True)
        elif os_name == "Windows":
            subprocess.run("clip", input=text.encode("utf-16"), check=True)
        print("  ✓ Copied to clipboard.")
    except Exception as e:
        print(f"  ⚠ Clipboard copy failed: {e}")

def copy_rtf_macos(rtf_path: Path):
    """Use osascript to set clipboard to RTF rich text (macOS only)."""
    osa = ('tell application "Finder"\n'
           f'set rtfFile to (POSIX file "{rtf_path.resolve()}") as alias\n'
           'set rtfData to read rtfFile as «class RTF »\n'
           'set the clipboard to rtfData\n'
           'end tell')
    try:
        subprocess.run(["osascript", "-e", osa], check=True)
        print("  ✓ RTF rich text copied to clipboard (macOS).")
    except Exception as e:
        print(f"  ⚠ osascript failed: {e} — open the .rtf file directly.")

# ─── 6. MAIN ─────────────────────────────────────────────────────────────────
def main():
    p = argparse.ArgumentParser(
        prog="mdinvert",
        description="Convert Markdown to RTF or plaintext — interactively or via flags.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  mdinvert                          # interactive: paste Markdown, answer prompts
  mdinvert notes.md                 # convert a file (interactive prompts for output)
  mdinvert -p notes.md              # same, explicit flag
  mdinvert --rtf --out my_doc       # non-interactive, legacy-style flags
  pbpaste | mdinvert                # pipe from clipboard (macOS)
        """,
    )

    # Positional: optional file path (mdinvert notes.md)
    p.add_argument("file", nargs="?", default=None,
                   help="Path to a Markdown file to convert")

    # Explicit path flag (mdinvert -p notes.md)
    p.add_argument("-p", "--path", dest="path_flag", default=None,
                   metavar="FILE", help="Path to a Markdown file to convert")

    # Output format flags
    p.add_argument("--rtf",  action="store_true", help="Save .rtf + copy rich text to clipboard")
    p.add_argument("--text", action="store_true", help="Save .txt + copy plaintext to clipboard")
    p.add_argument("--both", action="store_true", help="Do both RTF and plaintext")

    # Legacy output name override (non-interactive)
    p.add_argument("--out", default=None,
                   help="Output filename base, no extension (skips interactive filename prompt)")

    # Non-interactive flag: skip all prompts, use defaults
    p.add_argument("--no-prompt", action="store_true",
                   help="Skip interactive prompts, use defaults (current dir, default filename)")

    args = p.parse_args()

    # Resolve source path: positional wins over -p flag
    source_path = args.file or args.path_flag

    # Determine if we're in interactive mode
    # Interactive = no format flags given AND not piping stdin
    format_flags_given = args.rtf or args.text or args.both
    piping = not sys.stdin.isatty() and source_path is None
    interactive = not format_flags_given and not piping and not args.no_prompt

    # ── Read input ──────────────────────────────────────────────────────────
    print("\n╔══════════════════════════════╗")
    print("║       .MDinverter  v2        ║")
    print("╚══════════════════════════════╝\n")

    md = get_input(source_path)
    if not md.strip():
        print("No input. Exiting.")
        sys.exit(0)

    # ── Determine output format ──────────────────────────────────────────────
    if interactive:
        print("  What format do you want?")
        print("  [1] RTF (.rtf)  ← default")
        print("  [2] Plaintext (.txt)")
        print("  [3] Both")
        fmt = input("  Choice [1]: ").strip()
        do_rtf  = fmt in ("", "1", "3")
        do_text = fmt in ("2", "3")
    else:
        do_rtf  = args.rtf  or args.both or (not format_flags_given and not piping)
        do_text = args.text or args.both

    # ── Determine output directory ───────────────────────────────────────────
    if interactive and not args.no_prompt:
        out_dir = ask_save_directory(source_path)
    else:
        if source_path:
            out_dir = Path(source_path).resolve().parent
        else:
            out_dir = Path.cwd()

    # ── Determine output filename ────────────────────────────────────────────
    suffix = ".rtf" if do_rtf and not do_text else (".txt" if do_text and not do_rtf else ".rtf/.txt")
    if args.out:
        # --out flag: use as-is, no prompt
        base_name = args.out
    elif interactive and not args.no_prompt:
        base_name = ask_output_filename(source_path, suffix)
    else:
        if source_path:
            base_name = f"{Path(source_path).stem}-inverted"
        else:
            base_name = "output-inverted"

    print()

    # ── RTF output ───────────────────────────────────────────────────────────
    if do_rtf:
        rtf = md_to_rtf(md)
        out = (out_dir / base_name).with_suffix(".rtf")
        # Write as UTF-8; RTF Unicode escapes (\uN ) handle non-ASCII correctly
        out.write_text(rtf, encoding="utf-8")
        print(f"  [RTF] Saved → {out}")
        if platform.system() == "Darwin":
            copy_rtf_macos(out)
        else:
            copy_text(rtf)

    # ── Plaintext output ─────────────────────────────────────────────────────
    if do_text:
        plain = md_to_plaintext(md)
        out = (out_dir / base_name).with_suffix(".txt")
        out.write_text(plain, encoding="utf-8")
        print(f"  [TXT] Saved → {out}")
        print("\n── Plaintext Preview ──────────────────────────")
        print(plain[:800] + ("…" if len(plain) > 800 else ""))
        print("─" * 46)
        copy_text(plain)

    print("\n  ✓ Done.\n")

if __name__ == "__main__":
    main()
