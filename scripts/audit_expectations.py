"""Contrôles explicites de l’outillage d’audit : attentes de page et sélection de scènes.

Aucune de ces vérifications ne repose sur `assert` : elles restent actives sous `python3 -O`.
"""

import json
import re
import unicodedata
from html.parser import HTMLParser
from pathlib import Path


class ScenarioError(Exception):
    """Une scène ou son attente est invalide : la collecte ne doit pas la compter."""


class _Text(HTMLParser):
    """Texte candidat dans le contenu HTML, sans calcul des styles de la page.

    Écarte les exclusions directement lisibles (head, hidden, styles inline
    masquants). Les classes CSS, le rendu et l'exposition AT ne sont pas évalués.
    """

    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
    # Séparateurs sémantiques HTML seulement : aucune inférence depuis les CSS.
    BOUNDARIES = {
        "address", "article", "aside", "blockquote", "br", "caption", "dd", "details",
        "dialog", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer",
        "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr",
        "li", "main", "nav", "ol", "p", "pre", "section", "summary", "table",
        "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.stack = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        inline = re.sub(r"/\*.*?\*/", "", attributes.get("style") or "", flags=re.DOTALL)
        blocked = (
            bool(self.stack and self.stack[-1][1])
            or tag in ("head", "title", "script", "style", "template")
            or "hidden" in attributes
            or bool(re.search(r"(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden)\s*(?:!important\s*)?(?:;|$)", inline, re.IGNORECASE))
        )
        if not blocked and tag in self.BOUNDARIES:
            self.parts.append(" ")
        if tag not in self.VOID:
            self.stack.append((tag, blocked))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                if not self.stack[index][1] and tag in self.BOUNDARIES:
                    self.parts.append(" ")
                del self.stack[index:]
                break

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data):
        if not self.stack or not self.stack[-1][1]:
            self.parts.append(data)


def normalize(text):
    """Normalise du texte brut, sans parsing HTML ni décodage d'entités."""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).strip()


def rendered_text(html):
    """Nom historique : texte candidat statique, jamais preuve de visibilité CSS."""
    parser = _Text()
    parser.feed(html)
    parser.close()
    # HTMLParser décode les références une seule fois. Les fragments inline
    # contigus restent contigus ; seuls les séparateurs structurels sont ajoutés.
    return normalize("".join(parser.parts))


def expected_text_in_html(html, expected):
    """Présence statique hors exclusions HTML/inline connues, pas visibilité mesurée."""
    wanted = normalize(expected)
    return bool(wanted) and wanted in rendered_text(html)


def scene_expectation_error(scene, actions, expectation, collection_path):
    """Garde statique de contenu de scène, distinct d'une mesure de visibilité.

    Une scène avec parcours reçoit l’attente par `--expect` de l’outil de capture ;
    une page statique n’a pas de parcours, sa présence candidate est lue ici.
    Une réussite ne vérifie ni les CSS externes, ni l'exposition accessible.
    """
    if actions:
        return None
    try:
        rendered = Path(json.loads(Path(collection_path).read_text())["rendered_html_path"])
        html = rendered.read_text()
    except (OSError, KeyError, ValueError) as error:
        return f"Scène {scene} : HTML rendu illisible ({error!r})"
    if not expected_text_in_html(html, expectation):
        return f"Scène {scene} : texte attendu « {expectation} » absent du contenu HTML candidat (contrôle statique)"
    return None


def select_scenes(scenes, selection):
    """Filtre les scènes (tuples dont le premier élément est le nom) selon `a,b,c`."""
    if not selection:
        return scenes
    names = [name.strip() for name in selection.split(",")]
    known = [scene[0] for scene in scenes]
    if "" in names:
        raise ScenarioError(f"Sélection de scènes invalide (élément vide) : {selection!r}")
    duplicated = sorted({name for name in names if names.count(name) > 1})
    if duplicated:
        raise ScenarioError(f"Scènes demandées en double : {', '.join(duplicated)}")
    unknown = sorted(set(names) - set(known))
    if unknown:
        raise ScenarioError(
            f"Scènes inconnues : {', '.join(unknown)} ; scènes disponibles : {', '.join(known)}"
        )
    return [scene for scene in scenes if scene[0] in names]
