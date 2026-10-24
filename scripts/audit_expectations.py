"""Contrôles explicites de l’outillage d’audit : attentes de page et sélection de scènes.

Aucune de ces vérifications ne repose sur `assert` : elles restent actives sous `python3 -O`.
"""

import json
import re
import unicodedata
from html import unescape
from html.parser import HTMLParser
from pathlib import Path


class ScenarioError(Exception):
    """Une scène ou son attente est invalide : la collecte ne doit pas la compter."""


class _Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "template"):
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style", "template") and self.hidden:
            self.hidden -= 1

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def normalize(text):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", unescape(text))).strip()


def rendered_text(html):
    parser = _Text()
    parser.feed(html)
    parser.close()
    return normalize(" ".join(parser.parts))


def expected_text_in_html(html, expected):
    """Vrai si le texte attendu figure dans le texte rendu (hors script, style, commentaire)."""
    wanted = normalize(expected)
    return bool(wanted) and wanted in rendered_text(html)


def scene_expectation_error(scene, actions, expectation, collection_path):
    """Message d’erreur pour une page statique dont l’attente est absente du HTML rendu.

    Une scène avec parcours reçoit l’attente par `--expect` de l’outil de capture ;
    une page statique n’a pas de parcours, l’attente doit donc être lue ici.
    """
    if actions:
        return None
    try:
        rendered = Path(json.loads(Path(collection_path).read_text())["rendered_html_path"])
        html = rendered.read_text()
    except (OSError, KeyError, ValueError) as error:
        return f"Scène {scene} : HTML rendu illisible ({error!r})"
    if not expected_text_in_html(html, expectation):
        return f"Scène {scene} : texte attendu « {expectation} » absent du HTML rendu"
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
