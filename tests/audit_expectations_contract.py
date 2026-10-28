"""Contrat de l’outillage d’accessibilité : attentes vérifiées, erreurs explicites.

Aucun `assert` dans ce fichier : il doit rester actif sous `-O`.
Toutes les données sont synthétiques.
"""

import ast
import importlib.util
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKED = 0


def expect(condition, message):
    global CHECKED
    CHECKED += 1
    if not condition:
        raise SystemExit("ÉCHEC : " + message)


def load(name):
    spec = importlib.util.spec_from_file_location(
        name + "_under_test", ROOT / "scripts" / (name + ".py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def raises(error, function, *args):
    try:
        function(*args)
    except error:
        return True
    return False


# Aucun assert dans l’outillage d’audit : ils disparaissent sous -O.
for script in sorted((ROOT / "scripts").glob("audit_*.py")):
    lines = [
        node.lineno
        for node in ast.walk(ast.parse(script.read_text()))
        if isinstance(node, ast.Assert)
    ]
    expect(not lines, "%s contient des assert aux lignes %r" % (script.name, lines))

checks = load("audit_expectations")
Error = checks.ScenarioError

# Texte attendu dans le HTML rendu.
page = (
    "<!doctype html><html lang=fr><head><title>Courriel</title>"
    "<style>.x{content:'Caché CSS'}</style><script>var t='Caché script'</script>"
    "</head><body><!-- Caché commentaire --><h1>Mes   newsletters</h1>"
    "<p>Vous <strong>recevez</strong> ce courriel &amp; l’équipe.</p></body></html>"
)
expect(checks.expected_text_in_html(page, "Mes newsletters"), "espaces normalisés")
expect(checks.expected_text_in_html(page, "Vous recevez"), "texte coupé par une balise")
expect(checks.expected_text_in_html(page, "ce courriel & l’équipe"), "entités décodées")
for hidden in ["Caché CSS", "Caché script", "Caché commentaire", "Autre texte"]:
    expect(
        not checks.expected_text_in_html(page, hidden),
        "le texte « %s » ne doit pas compter comme rendu" % hidden,
    )
expect(not checks.expected_text_in_html(page, ""), "une attente vide ne prouve rien")

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    html = base / "rendered.html"
    html.write_text(page)
    collection = base / "x-browser-collection.json"
    collection.write_text(json.dumps({"rendered_html_path": str(html)}))
    # Page statique (aucune action) : l’attente est vérifiée dans le HTML rendu.
    expect(
        checks.scene_expectation_error("P04", [], "Mes newsletters", collection) is None,
        "page statique conforme : aucune erreur",
    )
    message = checks.scene_expectation_error("P04", [], "Texte absent", collection)
    expect(
        message and "P04" in message and "Texte absent" in message,
        "page statique vide ou différente : erreur nommant la scène et l’attente : %r"
        % message,
    )
    html.write_text("")
    expect(
        checks.scene_expectation_error("P01", [], "Mes newsletters", collection),
        "page rendue vide : erreur",
    )
    collection.write_text(json.dumps({}))
    expect(
        checks.scene_expectation_error("P01", [], "Mes newsletters", collection),
        "collecte sans HTML rendu : erreur",
    )
    # Scène avec parcours : l’attente est portée par --expect de l’outil, rien à refaire.
    expect(
        checks.scene_expectation_error("editor", [{"type": "click"}], "x", collection)
        is None,
        "scène avec actions : attente déjà portée par --expect",
    )

# Le garde statique n'accepte pas title-only ni les exclusions HTML/inline connues.
for name, html in [
    ("title-only", "<html><head><title>Mes newsletters</title></head><body></body></html>"),
    ("hidden", "<div hidden><span>Mes newsletters</span></div>"),
    ("hidden vide", "<div hidden=''>Mes newsletters</div>"),
    ("hidden false reste un booléen HTML", "<div hidden='false'>Mes newsletters</div>"),
    ("inline display", "<div style='display: none !important'>Mes newsletters</div>"),
    ("inline visibility", "<p style='color:red;visibility:hidden;'>Mes newsletters</p>"),
    ("inline content-visibility", "<p style='content-visibility:hidden'>Mes newsletters</p>"),
]:
    expect(not checks.expected_text_in_html(html, "Mes newsletters"), "exclusion connue : " + name)
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory)
        rendered = base / "scene.html"
        rendered.write_text(html)
        collection = base / "capture.json"
        collection.write_text(json.dumps({"rendered_html_path": str(rendered)}))
        expect(checks.scene_expectation_error("P01", [], "Mes newsletters", collection),
               "la scène ne doit pas accepter : " + name)
expect(checks.expected_text_in_html("<div hidden>Non</div><h1>Mes newsletters</h1>", "Mes newsletters"),
       "sortie du sous-arbre caché : le texte visible candidat reste lu")
expect(checks.expected_text_in_html("<p aria-hidden=true>Mes newsletters</p>", "Mes newsletters"),
       "aria-hidden n'est pas une preuve de masquage visuel")
expect(checks.expected_text_in_html("<p class=externe>Mes newsletters</p>", "Mes newsletters"),
       "une classe CSS inconnue reste seulement une présence candidate ; aucune visibilité calculée")

# Contrat statique : concaténation inline, séparateurs de blocs et décodage unique.
# Les attentes sont du texte brut ; elles ne sont ni parsées en HTML ni décodées.
text_cases = [('inline contiguous', '<p>News<strong>letter</strong></p>', 'Newsletter', True),
 ('hidden inline contiguous',
  '<p>News<span hidden>REMOVE</span><strong>letter</strong></p>',
  'Newsletter',
  True),
 ('inline original whitespace', '<p>News <strong>letter</strong></p>', 'News letter', True),
 ('visible blocks separate', '<p>News</p><p>letter</p>', 'News letter', True),
 ('visible blocks never concatenate', '<p>News</p><p>letter</p>', 'Newsletter', False),
 ('line break boundary', 'News<br>letter', 'News letter', True),
 ('ordinary entity once', '<p>&lt; &amp; &#60;</p>', '< & <', True),
 ('literal entity not decoded twice', '<p>&amp;lt;</p>', '<', False),
 ('literal entity spelling retained', '<p>&amp;lt;</p>', '&lt;', True),
 ('plaintext expectation not HTML', '<p>&lt;strong&gt;</p>', '<strong>', True),
 ('expectation literal not decoded', '<p>&lt;</p>', '&lt;', False),
 ('literal amp entity not decoded', '<p>&amp;amp;</p>', '&amp;', True),
 ('double numeric entity not decoded', '<p>&amp;#60;</p>', '<', False),
 ('less-than literal', '<p>1 &lt; 2</p>', '1 < 2', True),
 ('scripts excluded', '<script>Newsletter</script>', 'Newsletter', False),
 ('title excluded', '<head><title>Newsletter</title></head>', 'Newsletter', False),
 ('hidden block excluded', '<p>News<div hidden>REMOVE</div>letter</p>', 'Newsletter', True)]
for name, markup, wanted, accepted in text_cases:
    expect(checks.expected_text_in_html(markup, wanted) is accepted,
           "présence statique : " + name)
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory)
        rendered = base / "scene.html"
        rendered.write_text(markup)
        collection = base / "capture.json"
        collection.write_text(json.dumps({"rendered_html_path": str(rendered)}))
        actual_error = checks.scene_expectation_error("text-contract", [], wanted, collection)
        expect((actual_error is None) is accepted, "garde de scène réel : " + name)
expect(checks.normalize("&lt;") == "&lt;", "normalize conserve une attente littérale")
expect(checks.rendered_text("<p>&amp;lt;</p>") == "&lt;", "HTML décodé une fois par le parseur")
expect(checks.rendered_text("<p>News<strong>letter</strong></p>") == "Newsletter",
       "aucun espace inventé entre fragments inline")

# Sélection de scènes : erreurs explicites.
scenes = [("editor", 1), ("dialog", 2), ("P01", 3)]
expect(checks.select_scenes(scenes, None) == scenes, "sans sélection : toutes")
expect(checks.select_scenes(scenes, "") == scenes, "sélection vide : toutes")
expect(
    checks.select_scenes(scenes, "P01,editor") == [("editor", 1), ("P01", 3)],
    "sélection : ordre d’origine conservé",
)
for bad in ["inconnue", "editor,inconnue", "editor,,P01", "editor,editor", " "]:
    expect(raises(Error, checks.select_scenes, scenes, bad), "sélection refusée : %r" % bad)
try:
    checks.select_scenes(scenes, "editor,inconnue")
except Error as error:
    expect("inconnue" in str(error) and "editor" in str(error), "message utile : %s" % error)

# audit_ay11 appelle bien ces contrôles (module non importable hors poste : lecture statique).
tree = ast.parse((ROOT / "scripts/audit_ay11.py").read_text())
called = {
    node.func.attr if isinstance(node.func, ast.Attribute) else getattr(node.func, "id", "")
    for node in ast.walk(tree)
    if isinstance(node, ast.Call)
}
for name in ["select_scenes", "scene_expectation_error"]:
    expect(name in called, "audit_ay11.py doit appeler %s" % name)

# Un constat ne passe à confirmé qu’avec la preuve correspondante.
receipt = load("audit_receipt")
with tempfile.TemporaryDirectory() as directory:
    raw = Path(directory)
    (raw / "exports").mkdir()
    journal = receipt.Journal()
    finding = receipt.titles_finding(raw, journal, None)
    expect(
        finding["qualification"] not in receipt.CONFIRMING and not finding.get("proof"),
        "sans export, le constat n’est pas confirmé",
    )
    for name in ["02.html", "10.html"]:
        (raw / "exports" / name).write_text("<p><strong>Titre visuel</strong></p>")
    journal = receipt.Journal()
    finding = receipt.titles_finding(raw, journal, None)
    expect(
        finding["qualification"] == "NC_CONFIRMEE"
        and journal.passed(finding["proof"]),
        "avec export, le constat est confirmé par un contrôle réussi du journal",
    )

print("attentes de l’outillage : %d vérifiées" % CHECKED)
