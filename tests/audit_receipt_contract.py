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


def node_options_tokens(value):
    """ParseNodeOptionsEnvVar, Node v24.22.1 src/node_options.cc (ParseNodeOptionsEnvVar) (pas un shell)."""
    tokens, quoted, new_argument, index = [], False, True, 0
    while index < len(value):
        char = value[index]
        if char == "\\" and quoted:
            index += 1
            if index == len(value):
                raise SystemExit("NODE_OPTIONS : échappement non terminé")
            char = value[index]
        elif char == " " and not quoted:
            new_argument = True
            index += 1
            continue
        elif char == '"':
            quoted = not quoted
            index += 1
            continue
        if new_argument:
            tokens.append(char)
            new_argument = False
        else:
            tokens[-1] += char
        index += 1
    if quoted:
        raise SystemExit("NODE_OPTIONS : citation double non terminée")
    return tokens


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


def suite_log(passed=3, failed=0, cancelled=0, skipped=0, todo=0, marker="ℹ"):
    total = passed + failed + cancelled + skipped + todo
    return "\n".join(
        f"{marker} {label} {value}"
        for label, value in [("tests", total), ("suites", 0), ("pass", passed), ("fail", failed),
                             ("cancelled", cancelled), ("skipped", skipped), ("todo", todo), ("duration_ms", "1.2")]
    ) + "\n"


def synthetic_receipt(module, root):
    log = root / "suite.log"
    log.write_text(suite_log())
    proof = root / "preuve.html"
    proof.write_text("<p>Titre visuel</p>\n")
    journal = module.Journal()
    journal.check("exports-sans-titre", True, "preuve synthétique")
    journal.check("suite-complete", True, "3 tests")
    return {
        "controls": journal.summary(),
        "tests": {
            **module.parse_suite(log.read_text()),
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
counts = module.parse_suite(suite_log(passed=7, failed=2, skipped=1, marker="#"))
expect(counts == {"total": 10, "passed": 7, "failed": 2, "cancelled": 0, "skipped": 1, "todo": 0}, "parse_suite : %r" % counts)
for label, invalid in {
    "compteurs partiels": "# pass 3\n# fail 0\n# skipped 0\n",
    "durée finale absente": suite_log().replace("ℹ duration_ms 1.2\n", ""),
    "total incohérent": suite_log().replace("ℹ tests 3", "ℹ tests 4"),
    "compteur ambigu": suite_log() + "ℹ pass 3\n",
    "annulations absentes": suite_log().replace("ℹ cancelled 0\n", ""),
    "durée avant les compteurs": "ℹ duration_ms 1.2\n" + suite_log().replace("ℹ duration_ms 1.2\n", ""),
    "résultat après résumé": suite_log() + "ok 4 - résultat tardif\n",
}.items():
    try:
        module.parse_suite(invalid)
    except module.AuditError:
        pass
    else:
        expect(False, "journal incomplet/incohérent accepté : " + label)
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

    # Une égalité d'arbres vides ou mal formés ne prouve aucun titre exposé.
    for name in ["02.html", "10.html"]:
        (raw / "exports" / name).write_text("<h1>Titre natif</h1>\n")
    outline = [{"level": 1, "text": "Titre natif"}]
    for label, output, good in [
        ("vide", [], False), ("absent", None, False),
        ("texte blanc", [{"level": 1, "text": "  "}], False),
        ("niveau invalide", [{"level": 7, "text": "Titre"}], False),
        ("niveau booléen", [{"level": True, "text": "Titre"}], False),
        ("forme inconnue", ["Titre"], False), ("non vide", outline, True),
    ]:
        semantic = {"visual": {"observations": [{"pixelEquivalent": True}] * 54},
                    "outputs": {key: output for key in ["accessibleTree", "expected", "copied"]}}
        (raw / "semantic-retest.json").write_text(json.dumps(semantic))
        journal = module.Journal()
        result = module.titles_finding(raw, journal, semantic)
        expect((result["qualification"] == "A_RETESTER") is good, "preuve AX : " + label)
        expect("titres natifs vérifiés" not in result["observation"] and "GO structurel" not in result["review"],
               "ne pas suraffirmer des titres natifs ou une revue indépendante")
    changed = copy.deepcopy(semantic)
    changed["outputs"]["copied"] = [{"level": 2, "text": "Autre"}]
    (raw / "semantic-retest.json").write_text(json.dumps(changed))
    result = module.titles_finding(raw, module.Journal(), changed)
    expect(result["qualification"] != "A_RETESTER", "relevés non vides divergents refusés")
    result = module.titles_finding(raw, module.Journal(), semantic)
    expect(result["qualification"] != "A_RETESTER", "argument différent de sa pièce disque refusé")

    # Les deux campagnes pointent chacune sur les pièces réellement lues, avec empreintes.
    findings = []
    for campaign in ["courante-a", "courante-b"]:
        current = base / campaign
        (current / "exports").mkdir(parents=True)
        for name in ["02.html", "10.html"]:
            (current / "exports" / name).write_text(f"<p>{campaign} {name}</p>")
        result = module.titles_finding(current, module.Journal(), None)
        findings.append(result)
        wanted = [(current / "exports" / name).resolve() for name in ["02.html", "10.html"]]
        actual = [(ROOT / item).resolve() for item in result["evidence"]]
        expect(actual == wanted, "pièces de " + campaign)
        expect(result["evidence_sha256"] == {item: module.sha(ROOT / item) for item in result["evidence"]},
               "empreintes des pièces de " + campaign)
    expect(findings[0]["evidence"] != findings[1]["evidence"], "campagnes distinctes, pièces distinctes")
    provenance = module.collection_provenance(raw, {})
    expect(provenance["audited_at"] is None and provenance["collection_time_source"] is None,
           "date de collecte inconnue : aucune date historique ou de génération substituée")
    expect(provenance["generated_at"] and provenance["raw_directory"] == module.evidence_path(raw),
           "génération datée séparément et répertoire de preuve courant")
    for invalid_time in ["2026-10-22", "date inconnue", "2026-10-28T10:00:00"]:
        expect(module.collection_provenance(raw, {"collected_at": invalid_time})["audited_at"] is None,
               "date de collecte non zonée/invalide : " + invalid_time)
    collected_at = "2026-10-28T10:00:00+00:00"
    provenance = module.collection_provenance(raw, {"collected_at": collected_at, "run_id": "synthetic-current"})
    expect(provenance["audited_at"] == collected_at and provenance["reported_collection_run_id"] == "synthetic-current"
           and provenance["collection_time_source"].endswith("browser.json:collected_at"),
           "date et identifiant rapportés par la preuve courante, sans provenance runtime inventée")

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

    # Compteurs complets mais annulation/TODO/skip : jamais un reçu favorable.
    for label, log_text in [
        ("annulation seule", suite_log(cancelled=1)),
        ("échec et annulation", suite_log(failed=1, cancelled=1)),
        ("ignoré", suite_log(skipped=1)),
        ("TODO", suite_log(todo=1)), ("suite vide", suite_log(passed=0)),
    ]:
        (base / "suite.log").write_text(log_text)
        broken = copy.deepcopy(receipt)
        broken["tests"].update(module.parse_suite(log_text), log_sha256=module.sha(base / "suite.log"))
        expect(refused(module, broken, base), "reçu refusé : " + label)
    (base / "suite.log").write_text(suite_log())

    # Une ancienne pièce présente ne remplace pas une pièce courante disparue ou modifiée.
    current = base / "courante-a"
    journal = module.Journal()
    finding = module.titles_finding(current, journal, None)
    with_finding = copy.deepcopy(receipt)
    with_finding.update(controls=journal.summary(), confirmed_findings=[finding])
    expect(refused(module, with_finding, base) is None, "preuve courante avec empreintes acceptée")
    old = base / "evidence/accessibilite-20261022/exports"
    old.mkdir(parents=True)
    for name in ["02.html", "10.html"]:
        (old / name).write_text("<p>Ancienne preuve</p>")
    (current / "exports/02.html").write_text("<p>Pièce modifiée</p>")
    expect(refused(module, with_finding, base), "pièce courante modifiée, ancienne pièce présente")
    (current / "exports/02.html").unlink()
    expect(refused(module, with_finding, base), "pièce courante absente, ancienne pièce présente")

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

if os.environ.get("RECEIPT_NODE"):
    with tempfile.TemporaryDirectory(prefix="receipt-node-") as directory:
        base = Path(directory)
        child = base / "child.cjs"
        for label, source, expected_failure in [
            ("succès", "const t=require('node:test');t('ok',()=>{});", 0),
            ("annulation réelle", "const t=require('node:test');const c=new AbortController();t('ok',()=>{});t('pending',{signal:c.signal},()=>new Promise(()=>{}));setImmediate(()=>c.abort());", 1),
        ]:
            child.write_text(source)
            # Le Node parent du wrapper est lui-même un test : ne pas faire
            # passer l'enfant autonome pour son worker de test hérité.
            child_env = {key: value for key, value in os.environ.items() if key != "NODE_TEST_CONTEXT"}
            # NODE_OPTIONS est préservé : un reporter TAP hérité ne doit pas être ajouté une deuxième fois.
            options = node_options_tokens(child_env.get("NODE_OPTIONS", ""))
            reporters, destinations = [], []
            index = 0
            while index < len(options):
                name, equals, value = options[index].partition("=")
                name = name.replace("_", "-")  # Nom uniquement : les valeurs restent littérales.
                for flag, values in [("--test-reporter", reporters), ("--test-reporter-destination", destinations)]:
                    if name == flag:
                        if not equals:
                            index += 1
                            value = options[index] if index < len(options) else ""
                        values.append(value)
                        break
                index += 1
            if (reporters not in ([], ["tap"]) or destinations not in ([], ["stdout"]) or
                    (destinations and reporters != ["tap"])):
                raise SystemExit("NODE_OPTIONS : reporter/destination incompatible avec un unique TAP sur stdout ; aucun enfant Node lancé")
            reporter = [] if reporters else ["--test-reporter=tap"]
            run = subprocess.run([os.environ["RECEIPT_NODE"], "--test", *reporter, str(child)],
                                 capture_output=True, text=True, timeout=10, env=child_env)
            try:
                counts = module.parse_suite(run.stdout)
            except module.AuditError as error:
                raise SystemExit(f"Node réel {label}, status={run.returncode}: {error}\nstdout={run.stdout}\nstderr={run.stderr}") from error
            # Suivant le producteur Node, abort peut être compté fail plutôt
            # que cancelled : ne pas inventer une annulation seule native.
            expect(bool(counts["failed"] or counts["cancelled"]) is bool(expected_failure),
                   label + " : échec ou annulation effectivement compté par Node")
            receipt = synthetic_receipt(module, base)
            (base / "suite.log").write_text(run.stdout)
            receipt["tests"].update(counts, log_sha256=module.sha(base / "suite.log"))
            expect(bool(refused(module, receipt, base)) is bool(expected_failure),
                   label + " : reçu issu du vrai journal Node")
            print("Node réel : %s, status=%s, compteurs=%s" % (label, run.returncode, counts))

print("contrôles du reçu : %d vérifiés" % CHECKED)
