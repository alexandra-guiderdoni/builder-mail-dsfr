"""Assemble l’application portable et web depuis le même catalogue et les mêmes sources."""

import argparse
import base64
import hashlib
import json
from pathlib import Path

from catalogue import compile_catalogue
from interchange import artifacts

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "app/source"
DIST = ROOT / "app/distribution"


def build():
    catalogue = compile_catalogue()
    payload = (
        json.dumps(catalogue, ensure_ascii=False, separators=(",", ":"))
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
    )
    core = [
        "window.MailBuilder = {};",
        "window.MailBuilder.catalog = " + payload + ";",
        (ROOT / "shared/image-files.js").read_text(encoding="utf-8"),
        (SOURCE / "model.js").read_text(encoding="utf-8"),
        (SOURCE / "render.js").read_text(encoding="utf-8"),
    ]
    scripts = core + [
        (SOURCE / name).read_text(encoding="utf-8")
        for name in [
            "imports.js",
            "storage.js",
            "state.js",
            "view.js",
            "files.js",
            "library-actions.js",
            "library.js",
            "editor.js",
            "pwa.js",
        ]
    ]
    script = "\n".join(scripts)
    digest = base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
    shell = (
        (SOURCE / "shell.html")
        .read_text(encoding="utf-8")
        .replace(
            "@@STYLE@@",
            (SOURCE / "style.css").read_text(encoding="utf-8")
            + (SOURCE / "library.css").read_text(encoding="utf-8"),
        )
        .replace("@@SCRIPT@@", script)
    )
    csp = f"default-src 'none';script-src 'sha256-{digest}';style-src 'unsafe-inline';img-src data: blob:;frame-src blob:;base-uri 'none';form-action 'none';"
    portable = shell.replace("@@MANIFEST@@", "").replace(
        "@@CSP@@", csp + "connect-src 'none';worker-src 'none'"
    )
    web = shell.replace(
        "@@MANIFEST@@", '<link rel="manifest" href="./manifest.webmanifest">'
    ).replace(
        "@@CSP@@",
        csp.replace("img-src data: blob:", "img-src 'self' data: blob:")
        + "connect-src 'self';worker-src 'self';manifest-src 'self'",
    )
    snum_script = "\n".join(
        core
        + [
            (ROOT / "prototype/reference/snum-packet.js").read_text(encoding="utf-8"),
            (ROOT / "app/snum/adapter.js").read_text(encoding="utf-8"),
            (SOURCE / "files.js").read_text(encoding="utf-8"),
            (ROOT / "app/snum/page.js").read_text(encoding="utf-8"),
        ]
    )
    snum_digest = base64.b64encode(
        hashlib.sha256(snum_script.encode()).digest()
    ).decode()
    snum = (
        (ROOT / "app/snum/shell.html")
        .read_text(encoding="utf-8")
        .replace(
            "@@STYLE@@",
            (SOURCE / "style.css").read_text(encoding="utf-8")
            + (ROOT / "app/snum/style.css").read_text(encoding="utf-8"),
        )
        .replace("@@SCRIPT@@", snum_script)
        .replace(
            "@@CSP@@",
            csp.replace(digest, snum_digest) + "connect-src 'none';worker-src 'none'",
        )
    )
    manifest = {
        "id": "./",
        "name": "Atelier de courriels DSFR",
        "short_name": "Courriels DSFR",
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "lang": "fr",
        "background_color": "#ffffff",
        "theme_color": "#000091",
        "icons": [
            {
                "src": f"./icon-{size}.png",
                "sizes": f"{size}x{size}",
                "type": "image/png",
                "purpose": "any",
            }
            for size in [192, 512]
        ],
    }
    result = {
        DIST / "portable.html": portable.encode(),
        DIST / "snum.html": snum.encode(),
        DIST / "web/index.html": web.encode(),
        DIST / "web/manifest.webmanifest": (
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
        ).encode(),
    }
    for name in ["icon.svg", "icon-192.png", "icon-512.png"]:
        result[DIST / "web" / name] = (ROOT / "app/assets" / name).read_bytes()
    digest = hashlib.sha256()
    for path in sorted(result):
        if path.parent == DIST / "web":
            digest.update(
                path.name.encode("utf-8")
                + b"\0"
                + hashlib.sha256(result[path]).digest()
            )
    version = digest.hexdigest()[:16]
    result[DIST / "web/sw.js"] = (
        (SOURCE / "sw.js")
        .read_text(encoding="utf-8")
        .replace("@@VERSION@@", version)
        .encode("utf-8")
    )
    result.update(
        {DIST / name: content for name, content in artifacts(catalogue).items()}
    )
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for path, content in build().items():
        if args.check:
            if not path.exists() or path.read_bytes() != content:
                raise SystemExit(f"DIFFERENT : {path.relative_to(ROOT)}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
    print("APPLICATION_DISTRIBUTIONS_OK" if args.check else "APPLICATION_GENEREE")


if __name__ == "__main__":
    main()
