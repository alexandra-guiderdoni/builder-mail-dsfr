"""Compile les 52 sections officielles en gabarits à champs, sans dépendance."""

import base64
import hashlib
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

if __package__:
    from .mail_layout import LAYOUT_CSS, Element, Fragment, css_template, render_css
else:
    from mail_layout import LAYOUT_CSS, Element, Fragment, css_template, render_css

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

# Libellés explicites des champs, dans l’ordre des clés f0, f1… de chaque section.
# Exclus de l’empreinte contractuelle : les modifier ne change ni les clés ni les types.
MARIANNE = [
    "Logo Marianne, thème clair",
    "Alternative textuelle du logo Marianne, thème clair",
    "Logo Marianne, thème sombre",
    "Alternative textuelle du logo Marianne, thème sombre",
]
OPERATOR = ["Logo de l’opérateur", "Alternative textuelle du logo de l’opérateur"]
ILLUSTRATION = [
    "Image d’illustration",
    "Alternative textuelle de l’image d’illustration",
]
SECTION = ["Titre de la section", "Accroche de la section"]
PART = ["Titre de la partie", "Accroche de la partie"]
LIST = [
    "Premier élément de la liste",
    "Deuxième élément de la liste",
    "Troisième élément de la liste",
]
BUTTON = ["Adresse HTTPS du bouton", "Texte du bouton"]
HIGHLIGHT = ["Titre de la mise en avant", "Texte de la mise en avant"]
CAPTIONED = [*ILLUSTRATION, "Légende ou source de l’image"]
CONTRIBUTION = ["Titre de l’appel à contribution", "Texte de l’appel à contribution"]
ARTICLE = ["Vignette de l’article", "Alternative textuelle de la vignette"]
BYLINE = ["Auteur de l’article", "Date et durée de lecture"]
PRIVACY = [
    "Mention d’abonnement",
    "Adresse HTTPS ou mailto de la politique de données personnelles",
    "Texte du lien vers la politique de données personnelles",
]


def card(rank):
    return [
        f"Image de la {rank} carte",
        f"Alternative textuelle de l’image de la {rank} carte",
        f"Titre de la {rank} carte",
        f"Description de la {rank} carte",
        f"Chiffre clé de la {rank} carte",
    ]


def subsection(rank):
    return [f"{rank.capitalize()} sous-titre", f"Texte du {rank} sous-titre"]


FIELD_LABELS = [
    ["Texte du pré-en-tête masqué"],
    [
        "Phrase précédant le lien vers la version en ligne",
        "Adresse HTTPS de la version en ligne",
        "Texte du lien vers la version en ligne",
    ],
    [*MARIANNE, "Nom du service"],
    [*MARIANNE, *OPERATOR, "Nom du service"],
    [
        "Image de la bannière",
        "Alternative textuelle de la bannière",
        "Message de la campagne",
    ],
    ["Titre principal"],
    ["Titre principal", *ILLUSTRATION],
    ["Texte de prévisualisation"],
    ["Chapô", "Prénom et nom du signataire", "Fonction du signataire"],
    ["Chapô", "Service signataire"],
    SECTION,
    SECTION,
    SECTION[:1],
    SECTION[:1],
    PART,
    PART,
    PART[:1],
    PART[:1],
    ["Texte du paragraphe"],
    ["Texte du paragraphe"],
    ["Phrase d’introduction de la liste", *LIST],
    ["Phrase d’introduction de la liste", *LIST],
    LIST[:2],
    LIST[:2],
    ["Titre du bloc", "Description du bloc"],
    ["Titre du bloc", "Description du bloc"],
    CAPTIONED,
    CAPTIONED,
    CAPTIONED,
    CAPTIONED,
    [*ARTICLE, "Surtitre de l’article", "Titre de l’article", *BYLINE],
    [
        *ARTICLE,
        "Surtitre de l’article",
        "Adresse HTTPS de l’article",
        "Titre cliquable de l’article",
        *BYLINE,
    ],
    [*CONTRIBUTION, *ILLUSTRATION],
    [*CONTRIBUTION, *BUTTON, *ILLUSTRATION],
    [
        "Titre des chiffres clés",
        "Premier chiffre clé",
        "Deuxième chiffre clé",
        *subsection("premier"),
        *subsection("deuxième"),
        *subsection("troisième"),
        *subsection("quatrième"),
    ],
    HIGHLIGHT,
    HIGHLIGHT,
    [PART[0], *CAPTIONED, *subsection("premier"), *subsection("deuxième")],
    [PART[0], *CAPTIONED, "Texte de la partie"],
    [
        "Titre du contact",
        "Nom du service",
        "Département ou unité",
        "Coordonnées du service",
    ],
    BUTTON,
    BUTTON,
    BUTTON,
    [
        "Adresse HTTPS du lien d’action",
        "Texte du lien d’action",
        "Adresse HTTPS du lien au fil du texte",
        "Texte du lien au fil du texte",
    ],
    ["Chiffre clé", "Description du chiffre clé"],
    [
        "Titre de l’invitation",
        "Texte de l’invitation",
        "Adresse HTTPS du lien d’invitation",
        "Texte du lien d’invitation",
    ],
    ["Titre de la section", *card("première"), *card("deuxième")],
    [*PRIVACY, *MARIANNE, "Nom du service"],
    [*PRIVACY, *MARIANNE, *OPERATOR, "Nom du service"],
    [
        "Phrase précédant le lien de désabonnement",
        "Adresse HTTPS ou mailto de désabonnement",
        "Texte du lien de désabonnement",
    ],
    [
        "Phrase précédant le lien de gestion des abonnements",
        "Adresse HTTPS ou mailto de gestion des abonnements",
        "Texte du lien de gestion des abonnements",
    ],
    ["Texte de clôture"],
]


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
    def __init__(self, labels):
        super().__init__(convert_charrefs=False)
        self.parts, self.fields, self.buffer, self.labels = [], [], "", labels

    def slot(self, kind, value):
        key = f"f{len(self.fields)}"
        if len(self.fields) >= len(self.labels):
            raise ValueError(f"Libellé absent pour le champ {key}.")
        label = self.labels[len(self.fields)]
        self.fields.append({"key": key, "type": kind, "label": label, "default": value})
        return "{{" + key + "}}"

    def flush(self):
        value = html.unescape(self.buffer)
        if value.strip():
            value = re.sub(r"\s+", " ", value).strip()
            if value.startswith("Service d'Information du Gouvernement"):
                value = "Votre service"
            if "@" in value:
                value = "Adresse du service à renseigner"
            self.parts.append(" " if self.buffer[:1].isspace() else "")
            self.parts.append(self.slot("text", value))
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
                token = self.slot(kind, default)
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
    if len(labels) != len(parser.sections) or not len(labels) == len(FIELD_LABELS) == 52:
        raise ValueError(
            "L’inventaire de référence doit couvrir exactement les 52 sections épinglées."
        )
    components = []
    for index, ((start, end, first, last), (label, family)) in enumerate(
        zip(parser.sections, labels)
    ):
        raw = source[start:end]
        fields = Fields(FIELD_LABELS[index])
        fields.feed(raw)
        fields.flush()
        if len(fields.fields) != len(FIELD_LABELS[index]):
            raise ValueError(f"Libellés de champ en surnombre dans mail-{index:02}.")
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
        "renderCss": render_css(css),
        "layoutCss": LAYOUT_CSS,
        "reference_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }
