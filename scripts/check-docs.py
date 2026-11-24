#!/usr/bin/env python3
"""Checks the documentation of the repository. Run from anywhere: python scripts/check-docs.py

What it checks (it exits with 1 and lists every problem):
  1. every relative link in every Markdown file points to a file or folder that exists;
  2. a link to a heading (file.md#heading) points to a heading that exists;
  3. every document has its counterpart in the other language, at the mirrored path
     (docs/x/Y.md <-> docs/pt-BR/x/Y.md, README.md <-> README.pt-BR.md);
  4. the language tab on the third line of each document points to that counterpart.

Plain standard library, so it runs anywhere Python does and in CI without installing anything.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True).stdout.strip())
LINK = re.compile(r"(?<!\!)\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
SKIP_PREFIXES = ("http://", "https://", "mailto:", "tel:", "#")


def tracked_markdown() -> list[Path]:
    out = subprocess.run(["git", "ls-files", "*.md"], capture_output=True, text=True, check=True, cwd=ROOT).stdout.split("\n")
    return [ROOT / p for p in out if p and (ROOT / p).exists()]


def strip_code(text: str) -> str:
    """Links inside code fences and inline code are examples, not links."""
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    return re.sub(r"`[^`\n]*`", "", text)


def slug(heading: str) -> str:
    """GitHub's heading anchor: lower case, markup dropped, spaces to dashes, punctuation removed."""
    h = re.sub(r"[`*_]", "", heading.strip().lower())
    h = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", h)
    h = re.sub(r"[^\w\- ]", "", h, flags=re.U)
    return h.replace(" ", "-")


def anchors_of(path: Path) -> set[str]:
    seen: dict[str, int] = {}
    anchors = set()
    in_fence = False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
        if in_fence:
            continue
        m = HEADING.match(line)
        if m:
            s = slug(m.group(2))
            n = seen.get(s, 0)
            seen[s] = n + 1
            anchors.add(s if n == 0 else f"{s}-{n}")
    return anchors


def counterpart(rel: Path) -> Path | None:
    """The same document in the other language, or None for files that are not translated (code, assets)."""
    parts = rel.parts
    name = rel.name
    if name == "README.pt-BR.md":
        return rel.with_name("README.md")
    if parts[0] == "docs":
        if parts[1] == "pt-BR":
            return Path("docs", *parts[2:])
        return Path("docs", "pt-BR", *parts[1:])
    if name == "README.md" and len(parts) >= 1:
        return rel.with_name("README.pt-BR.md")
    return None


def main() -> int:
    problems: list[str] = []
    files = tracked_markdown()
    tracked = {f.relative_to(ROOT) for f in files}

    for f in files:
        rel = f.relative_to(ROOT)
        text = f.read_text(encoding="utf-8")

        # 1 and 2: links and anchors
        for target in LINK.findall(strip_code(text)):
            if target.startswith(SKIP_PREFIXES):
                continue
            path_part, _, frag = target.partition("#")
            dest = (f.parent / path_part).resolve()
            if not dest.exists():
                problems.append(f"{rel}: broken link -> {target}")
                continue
            if frag and dest.suffix == ".md" and slug(frag) not in anchors_of(dest) and frag not in anchors_of(dest):
                problems.append(f"{rel}: missing heading -> {target}")

        # 3 and 4: the other language
        if rel.name == "CLAUDE.md" or rel.parts[0] in ("e2e", "backend", "frontend") and rel.name not in ("README.md", "README.pt-BR.md"):
            continue
        if rel.parts[:2] == ("docs", "design") and rel.suffix != ".md":
            continue
        other = counterpart(rel)
        if other is None:
            continue
        if other not in tracked:
            problems.append(f"{rel}: no counterpart in the other language (expected {other})")
            continue
        tab = " ".join(text.splitlines()[2:3])
        if other.name not in tab:
            problems.append(f"{rel}: the language tab on line 3 does not point to {other.name}")

    if problems:
        print("\n".join(sorted(problems)))
        print(f"\n{len(problems)} problem(s) in {len(files)} Markdown files")
        return 1
    print(f"ok: {len(files)} Markdown files, every link resolves, every document has its counterpart in the other language")
    return 0


if __name__ == "__main__":
    sys.exit(main())
