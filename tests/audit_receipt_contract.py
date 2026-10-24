"""Contrat du reçu d’audit : aucun état favorable sans preuve, avec ou sans python3 -O.

Ce fichier n’emploie aucun `assert` : il doit rester actif sous `-O`.
Toutes les données sont synthétiques.
"""

import ast
import copy
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/audit_receipt.py"
CHECKED = 0


def expect(condition, message):
    global CHECKED
    CHECKED += 1
    if not condition:
        raise SystemExit("ÉCHEC : " + message)


def load():
    spec = importlib.util.spec_from_file_location("audit_receipt_under_test", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def refused(module, receipt, root):
    try:
        module.verify_receipt(receipt, root)
    except module.AuditError as error:
        return str(error)
    return None


def synthetic_receipt(module, root):
    log = root / "suite.log"
    log.write_text("ℹ pass 3\nℹ fail 0\nℹ skipped 0\n")
    proof = root / "preuve.html"
    proof.write_text("<p>Titre visuel</p>\n")
    journal = module.Journal()
    journal.check("exports-sans-titre", True, "preuve synthétique")
    journal.check("suite-complete", True, "3 tests")
    return {
        "controls": journal.summary(),
        "tests": {
            "passed": 3,
            "failed": 0,
            "skipped": 0,
            "log": "suite.log",
            "log_sha256": hashlib.sha256(log.read_bytes()).hexdigest(),
        },
        "confirmed_findings": [
            {
                "id": "SYNTH-001",
                "qualification": "NC_CONFIRMEE",
                "proof": "exports-sans-titre",
                "evidence": ["preuve.html"],
            }
        ],
    }


tree = ast.parse(SCRIPT.read_text())
expect(
    not [node.lineno for node in ast.walk(tree) if isinstance(node, ast.Assert)],
    "scripts/audit_receipt.py contient encore des assert, supprimés sous -O",
)

module = load()

# Journal : le compteur vient des entrées, pas d’un littéral.
journal = module.Journal()
expect(journal.check("a", True, "ok") is True, "check doit renvoyer True si vrai")
expect(journal.check("b", 1 == 2, "faux") is False, "check doit renvoyer False si faux")
summary = journal.summary()
expect(
    (summary["total"], summary["passed"], summary["failed"]) == (2, 1, 1),
    "les compteurs doivent être calculés depuis le journal : %r" % summary,
)
try:
    journal.finish()
except module.AuditError as error:
    expect("b" in str(error), "l’échec doit nommer le contrôle")
else:
    expect(False, "finish doit lever AuditError quand un contrôle échoue")
empty = module.Journal()
try:
    empty.finish()
except module.AuditError:
    pass
else:
    expect(False, "un journal vide ne prouve rien et doit être refusé")

# parse_suite : les compteurs du rapport de tests viennent du journal brut.
counts = module.parse_suite("# pass 7\n# fail 2\n# skipped 1\n")
expect(counts == {"passed": 7, "failed": 2, "skipped": 1}, "parse_suite : %r" % counts)
try:
    module.parse_suite("aucun compteur ici")
except module.AuditError:
    pass
else:
    expect(False, "un journal de tests sans compteurs doit être refusé")

# confirm : pas de confirmation sans contrôle réussi du même nom.
finding = {"id": "SYNTH-002", "qualification": "NON_QUALIFIE"}
journal = module.Journal()
journal.check("preuve-ratee", False, "absente")
for proof in ["preuve-ratee", "preuve-inconnue"]:
    try:
        module.confirm(finding, journal, proof, "NC_CONFIRMEE")
    except module.AuditError:
        pass
    else:
        expect(False, "confirm doit refuser la preuve %s" % proof)
expect(finding["qualification"] == "NON_QUALIFIE", "le constat ne doit pas changer")
journal.check("preuve-ok", True, "présente")
module.confirm(finding, journal, "preuve-ok", "NC_CONFIRMEE")
expect(
    finding["qualification"] == "NC_CONFIRMEE" and finding["proof"] == "preuve-ok",
    "confirm doit qualifier et citer la preuve",
)

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)

    # Constat de titres : confirmé seulement si les exports prouvent le défaut.
    raw = base / "raw"
    (raw / "exports").mkdir(parents=True)
    journal = module.Journal()
    result = module.titles_finding(raw, journal, None)
    expect(
        result["qualification"] != "NC_CONFIRMEE" and journal.summary()["failed"] > 0,
        "exports absents : aucun constat confirmé, contrôle en échec",
    )
    for name in ["02.html", "10.html"]:
        (raw / "exports" / name).write_text("<p><strong>Titre visuel</strong></p>\n")
    journal = module.Journal()
    result = module.titles_finding(raw, journal, None)
    expect(
        result["qualification"] == "NC_CONFIRMEE" and journal.summary()["failed"] == 0,
        "exports sans balise de titre : constat confirmé avec sa preuve",
    )
    (raw / "exports/10.html").write_text("<h2>Titre natif</h2>\n")
    journal = module.Journal()
    result = module.titles_finding(raw, journal, None)
    expect(
        result["qualification"] != "NC_CONFIRMEE" and journal.summary()["failed"] > 0,
        "un export déjà corrigé ne prouve plus le défaut",
    )
    journal = module.Journal()
    result = module.titles_finding(raw, journal, {"visual": {"observations": []}})
    expect(
        result["qualification"] != "A_RETESTER" and journal.summary()["failed"] > 0,
        "un nouveau test sémantique vide ne peut pas basculer le constat",
    )

    # Constat de présentation : confirmé seulement avec des attributs relevés.
    path = base / "presentation.json"
    path.write_text("{}")
    data = {
        "pages": [{"page": "P05", "count": 2, "instances": [{"attrs": ["align"]}]}],
        "scope": "synthétique",
        "source": "synthétique",
    }
    journal = module.Journal()
    result = module.presentation_finding(data, path, base, journal)
    expect(result["qualification"] == "NC_CONFIRMEE", "présentation relevée : confirmée")
    for broken in [
        {**data, "pages": []},
        {**data, "pages": [{"page": "P05", "count": 0, "instances": []}]},
    ]:
        journal = module.Journal()
        result = module.presentation_finding(broken, path, base, journal)
        expect(
            result["qualification"] != "NC_CONFIRMEE" and journal.summary()["failed"] > 0,
            "présentation sans instance : aucun constat confirmé",
        )

    # Reçu : un état favorable est vérifié contre ses preuves.
    receipt = synthetic_receipt(module, base)
    expect(refused(module, receipt, base) is None, "le reçu synthétique cohérent doit passer")

    def mutated(change):
        copy_ = copy.deepcopy(receipt)
        change(copy_)
        return copy_

    cases = {
        "journal absent": lambda r: r.pop("controls"),
        "journal vide": lambda r: r["controls"].update(journal=[], total=0, passed=0),
        "compteur failed remplacé": lambda r: (
            r["controls"]["journal"][0].update(passed=False)
        ),
        "compteur passed gonflé": lambda r: r["controls"].update(passed=99),
        "total gonflé": lambda r: r["controls"].update(total=99),
        "journal des tests absent": lambda r: r["tests"].update(log="absent.log"),
        "empreinte du journal fausse": lambda r: r["tests"].update(log_sha256="0" * 64),
        "tests réussis gonflés": lambda r: r["tests"].update(passed=4),
        "tests en échec masqués": lambda r: r["tests"].update(failed=1),
        "constat sans preuve nommée": lambda r: r["confirmed_findings"][0].pop("proof"),
        "constat avec preuve inconnue": lambda r: r["confirmed_findings"][0].update(
            proof="inconnue"
        ),
        "constat sans pièce": lambda r: r["confirmed_findings"][0].update(evidence=[]),
        "pièce du constat absente": lambda r: r["confirmed_findings"][0].update(
            evidence=["manquante.html"]
        ),
    }
    for label, change in cases.items():
        expect(refused(module, mutated(change), base), "reçu refusé attendu : " + label)

    # Journal de tests modifié après coup : l’empreinte ne correspond plus.
    (base / "suite.log").write_text("ℹ pass 3\nℹ fail 0\nℹ skipped 0\n# gonflé\n")
    expect(refused(module, receipt, base), "journal de tests modifié après coup")

    # Le script complet refuse de publier sans les preuves brutes.
    environment = {
        **os.environ,
        "BUILDER_AUDIT_OUTPUT": str(base / "vide"),
        "BUILDER_AUDIT_DOCS": str(base / "docs"),
    }
    result = subprocess.run(
        [sys.executable, "-B", str(SCRIPT)],
        cwd=ROOT,
        env=environment,
        capture_output=True,
        text=True,
    )
    expect(result.returncode != 0, "le script sans preuves doit échouer")
    expect(
        not (base / "docs").exists() or not list((base / "docs").glob("recu-*.json")),
        "aucun reçu ne doit être écrit sans preuves",
    )

print("contrôles du reçu : %d vérifiés" % CHECKED)
