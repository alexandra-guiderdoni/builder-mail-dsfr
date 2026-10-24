"""Publie les faits de la campagne locale, sans transformer les sondes en conformité.

Chaque contrôle passe par le journal (`Journal.check`) : aucun `assert`, donc le
résultat est identique avec et sans `python3 -O`. Les compteurs du reçu sont
calculés depuis ce journal, et un reçu favorable est vérifié contre ses preuves
(`verify_receipt`) avant toute écriture.
"""

import collections
import hashlib
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / os.environ.get("BUILDER_AUDIT_OUTPUT", "evidence/accessibilite-20261022")
CAMPAIGN = RAW / "campagne"
OUT = ROOT / os.environ.get("BUILDER_AUDIT_DOCS", "docs/accessibilite")
EXPECTED_TESTS = int(os.environ.get("BUILDER_AUDIT_TESTS", "72"))
REFERENCE = Path(
    os.environ.get(
        "BUILDER_AUDIT_REFERENCE",
        "/Users/alex/Claude/.claude/skills/audit-rgaa-complet/references/rgaa-4.1.2.json",
    )
)
CONFIRMING = {"NC_CONFIRMEE", "A_RETESTER"}
HEADING = re.compile(r"<h[1-6]\b|role\s*=\s*[\"']?heading", re.IGNORECASE)


class AuditError(Exception):
    """Un contrôle de la campagne a échoué : le reçu ne doit pas paraître favorable."""


class Journal:
    """Journal des contrôles. Les compteurs sont toujours recalculés depuis ses entrées."""

    def __init__(self):
        self.entries = []

    def check(self, name, condition, detail=""):
        passed = bool(condition)
        self.entries.append({"name": name, "passed": passed, "detail": str(detail)})
        return passed

    def passed(self, name):
        return any(e["name"] == name and e["passed"] for e in self.entries)

    def summary(self):
        passed = sum(e["passed"] for e in self.entries)
        return {
            "total": len(self.entries),
            "passed": passed,
            "failed": len(self.entries) - passed,
            "journal": list(self.entries),
        }

    def finish(self):
        summary = self.summary()
        if not summary["total"]:
            raise AuditError("Aucun contrôle exécuté : le journal ne prouve rien.")
        failures = [e for e in self.entries if not e["passed"]]
        if failures:
            raise AuditError(
                f"{len(failures)} contrôle(s) en échec : "
                + " ; ".join(f"{e['name']} ({e['detail']})" for e in failures)
            )
        return summary


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def clean(value):
    return (
        unicodedata.normalize("NFC", re.sub(r"\[([^]]+)\]\([^)]*\)", r"\1", value))
        .replace("|", " / ")
        .replace("\n", " ")
        .replace("modifie ou supprime", "permet de modifier ou de supprimer")
    )


def find_one(directory, pattern):
    found = next(directory.glob(pattern), None)
    if found is None:
        raise AuditError(f"Preuve brute absente : {directory}/{pattern}")
    return found


def parse_suite(text):
    """Compteurs du journal de tests Node (formats `ℹ pass N` et `# pass N`)."""
    counts = {}
    for key, label in [("passed", "pass"), ("failed", "fail"), ("skipped", "skipped")]:
        found = re.search(rf"(?:ℹ|#) {label} (\d+)\b", text)
        if not found:
            raise AuditError(f"Journal de tests sans compteur « {label} »")
        counts[key] = int(found.group(1))
    return counts


def confirm(finding, journal, proof, qualification, **fields):
    """Qualifie un constat seulement si le contrôle `proof` a réussi dans le journal."""
    if not journal.passed(proof):
        raise AuditError(
            f"Constat {finding['id']} : preuve « {proof} » absente ou en échec"
        )
    finding.update(qualification=qualification, proof=proof, **fields)
    return finding


def titles_finding(raw, journal, semantic):
    """MAIL-TITRES-001 : jamais confirmé d’avance, seulement depuis les exports."""
    finding = {
        "id": "MAIL-TITRES-001",
        "criterion": "9.1",
        "test": "9.1.3",
        "qualification": "NON_QUALIFIE",
        "pages": ["P05", "P13"],
        "observation": "Titres et rubriques visuels en strong/span ; aucun h1-h6 ni role=heading dans ces documents.",
        "expected": "Structurer les titres correspondant aux contenus, avec une hiérarchie cohérente.",
        "reproduction": "Ouvrir exports/02.html et exports/10.html puis examiner les titres visuels et leur sémantique DOM.",
        "review": "Contre-audit statique indépendant Astra : défaut majeur confirmé ; correction UI distincte approuvée.",
        "evidence": [
            "evidence/accessibilite-20261022/exports/02.html",
            "evidence/accessibilite-20261022/exports/10.html",
        ],
        "source": "https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#9.1.3",
    }
    texts = {}
    for name in ["02.html", "10.html"]:
        path = raw / "exports" / name
        if path.is_file():
            texts[name] = path.read_text()
    exports_present = journal.check(
        "titres-exports-presents",
        len(texts) == 2,
        f"exports lus : {sorted(texts)}",
    )
    if semantic:
        visual = semantic.get("visual", {}).get("observations", [])
        outputs = semantic.get("outputs", {})
        proven = journal.check(
            "titres-retest-semantique",
            exports_present
            and len(visual) == 54
            and all(item.get("pixelEquivalent") is True for item in visual)
            and outputs.get("accessibleTree") is not None
            and outputs.get("accessibleTree")
            == outputs.get("expected")
            == outputs.get("copied")
            and all(re.search(r"<h[1-6]\b", text) for text in texts.values()),
            "54 observations visuelles équivalentes, arbre AX = attendu = copié, h1-h6 dans les exports",
        )
        if proven:
            confirm(
                finding,
                journal,
                "titres-retest-semantique",
                "A_RETESTER",
                previous_qualification="NC_CONFIRMEE",
                observation="32 champs de titres adaptés ; titres natifs vérifiés dans aperçu, téléchargement, copie et arbre AX. Qualification éditoriale et restitution vocale encore manquantes.",
                review="Astra : GO structurel local ; aucune conformité RGAA globale ni compatibilité Outlook nouvelle affirmée.",
                evidence=[str((raw / "semantic-retest.json").relative_to(ROOT))],
            )
    else:
        proven = journal.check(
            "titres-defaut-observe",
            exports_present and not any(HEADING.search(t) for t in texts.values()),
            "exports lus sans h1-h6 ni role=heading",
        )
        if proven:
            confirm(finding, journal, "titres-defaut-observe", "NC_CONFIRMEE")
    return finding


def presentation_finding(presentation, path, root, journal):
    """MAIL-PRESENTATION-002 : jamais confirmé d’avance, seulement depuis les relevés."""
    pages = presentation.get("pages", [])
    finding = {
        "id": "MAIL-PRESENTATION-002",
        "criterion": "10.1",
        "test": "10.1.2",
        "qualification": "NON_QUALIFIE",
        "pages": [page["page"] for page in pages],
        "observation": "Attributs de présentation interdits présents dans les dix HTML autonomes ; exceptions img/objets et select appliquées.",
        "scope": presentation.get("scope"),
        "source": presentation.get("source"),
        "evidence": str(path.relative_to(root)),
        "element_counts": {page["page"]: page["count"] for page in pages},
        "attribute_counts": {
            page["page"]: sum(len(item["attrs"]) for item in page["instances"])
            for page in pages
        },
        "review": "Astra : rattachement et non-conformité confirmés pour les HTML examinés comme pages web ; aucun verdict sur le message reçu.",
    }
    proven = journal.check(
        "presentation-attributs-releves",
        bool(pages)
        and all(page["count"] > 0 and page["instances"] for page in pages)
        and finding["attribute_counts"]
        and all(count > 0 for count in finding["attribute_counts"].values())
        and path.is_file(),
        f"{len(pages)} page(s) avec instances relevées",
    )
    if proven:
        confirm(finding, journal, "presentation-attributs-releves", "NC_CONFIRMEE")
    return finding


def verify_receipt(receipt, root):
    """Refuse un reçu favorable dont les preuves sont absentes ou incohérentes."""
    problems = []
    controls = receipt.get("controls")
    entries = controls.get("journal") if isinstance(controls, dict) else None
    names = set()
    if not entries:
        problems.append("journal des contrôles absent ou vide")
    else:
        names = {e.get("name") for e in entries if e.get("passed") is True}
        passed = sum(e.get("passed") is True for e in entries)
        expected = {
            "total": len(entries),
            "passed": passed,
            "failed": len(entries) - passed,
        }
        for key, value in expected.items():
            if controls.get(key) != value:
                problems.append(
                    f"compteur « {key} » déclaré {controls.get(key)!r}, journal {value}"
                )
        if expected["failed"]:
            problems.append(
                f"{expected['failed']} contrôle(s) en échec dans le journal"
            )
    tests = receipt.get("tests") or {}
    log = root / str(tests.get("log", ""))
    if not tests.get("log") or not log.is_file():
        problems.append("journal de tests absent")
    else:
        if sha(log) != tests.get("log_sha256"):
            problems.append("empreinte du journal de tests différente")
        try:
            counts = parse_suite(log.read_text())
        except AuditError as error:
            problems.append(str(error))
        else:
            for key, value in counts.items():
                if tests.get(key) != value:
                    problems.append(
                        f"tests « {key} » déclaré {tests.get(key)!r}, journal {value}"
                    )
            if counts["failed"] or counts["skipped"]:
                problems.append("tests en échec ou ignorés dans le journal")
    for finding in receipt.get("confirmed_findings", []):
        if finding.get("qualification") not in CONFIRMING:
            continue
        label = finding.get("id", "?")
        if finding.get("proof") not in names:
            problems.append(f"constat {label} sans contrôle réussi nommé en preuve")
        evidence = finding.get("evidence") or []
        for item in [evidence] if isinstance(evidence, str) else evidence:
            if not (root / item).is_file():
                problems.append(f"constat {label} : pièce absente {item}")
        if not evidence:
            problems.append(f"constat {label} sans pièce")
    if problems:
        raise AuditError("Reçu favorable refusé : " + " ; ".join(problems))


def collect(journal):
    reference = read(REFERENCE)
    check = journal.check
    check(
        "referentiel-rgaa",
        reference.get("counts") == {"themes": 13, "criteria": 106, "tests": 258},
        reference.get("counts"),
    )
    state = read(CAMPAIGN / ".creator/state.json")
    manifest = read(RAW / "supplements/manifest.json")
    inventory = read(RAW / "supplements/inventory.json")
    catalog = read(CAMPAIGN / "collectes-ay11/catalogue-sondes.json")
    scenes = {
        "editor",
        "expanded",
        "invalid",
        "dialog",
        "dialog-invalid",
        "snum-invalid",
        "snum-converted",
    }
    if os.environ.get("BUILDER_AUDIT_ALL_PAGES") == "1":
        scenes.update(f"P{index:02}" for index in range(1, 14))
    check(
        "inventaire-scenes",
        {item["scene"] for item in inventory} == scenes,
        sorted({item["scene"] for item in inventory} ^ scenes),
    )
    variants_path = RAW / "supplements/variants.json"
    variants = (
        read(variants_path)
        if variants_path.exists()
        else [
            item
            for item in inventory
            if item["scene"] == "editor" and item["status"] == "executed"
        ]
    )
    expected_variants = {(item["family"], item.get("criterion")) for item in variants}
    check(
        "variantes-sondes",
        {family for family, _ in expected_variants}
        == {probe["probe"] for probe in catalog["probes"]},
        "familles de variantes différentes du catalogue",
    )
    commands = {item["name"]: item for item in manifest}
    check(
        "manifeste-sans-doublon",
        len(commands) == len(manifest),
        "Commande dupliquée dans le manifeste",
    )
    expected_commands = set()
    for scene in sorted(scenes):
        executed = [
            item
            for item in inventory
            if item["scene"] == scene and item["status"] == "executed"
        ]
        check(
            f"variantes-executees-{scene}",
            len(executed) == len(expected_variants)
            and {(x["family"], x.get("criterion")) for x in executed}
            == expected_variants,
            f"{len(executed)} exécutées pour {len(expected_variants)} attendues",
        )
        capture = scene + "-capture"
        expected_commands.add(capture)
        args = commands.get(capture, {}).get("args", [])
        check(
            f"capture-{scene}",
            args[:2] == ["preaudit", "capture-browser"]
            and "--profile" in args
            and args[args.index("--profile") + 1] == "rgaa-106"
            and {"--axe", "--form-interactions", "--temporal-probes"} <= set(args),
            "commande de capture absente ou différente",
        )
        for item in executed:
            name = "-".join(
                filter(None, [scene, item["family"], item.get("criterion")])
            )
            expected_commands.add(name)
            args = commands.get(name, {}).get("args", [])
            criterion_ok = (
                "--criterion" in args
                and args[args.index("--criterion") + 1] == item["criterion"]
                if item.get("criterion")
                else "--criterion" not in args
            )
            check(
                f"sonde-{name}",
                item["output"] == name + ".json"
                and args[:2] == ["probes", item["family"]]
                and criterion_ok,
                "commande de sonde absente ou différente",
            )
    check(
        "commandes-attendues",
        set(commands) == expected_commands,
        sorted(set(commands) ^ expected_commands),
    )
    failed_commands = sum(item["exit_code"] != 0 for item in manifest)
    check("commandes-sans-echec", failed_commands == 0, f"{failed_commands} en échec")
    exports = read(RAW / "exports/index.json")
    blocks = len({block for item in exports for block in item["blocks"]})
    check("composants-exportes", blocks == 52, f"{blocks} composants")
    browser = read(RAW / "browser.json")
    check(
        "etats-navigateur",
        len(browser["snapshots"]) == 11 and not browser["errors"],
        f"{len(browser['snapshots'])} états, {len(browser['errors'])} erreur(s)",
    )
    check(
        "sources-mesurees-declarees",
        bool(browser["measuredFilesSha256"]),
        "aucune empreinte de source mesurée",
    )
    for name, digest in browser["measuredFilesSha256"].items():
        path = ROOT / name
        check(
            f"source-mesuree-{name}",
            path.is_file() and sha(path) == digest,
            "Source différente de la collecte",
        )
    suite_path = RAW / "suite.log"
    suite = parse_suite(suite_path.read_text())
    check(
        "suite-tests-reussis",
        suite["passed"] == EXPECTED_TESTS,
        f"{suite['passed']} réussis pour {EXPECTED_TESTS} attendus",
    )
    check("suite-tests-sans-echec", suite["failed"] == 0, f"{suite['failed']} en échec")
    check(
        "suite-tests-sans-ignore", suite["skipped"] == 0, f"{suite['skipped']} ignorés"
    )
    pages, observations, forms, main_calls = [], [], [], 0
    for page_id, info in sorted(state["pages"].items()):
        collection_path = find_one(
            CAMPAIGN / "captures-ay11" / page_id, "**/*browser-collection.json"
        )
        collection = read(collection_path)
        summary_path = find_one(
            CAMPAIGN / "collectes-ay11" / page_id, "**/sondes-resume.json"
        )
        summary = read(summary_path)
        main_calls += summary["call_count"]
        axe = read(
            Path(collection["tool_evidence_collections"][0]["raw_artifact_path"])
        )
        rendered = Path(collection["rendered_html_path"])
        validator = read(CAMPAIGN / "validateur-w3c" / f"{page_id}.json")
        pages.append(
            {
                "id": page_id,
                "name": collection.get("title"),
                "url": collection["page_url_final"],
                "rendered_sha256": sha(rendered),
                "raw_collection": str(collection_path.relative_to(ROOT)),
                "raw_axe": {
                    kind: [
                        {"rule": x["id"], "instances": len(x["nodes"])}
                        for x in axe[kind]
                    ]
                    for kind in ["violations", "incomplete"]
                },
                "html_validator": dict(
                    collections.Counter(x["type"] for x in validator["messages"])
                ),
            }
        )
        for criterion, result in summary["criteria"].items():
            observations.append(
                {
                    "criterion": criterion,
                    "scene": page_id,
                    "granularity": "critere_entier",
                    "qualification": "NON_TESTE",
                    "observation": result,
                    "evidence": str(summary_path.relative_to(ROOT)),
                }
            )

    supplement_statuses = collections.Counter()
    for item in inventory:
        if item["status"] != "executed":
            continue
        path = RAW / "supplements" / item["output"]
        result = read(path)
        supplement_statuses[
            result.get("collection_status", "sans_statut_de_collecte")
        ] += 1
        criteria = (
            [result["criterion_id"]]
            if result.get("criterion_id")
            else result.get("criteria", [])
        )
        for criterion in criteria:
            observations.append(
                {
                    "criterion": criterion,
                    "scene": item["scene"],
                    "family": item["family"],
                    "granularity": "critere_entier",
                    "qualification": "NON_TESTE",
                    "collection_status": result.get("collection_status"),
                    "evidence": str(path.relative_to(ROOT)),
                }
            )
    for directory in sorted(x for x in (RAW / "supplements").iterdir() if x.is_dir()):
        collection = read(find_one(directory, "*browser-collection.json"))
        forms.extend(
            {
                "scene": directory.name,
                "scenario": x["scenario_id"],
                "status": x["scenario_status"],
                "target": x.get("target_field_selector"),
            }
            for x in collection.get("interaction_runs", [])
        )

    semantic_path = RAW / "semantic-retest.json"
    semantic = read(semantic_path) if semantic_path.exists() else None
    confirmed = titles_finding(RAW, journal, semantic)
    other_findings = []
    presentation_path = RAW / "presentation-attributes.json"
    if presentation_path.exists():
        other_findings.append(
            presentation_finding(
                read(presentation_path), presentation_path, ROOT, journal
            )
        )
    matrix = {
        "referential": "RGAA 4.1.2",
        "source": reference["source"],
        "reference_sha256": sha(REFERENCE),
        "target_percent": 100,
        "official_compliance_rate": None,
        "guardrail": "Les observations de critère ne prouvent aucun test individuel. Aucune non-applicabilité déduite d’une cible absente.",
        "pages": [x["id"] for x in pages],
        "states": sorted({x["scene"] for x in inventory}),
        "criteria": [
            {
                "id": c["criterion_id"],
                "expected": clean(c["title"]),
                "qualification": "NON_TESTE",
                "tests": c["test_ids"],
                "source": c["source_url"],
            }
            for c in reference["criteria"]
        ],
        "tests": [
            {
                "id": t["test_id"],
                "criterion": t["criterion_id"],
                "expected": clean(t["title"]),
                "qualification_all_pages_and_states": "NON_TESTE",
                "applicability": "À qualifier pour chaque instance",
                "human_validation_required": True,
                "source": t["source_url"],
            }
            for t in reference["tests"]
        ],
        "criterion_observations": observations,
        "confirmed_findings": [confirmed, *other_findings],
    }
    next(c for c in matrix["criteria"] if c["id"] == "9.1").update(
        qualification=confirmed["qualification"], confirmed_pages=confirmed["pages"]
    )
    next(t for t in matrix["tests"] if t["id"] == "9.1.3").update(
        qualification_all_pages_and_states="NON_TESTE sauf P05 et P13 : "
        + confirmed["qualification"],
        confirmed_pages=confirmed["pages"],
    )
    for finding in other_findings:
        next(c for c in matrix["criteria"] if c["id"] == finding["criterion"]).update(
            qualification=finding["qualification"], confirmed_pages=finding["pages"]
        )
        next(t for t in matrix["tests"] if t["id"] == finding["test"]).update(
            qualification_all_pages_and_states="NON_TESTE sauf "
            + ", ".join(finding["pages"])
            + " : "
            + finding["qualification"],
            confirmed_pages=finding["pages"],
        )
    artifacts = [
        p
        for p in RAW.rglob("*")
        if p.is_file()
        and not any(
            part in ["profile", "baseline"] for part in p.relative_to(RAW).parts
        )
    ]
    attempts = sorted(RAW.glob("supplements-attempt-*/manifest.json"))
    receipt = {
        "schema_version": 2,
        "audited_at": "2026-10-22",
        "target_percent": 100,
        "official_compliance_rate": None,
        "human_qualification": False,
        "screen_reader_executed": False,
        "git_parent": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        "distribution_sha256": {
            str(p.relative_to(ROOT)): sha(p)
            for p in [
                ROOT / "app/distribution/portable.html",
                ROOT / "app/distribution/web/index.html",
                ROOT / "app/distribution/web/sw.js",
                ROOT / "app/distribution/snum.html",
            ]
        },
        "product_source_sha256": {
            str(p.relative_to(ROOT)): sha(p)
            for p in sorted((ROOT / "app/source").glob("*"))
            if p.is_file()
        },
        "browser_measured_sha256": browser["measuredFilesSha256"],
        "pages": pages,
        "mail_components": blocks,
        "mail_exports": exports,
        "confirmed_findings": [confirmed, *other_findings],
        "browser_states": browser["snapshots"],
        "browser_errors": browser["errors"],
        "tests": {
            **suite,
            "log": str(suite_path.relative_to(ROOT)),
            "log_sha256": sha(suite_path),
        },
        "ay11": {
            "families": catalog["probe_count"],
            "criteria_in_probe_catalogue": catalog["criteria_count"],
            "main_calls": main_calls,
            "supplement_probe_calls": sum(
                item["status"] == "executed" for item in inventory
            ),
            "supplement_captures": len(scenes),
            "supplement_command_failures": failed_commands,
            "supplement_collection_statuses": dict(supplement_statuses),
            "unavailable": catalog["skipped"],
            "form_runs": forms,
            "profile_requested_in_supplements": "rgaa-106",
            "automatic_conformity": False,
        },
        "creator_phases": {k: v["status"] for k, v in state["phases"].items()},
        "firefox": read(RAW / "firefox/receipt.json"),
        "keyboard": read(RAW / "keyboard.json"),
        "layout": read(RAW / "layout-protocols.json"),
        "contrast_selects": read(RAW / "contrast-selects.json"),
        "semantic_retest": semantic,
        "mail_layout": read(RAW / "mail-layout-full.json")
        if (RAW / "mail-layout-full.json").exists()
        else None,
        "collection_retries": {
            "attempts": [
                {
                    "manifest": str(path.relative_to(ROOT)),
                    "failed_commands": sum(
                        item["exit_code"] != 0 for item in read(path)
                    ),
                }
                for path in attempts
            ],
            "reasons": [
                "Premier appel statique refusé : parcours sans action.",
                "Deuxième appel statique refusé : --expect nécessite un parcours.",
                "Appel corrigé sans ces options pour les pages statiques ; P01 exécutée séparément avant les douze autres.",
            ],
        }
        if attempts
        else None,
        "report_review": read(
            CAMPAIGN / "rapport-dsfr/captures-validation/REPORT-REVIEW.json"
        )
        if (CAMPAIGN / "rapport-dsfr/captures-validation/REPORT-REVIEW.json").exists()
        else None,
        "raw_evidence_files": len(artifacts),
        "raw_inventory_sha256": hashlib.sha256(
            "\n".join(
                f"{p.relative_to(RAW)} {sha(p)}" for p in sorted(artifacts)
            ).encode()
        ).hexdigest(),
        "limits": [
            "Les statuts Creator et ceux de la capture des rapports sont séparés ; ils ne qualifient aucun critère humain.",
            "Les qualifications NON_TESTE ne sont ni des conformités ni des non-applicabilités.",
            "Les tests de saisie Firefox utilisent des événements input ; ils ne prouvent aucune restitution vocale.",
            "Les exports mail ont des candidats de structure et de présentation à instruire ; aucune compatibilité Outlook nouvelle n’est affirmée.",
        ],
    }
    return matrix, receipt, pages, observations, len(artifacts)


def publish(matrix, receipt):
    OUT.mkdir(parents=True, exist_ok=True)
    write("matrice-rgaa.json", matrix)
    for key, name, title in [
        ("criteria", "MATRICE-106.md", "106 critères"),
        ("tests", "MATRICE-258.md", "258 tests"),
    ]:
        lines = [
            f"# Matrice RGAA — {title}",
            "",
            "Objectif : **100 %**. Qualification exhaustive encore inachevée : **NON_TESTE** sur chaque page, état et instance non qualifiés. Aucun taux publié.",
            "",
            "Les attentes sont issues du référentiel officiel sous Licence Ouverte 2.0. Les observations instrumentées par critère figurent dans [la matrice JSON](matrice-rgaa.json) ; elles ne valent pas exécution de chaque test. Voir le [rapport](RAPPORT.md) pour les corrections et lacunes.",
            "",
            "| Référence | Attendu | Qualification |",
            "|---|---|---|",
        ]
        lines.extend(
            f"| [{x['id']}]({x['source']}) | {x['expected']} | {x.get('qualification', x.get('qualification_all_pages_and_states'))} |"
            for x in matrix[key]
        )
        (OUT / name).write_text("\n".join(lines) + "\n")
    write("recu-20261022.json", receipt)


def main():
    journal = Journal()
    try:
        matrix, receipt, pages, observations, artifacts = collect(journal)
        receipt["controls"] = journal.finish()
        verify_receipt(receipt, ROOT)
    except (AuditError, OSError, KeyError, ValueError) as error:
        print(f"Reçu non publié : {error!r}", file=sys.stderr)
        return 1
    publish(matrix, receipt)
    print(
        json.dumps(
            {
                "criteria": len(matrix["criteria"]),
                "tests": len(matrix["tests"]),
                "pages": len(pages),
                "observations": len(observations),
                "raw_evidence_files": artifacts,
                "controls": {
                    k: receipt["controls"][k] for k in ["total", "passed", "failed"]
                },
                "official_rate": None,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
