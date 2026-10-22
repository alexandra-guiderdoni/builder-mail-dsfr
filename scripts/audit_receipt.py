"""Publie les faits de la campagne locale, sans transformer les sondes en conformité."""

import collections
import hashlib
import json
import os
import re
import subprocess
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / os.environ.get("BUILDER_AUDIT_OUTPUT", "evidence/accessibilite-20261022")
CAMPAIGN = RAW / "campagne"
OUT = ROOT / os.environ.get("BUILDER_AUDIT_DOCS", "docs/accessibilite")
EXPECTED_TESTS = int(os.environ.get("BUILDER_AUDIT_TESTS", "72"))
REFERENCE = Path(
    "/Users/alex/Claude/.claude/skills/audit-rgaa-complet/references/rgaa-4.1.2.json"
)


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


reference = read(REFERENCE)
assert reference["counts"] == {"themes": 13, "criteria": 106, "tests": 258}
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
assert {item["scene"] for item in inventory} == scenes
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
assert {family for family, _ in expected_variants} == {
    probe["probe"] for probe in catalog["probes"]
}
commands = {item["name"]: item for item in manifest}
assert len(commands) == len(manifest), "Commande dupliquée dans le manifeste"
expected_commands = set()
for scene in scenes:
    executed = [
        item
        for item in inventory
        if item["scene"] == scene and item["status"] == "executed"
    ]
    assert len(executed) == len(expected_variants), f"Variantes dupliquées : {scene}"
    assert {(x["family"], x.get("criterion")) for x in executed} == expected_variants
    capture = scene + "-capture"
    expected_commands.add(capture)
    args = commands[capture]["args"]
    assert args[:2] == ["preaudit", "capture-browser"]
    assert args[args.index("--profile") + 1] == "rgaa-106"
    assert {"--axe", "--form-interactions", "--temporal-probes"} <= set(args)
    for item in executed:
        name = "-".join(filter(None, [scene, item["family"], item.get("criterion")]))
        expected_commands.add(name)
        assert item["output"] == name + ".json"
        args = commands[name]["args"]
        assert args[:2] == ["probes", item["family"]]
        if item.get("criterion"):
            assert args[args.index("--criterion") + 1] == item["criterion"]
        else:
            assert "--criterion" not in args
assert set(commands) == expected_commands
assert not any(item["exit_code"] for item in manifest)
exports = read(RAW / "exports/index.json")
assert len({block for item in exports for block in item["blocks"]}) == 52
browser = read(RAW / "browser.json")
assert len(browser["snapshots"]) == 11 and not browser["errors"]
assert browser["measuredFilesSha256"]
for name, digest in browser["measuredFilesSha256"].items():
    assert sha(ROOT / name) == digest, f"Source différente de la collecte : {name}"
suite = (RAW / "suite.log").read_text()
assert re.search(rf"(?:ℹ|#) pass {EXPECTED_TESTS}\b", suite)
assert re.search(r"(?:ℹ|#) fail 0\b", suite)
assert re.search(r"(?:ℹ|#) skipped 0\b", suite)
OUT.mkdir(parents=True, exist_ok=True)
pages, observations, forms, main_calls = [], [], [], 0
for page_id, info in sorted(state["pages"].items()):
    collection_path = next(
        (CAMPAIGN / "captures-ay11" / page_id).glob("**/*browser-collection.json")
    )
    collection = read(collection_path)
    summary_path = next(
        (CAMPAIGN / "collectes-ay11" / page_id).glob("**/sondes-resume.json")
    )
    summary = read(summary_path)
    main_calls += summary["call_count"]
    axe = read(Path(collection["tool_evidence_collections"][0]["raw_artifact_path"]))
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
                    {"rule": x["id"], "instances": len(x["nodes"])} for x in axe[kind]
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
    supplement_statuses[result.get("collection_status", "sans_statut_de_collecte")] += 1
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
    collection = read(next(directory.glob("*browser-collection.json")))
    forms.extend(
        {
            "scene": directory.name,
            "scenario": x["scenario_id"],
            "status": x["scenario_status"],
            "target": x.get("target_field_selector"),
        }
        for x in collection.get("interaction_runs", [])
    )

confirmed = {
    "id": "MAIL-TITRES-001",
    "criterion": "9.1",
    "test": "9.1.3",
    "qualification": "NC_CONFIRMEE",
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
semantic = (
    read(RAW / "semantic-retest.json")
    if (RAW / "semantic-retest.json").exists()
    else None
)
if semantic:
    assert len(semantic["visual"]["observations"]) == 54
    assert all(item["pixelEquivalent"] for item in semantic["visual"]["observations"])
    assert (
        semantic["outputs"]["accessibleTree"]
        == semantic["outputs"]["expected"]
        == semantic["outputs"]["copied"]
    )
    assert all(
        re.search(r"<h[1-6]\b", (RAW / "exports" / name).read_text())
        for name in ["02.html", "10.html"]
    )
    confirmed.update(
        qualification="A_RETESTER",
        previous_qualification="NC_CONFIRMEE",
        observation="32 champs de titres adaptés ; titres natifs vérifiés dans aperçu, téléchargement, copie et arbre AX. Qualification éditoriale et restitution vocale encore manquantes.",
        review="Astra : GO structurel local ; aucune conformité RGAA globale ni compatibilité Outlook nouvelle affirmée.",
        evidence=[str((RAW / "semantic-retest.json").relative_to(ROOT))],
    )
other_findings = []
presentation_path = RAW / "presentation-attributes.json"
presentation = read(presentation_path) if presentation_path.exists() else None
if presentation:
    other_findings.append(
        {
            "id": "MAIL-PRESENTATION-002",
            "criterion": "10.1",
            "test": "10.1.2",
            "qualification": "NC_CONFIRMEE",
            "pages": [page["page"] for page in presentation["pages"]],
            "observation": "Attributs de présentation interdits présents dans les dix HTML autonomes ; exceptions img/objets et select appliquées.",
            "scope": presentation["scope"],
            "source": presentation["source"],
            "evidence": str(presentation_path.relative_to(ROOT)),
            "element_counts": {
                page["page"]: page["count"] for page in presentation["pages"]
            },
            "attribute_counts": {
                page["page"]: sum(len(item["attrs"]) for item in page["instances"])
                for page in presentation["pages"]
            },
            "review": "Astra : rattachement et non-conformité confirmés pour les HTML examinés comme pages web ; aucun verdict sur le message reçu.",
        }
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

artifacts = [
    p
    for p in RAW.rglob("*")
    if p.is_file()
    and not any(part in ["profile", "baseline"] for part in p.relative_to(RAW).parts)
]
receipt = {
    "schema_version": 1,
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
    "mail_components": 52,
    "mail_exports": exports,
    "confirmed_findings": [confirmed, *other_findings],
    "browser_states": browser["snapshots"],
    "browser_errors": browser["errors"],
    "tests": {
        "passed": EXPECTED_TESTS,
        "failed": 0,
        "skipped": 0,
        "log": str((RAW / "suite.log").relative_to(ROOT)),
        "log_sha256": sha(RAW / "suite.log"),
    },
    "ay11": {
        "families": catalog["probe_count"],
        "criteria_in_probe_catalogue": catalog["criteria_count"],
        "main_calls": main_calls,
        "supplement_probe_calls": sum(
            item["status"] == "executed" for item in inventory
        ),
        "supplement_captures": len(scenes),
        "supplement_command_failures": 0,
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
                "failed_commands": sum(item["exit_code"] != 0 for item in read(path)),
            }
            for path in sorted(RAW.glob("supplements-attempt-*/manifest.json"))
        ],
        "reasons": [
            "Premier appel statique refusé : parcours sans action.",
            "Deuxième appel statique refusé : --expect nécessite un parcours.",
            "Appel corrigé sans ces options pour les pages statiques ; P01 exécutée séparément avant les douze autres.",
        ],
    }
    if (RAW / "supplements-attempt-001/manifest.json").exists()
    else None,
    "report_review": read(
        CAMPAIGN / "rapport-dsfr/captures-validation/REPORT-REVIEW.json"
    )
    if (CAMPAIGN / "rapport-dsfr/captures-validation/REPORT-REVIEW.json").exists()
    else None,
    "raw_evidence_files": len(artifacts),
    "raw_inventory_sha256": hashlib.sha256(
        "\n".join(f"{p.relative_to(RAW)} {sha(p)}" for p in sorted(artifacts)).encode()
    ).hexdigest(),
    "limits": [
        "Les statuts Creator et ceux de la capture des rapports sont séparés ; ils ne qualifient aucun critère humain.",
        "Les qualifications NON_TESTE ne sont ni des conformités ni des non-applicabilités.",
        "Les tests de saisie Firefox utilisent des événements input ; ils ne prouvent aucune restitution vocale.",
        "Les exports mail ont des candidats de structure et de présentation à instruire ; aucune compatibilité Outlook nouvelle n’est affirmée.",
    ],
}
write("recu-20261022.json", receipt)
print(
    json.dumps(
        {
            "criteria": len(matrix["criteria"]),
            "tests": len(matrix["tests"]),
            "pages": len(pages),
            "observations": len(observations),
            "raw_evidence_files": len(artifacts),
            "official_rate": None,
        }
    )
)
