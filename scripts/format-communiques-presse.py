#!/usr/bin/env python3
"""Reformate les communiqués de presse : blocs infos en lignes séparées, gras décollés."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "src" / "content" / "articles"


def format_body(body: str) -> str:
    body = body.replace("p****alais", "palais")
    body = body.replace("****Marché", "**Marché")
    body = body.replace("Marché de la Croix de Chavaux,****", "Marché de la Croix de Chavaux,**\n**")

    # « aura lieu » / « : » scindés en deux blocs gras (Word / script)
    body = re.sub(
        r"(\*\*Le \d+ème Marché des Vins Bio de Montreuil aura lieu)\*\*\s*\*\*:\*\*",
        r"\1 :**",
        body,
    )
    body = re.sub(
        r"(\*\*Le \d+ème Marché des Vins Bio de Montreuil aura lieu)\*\*\s*\n\*\*:\*\*",
        r"\1 :**",
        body,
    )
    # « …Chavaux**Quand » collé
    body = re.sub(r"(\*\*[^*]+\*\*)Quand", r"\1\n\nQuand", body)

    # Saut de paragraphe avant le bloc « Le Nᵉ marché… » / annonce
    body = re.sub(r"([.!?…»])\s+(\*\*Le \d)", r"\1\n\n\2", body)
    body = re.sub(r"([.!?…»])\s+(\*\*le \d)", r"\1\n\n\2", body)
    body = re.sub(r"([.!?…»])\s+(\*\*LE \d)", r"\1\n\n\2", body)

    # Deux groupes gras consécutifs séparés par des espaces / espaces insécables
    for _ in range(30):
        new = re.sub(r"(\*\*[^*]+\*\*)\s{2,}(\*\*)", r"\1\n\2", body)
        if new == body:
            break
        body = new

    for _ in range(30):
        new = re.sub(r"(\*\*[^*]+\*\*) (\*\*[^*]+\*\*)", r"\1\n\2", body)
        if new == body:
            break
        body = new

    # Lignes uniquement des espaces / NBSP issus du copier-coller Word
    lines = [ln.rstrip() for ln in body.split("\n")]
    body = "\n".join(lines)
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body.strip() + "\n"


def main() -> None:
    paths = sorted(
        ARTICLES.glob("communique*.md"),
        key=lambda p: p.name,
    )
    for path in paths:
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---"):
            continue
        m = re.match(r"(---\n.*?\n---\n\n)(.*)$", text, re.DOTALL)
        if not m:
            continue
        fm, body = m.group(1), m.group(2)
        path.write_text(fm + format_body(body), encoding="utf-8")
        print(path.name)


if __name__ == "__main__":
    main()
