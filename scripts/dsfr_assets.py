"""Incorpore le sous-ensemble DSFR épinglé, sans accès réseau ni outil externe."""

import base64
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "reference/dsfr-web"


def styles():
    manifest = json.loads((ROOT / "provenance.json").read_text(encoding="utf-8"))
    for name, expected in manifest["files_sha256"].items():
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != expected:
            raise ValueError(f"Ressource DSFR différente : {name}")

    def inline(path):
        path = path.resolve()
        name = path.relative_to(ROOT.resolve()).as_posix()
        if name not in manifest["files_sha256"]:
            raise ValueError(f"Ressource DSFR non inventoriée : {name}")
        mime = "font/woff2" if path.suffix == ".woff2" else "image/svg+xml"
        return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()

    result = []
    for name in manifest["css"]:
        path = ROOT / name
        css = re.sub(r"@font-face\s*\{[^}]*\}", "", path.read_text(encoding="utf-8"))
        css = re.sub(r"/\*[#@] sourceMappingURL=.*?\*/", "", css)

        def replace(match, parent=path.parent):
            value = match[1].strip().strip("\"'")
            return (
                match[0]
                if value.startswith("data:")
                else f'url("{inline(parent / value)}")'
            )

        result.append(re.sub(r"url\(([^)]+)\)", replace, css))
    for weight, name in manifest["fonts"].items():
        result.append(
            f"@font-face{{font-family:Marianne;font-style:normal;font-weight:{weight};"
            f'font-display:swap;src:url("{inline(ROOT / name)}") format("woff2");}}'
        )
    return "\n".join(result)
