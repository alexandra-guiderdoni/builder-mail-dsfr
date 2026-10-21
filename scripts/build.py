"""Génère les deux distributions sans dépendance au-delà de Python 3."""

import argparse
import base64
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "prototype/source"
REFERENCE = ROOT / "prototype/reference"
DIST = ROOT / "prototype/distribution"


def data_image(name):
    return (
        "data:image/png;base64,"
        + base64.b64encode((REFERENCE / name).read_bytes()).decode()
    )


def build():
    script = (
        "\n".join(
            path.read_text()
            for path in [REFERENCE / "snum-packet.js"]
            + [
                SOURCE / name
                for name in [
                    "model.js",
                    "render-mail.js",
                    "draft-store.js",
                    "editor.js",
                ]
            ]
        )
        .replace("@@DEMO_IMAGE@@", data_image("placeholder.16x9.png"))
        .replace("@@LOGO@@", data_image("Marianne-Light@2x.png"))
    )
    script_hash = base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
    shell = (SOURCE / "shell.html").read_text()
    for key, value in {
        "SCRIPT": script,
        "STYLE": (SOURCE / "style.css").read_text(),
    }.items():
        shell = shell.replace(f"@@{key}@@", value)
    base_csp = f"default-src 'none'; script-src 'sha256-{script_hash}'; style-src 'unsafe-inline'; img-src data: blob:; frame-src blob:; base-uri 'none'; form-action 'none'; "
    portable = shell.replace("@@MANIFEST@@", "").replace(
        "@@CSP@@", base_csp + "connect-src 'none'; worker-src 'none'"
    )
    web = shell.replace(
        "@@MANIFEST@@", '<link rel="manifest" href="./manifest.webmanifest">'
    ).replace(
        "@@CSP@@",
        base_csp + "connect-src 'self'; worker-src 'self'; manifest-src 'self'",
    )
    version = hashlib.sha256(web.encode()).hexdigest()[:16]
    manifest = {
        "name": "Builder mail DSFR — prototype",
        "short_name": "Mail DSFR",
        "id": "./",
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "lang": "fr",
        "background_color": "#ffffff",
        "theme_color": "#000091",
        "icons": [
            {
                "src": "./icon.svg",
                "sizes": "any",
                "type": "image/svg+xml",
                "purpose": "any",
            }
        ],
    }
    return {
        DIST / "portable.html": portable,
        DIST / "web/index.html": web,
        DIST / "web/sw.js": (SOURCE / "sw.js")
        .read_text()
        .replace("@@VERSION@@", version),
        DIST / "web/manifest.webmanifest": json.dumps(
            manifest, ensure_ascii=False, indent=2
        )
        + "\n",
        DIST / "web/icon.svg": (SOURCE / "icon.svg").read_text(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for path, content in build().items():
        if args.check:
            if not path.exists() or path.read_text() != content:
                raise SystemExit(f"DIFFERENT : {path.relative_to(ROOT)}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
    print("DISTRIBUTIONS_OK" if args.check else "DISTRIBUTIONS_GENEREES")


if __name__ == "__main__":
    main()
