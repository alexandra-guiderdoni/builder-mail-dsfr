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
