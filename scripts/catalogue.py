"""Compile les 52 sections officielles en gabarits à champs, sans dépendance."""

import base64
import hashlib
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

if __package__:
    from .mail_layout import LAYOUT_CSS, Element, Fragment, css_template
else:
    from mail_layout import LAYOUT_CSS, Element, Fragment, css_template

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "reference/dsfr-mail"

# Champs éditoriaux qualifiés dans la référence : le gras seul n’est pas un titre.
HEADING_FIELDS = {
    5: [("f0", "principal")],
    6: [("f0", "principal")],
    10: [("f0", "section")],
    11: [("f0", "section")],
    12: [("f0", "section")],
    13: [("f0", "section")],
    14: [("f0", "partie")],
    15: [("f0", "partie")],
    16: [("f0", "partie")],
    17: [("f0", "partie")],
    24: [("f0", "local")],
    25: [("f0", "local")],
    30: [("f3", "local")],
    31: [("f4", "local")],
    32: [("f0", "local")],
    33: [("f0", "local")],
    34: [(key, "local") for key in ["f0", "f3", "f5", "f7", "f9"]],
    35: [("f0", "local")],
    36: [("f0", "local")],
    37: [("f0", "partie"), ("f4", "local"), ("f6", "local")],
    38: [("f0", "partie")],
    39: [("f0", "local")],
    45: [("f0", "local")],
    46: [("f0", "section"), ("f3", "local"), ("f8", "local")],
}


def semantic_template(index, template):
    headings = [
        {"field": key, "role": role} for key, role in HEADING_FIELDS.get(index, [])
    ]
    for heading in headings:
        key = heading["field"]
        pattern = rf"(<(span|a)\b[^>]*>\s*<strong>\s*\{{\{{{key}\}}\}}\s*(?:<br>\s*)?</strong>\s*</\2>)"
        template, count = re.subn(
            pattern,
            "{{heading_open_" + key + r"}}\g<0>{{heading_close_" + key + "}}",
            template,
        )
        if count != 1:
            raise ValueError(f"Titre non reconnu dans mail-{index:02}, champ {key}.")
    return template, headings


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


def link_fields(template, fields):
    """Associe chaque destination à son unique champ d’intitulé canonique."""
    types = {field["key"]: field["type"] for field in fields}
    result = []

    def text_nodes(element):
        return "".join(
            text_nodes(child) if isinstance(child, Element) else child
            for child in element.children
            if isinstance(child, Element) or not child.startswith("<!--")
        )

    for anchor in Fragment(template).root.elements():
        if anchor.tag != "a":
            continue
        destination = re.fullmatch(r"\{\{(f\d+)\}\}", anchor.attrs.get("href", ""))
        labels = re.findall(r"\{\{(f\d+)\}\}", text_nodes(anchor))
        if (
            not destination
            or types.get(destination[1]) != "url"
            or len(labels) != 1
            or types.get(labels[0]) != "text"
            or template.count("{{" + labels[0] + "}}") != 1
            or any(
                key in {"role", "tabindex"} or key.startswith("on")
                for key in anchor.attrs
            )
        ):
            raise ValueError("Association destination/intitulé non reconnue.")
        result.append({"url": destination[1], "label": labels[0]})
    urls = [item["url"] for item in result]
    if sorted(urls) != sorted(key for key, kind in types.items() if kind == "url"):
        raise ValueError("Chaque URL doit posséder un unique lien avec intitulé.")
    return result


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
        template = "".join(fields.parts)
        semantic, headings = semantic_template(index, template)
        components.append(
            {
                "id": f"mail-{index:02}",
                "label": label,
                "family": family,
                "template": template,
                "semanticTemplate": css_template(index, semantic),
                "headings": headings,
                "links": link_fields(template, fields.fields),
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
        "layoutCss": LAYOUT_CSS,
        "reference_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }
