"""Compile les 52 sections officielles en gabarits à champs, sans dépendance."""

import base64
import hashlib
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "reference/dsfr-mail"


class Sections(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.offsets = [0]
        for line in source.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.depth, self.body, self.sections = 0, False, []

    def position(self):
        line, column = self.getpos()
        return self.offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        if tag == "body":
            self.body = True
        if tag == "table" and self.body:
            if not self.depth:
                self.start, self.line = self.position(), self.getpos()[0]
            self.depth += 1

    def handle_endtag(self, tag):
        if tag == "table" and self.body:
            self.depth -= 1
            if not self.depth:
                self.sections.append(
                    (
                        self.start,
                        self.position() + len("</table>"),
                        self.line,
                        self.getpos()[0],
                    )
                )


class Fields(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.parts, self.fields, self.buffer = [], [], ""

    def slot(self, kind, label, value):
        key = f"f{len(self.fields)}"
        self.fields.append({"key": key, "type": kind, "label": label, "default": value})
        return "{{" + key + "}}"

    def flush(self):
        value = html.unescape(self.buffer)
        if value.strip():
            value = re.sub(r"\s+", " ", value).strip()
            label = (
                value
                if value in ["Titre", "Description", "Texte", "Accroche", "Chapô"]
                else f"Texte {sum(f['type'] == 'text' for f in self.fields) + 1}"
            )
            if value.startswith("Service d'Information du Gouvernement"):
                value, label = "Votre service", "Nom du service"
            if "@" in value:
                value, label = (
                    "Adresse du service à renseigner",
                    "Coordonnées du service",
                )
            self.parts.append(" " if self.buffer[:1].isspace() else "")
            self.parts.append(
                self.slot(
                    "text",
                    label,
                    value,
                )
            )
            self.parts.append(" " if self.buffer[-1:].isspace() else "")
        else:
            self.parts.append(self.buffer)
        self.buffer = ""

    def handle_starttag(self, tag, attrs):
        self.flush()
        raw = self.get_starttag_text()
        for attr, value in attrs:
            if (tag == "a" and attr == "href") or (
                tag == "img" and attr in ["src", "alt"]
            ):
                kind = "image" if attr == "src" else "url" if attr == "href" else "alt"
                if kind == "image":
                    asset = REF / value
                    if not asset.is_file():
                        raise ValueError(f"Ressource absente : {value}")
                    default = (
                        "data:image/png;base64,"
                        + base64.b64encode(asset.read_bytes()).decode()
                    )
                elif kind == "url":
                    default = (
                        value
                        if value.startswith("https://")
                        else "https://exemple.invalid/"
                    )
                else:
                    default = value
                label = {
                    "image": "Image locale",
                    "url": "Lien HTTPS",
                    "alt": "Alternative de l’image",
                }[kind]
                token = self.slot(kind, label, default)
                raw = re.sub(
                    rf"(\b{attr}\s*=\s*)([\"\']).*?\2",
                    lambda m, value=token: m[1] + m[2] + value + m[2],
                    raw,
                    count=1,
                    flags=re.IGNORECASE | re.DOTALL,
                )
        self.parts.append(raw)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        self.flush()
        self.parts.append(f"</{tag}>")

    def handle_data(self, value):
        self.buffer += value

    def handle_entityref(self, name):
        self.buffer += f"&{name};"

    def handle_charref(self, name):
        self.buffer += f"&#{name};"

    def handle_comment(self, value):
        self.flush()
        self.parts.append(f"<!--{value}-->")


def compile_catalogue():
    path = REF / "template-generique.html"
    source = path.read_text(encoding="utf-8")
    parser = Sections(source)
    parser.feed(source)
    labels = json.loads((ROOT / "reference/catalogue.json").read_text(encoding="utf-8"))
    if len(labels) != len(parser.sections) or len(labels) != 52:
        raise ValueError(
            "L’inventaire de référence doit couvrir exactement les 52 sections épinglées."
        )
    components = []
    for index, ((start, end, first, last), (label, family)) in enumerate(
        zip(parser.sections, labels)
    ):
        raw = source[start:end]
        fields = Fields()
        fields.feed(raw)
        fields.flush()
        components.append(
            {
                "id": f"mail-{index:02}",
                "label": label,
                "family": family,
                "template": "".join(fields.parts),
                "fields": fields.fields,
                "source": {
                    "file": "template-generique.html",
                    "line": first,
                    "end": last,
                    "sha256": hashlib.sha256(raw.encode()).hexdigest(),
                },
            }
        )
    css = re.search(r"<style[^>]*>(.*?)</style>", source, re.DOTALL).group(1)
    contract = [
        (c["id"], c["template"], [(f["key"], f["type"]) for f in c["fields"]])
        for c in components
    ]
    fingerprint = hashlib.sha256(
        json.dumps([contract, css], ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()
    return {
        "id": fingerprint,
        "components": components,
        "css": css,
        "reference_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }
