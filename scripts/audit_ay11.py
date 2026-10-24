"""Collectes complémentaires sur des états réels, sans modifier AY11 ni sa base."""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AY11 = Path("/Users/alex/Claude/git-hors-workflow/ay11-pre-audit")
OUT = (
    ROOT / os.environ.get("BUILDER_AUDIT_OUTPUT", "evidence/accessibilite-20261022")
) / "supplements"
sys.path.insert(0, str(AY11 / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_expectations import ScenarioError, scene_expectation_error, select_scenes
from ay11.cli import build_parser

ENV = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1", "PYTHONPATH": str(AY11 / "src")}
manifest = []


def variant_criteria(probe):
    options = [a for a in probe._actions if a.dest not in ["help", "json"]]
    if any(a.required and a.choices is not None and not a.choices for a in options):
        return []
    choice = next(
        (a for a in options if a.dest == "criterion" and a.choices is not None), None
    )
    return list(choice.choices) if choice else [None]


def call(name, args):
    start = time.monotonic()
    with (
        (OUT / f"{name}.json").open("w") as stdout,
        (OUT / f"{name}.log").open("w") as stderr,
    ):
        result = subprocess.run(
            [str(AY11 / ".venv/bin/python"), "-B", "-m", "ay11", *args],
            cwd=AY11,
            env=ENV,
            stdout=stdout,
            stderr=stderr,
            check=False,
        )
    item = {
        "name": name,
        "args": args,
        "exit_code": result.returncode,
        "seconds": round(time.monotonic() - start, 3),
    }
    manifest.append(item)
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        json.dumps({k: item[k] for k in ["name", "exit_code", "seconds"]}), flush=True
    )
    return result.returncode


def click(selector):
    return {"type": "click", "selector": selector}


def fill(selector, value):
    return {"type": "fill", "selector": selector, "value": value}


def press(selector, key):
    return {"type": "press", "selector": selector, "key": key}


OUT.mkdir(parents=True, exist_ok=True)
editor = [click("[data-action=resume-document]")]
dialog = [click("[data-library-action=rename]")]
packet = subprocess.check_output(
    [
        "node",
        "-e",
        "process.stdout.write(JSON.stringify(require('./tests/fixtures/snum.cjs')()))",
    ],
    cwd=ROOT,
    text=True,
)
scenes = [
    ("editor", "portable.html", editor, "Votre composition"),
    (
        "expanded",
        "portable.html",
        editor
        + [
            click(f'summary:has-text("{text}")')
            for text in [
                "Mes modèles",
                "Identités de service",
                "Ajouter un composant",
                "Fichiers et récupération",
                "Importer du JSON",
            ]
        ],
        "Identités de service",
    ),
    (
        "invalid",
        "portable.html",
        # L’erreur d’une URL s’affiche au départ du champ (issue #37) : Tab quitte le champ.
        editor
        + [
            fill("#article-source", "http://exemple.invalid/"),
            press("#article-source", "Tab"),
        ],
        "Protocole interdit : seul HTTPS est accepté",
    ),
    ("dialog", "portable.html", dialog, "Enregistrer le nom"),
    (
        "dialog-invalid",
        "portable.html",
        dialog + [fill("#library-name", ""), click("#library-confirm")],
        "Renseignez un nom pour la composition.",
    ),
    (
        "snum-invalid",
        "snum.html",
        [fill("#snum-input", "{"), click("#convert")],
        "JSON",
    ),
    (
        "snum-converted",
        "snum.html",
        [fill("#snum-input", packet), click("#convert")],
        "Exporter la composition JSON",
    ),
]
if os.environ.get("BUILDER_AUDIT_ALL_PAGES") == "1":
    scenes += [
        ("P01", "", [], "Mes newsletters"),
        ("P02", "portable.html", [], "Mes newsletters"),
        ("P03", "snum.html", [], "Convertir"),
    ]
    for index, expectation in enumerate(
        [
            "Votre service",
            "Titre",
            "Texte",
            "Description",
            "Titre",
            "Description",
            "Contact",
            "Bouton",
            "Vous recevez",
            "Revue de presse",
        ],
        start=1,
    ):
        scenes.append((f"P{index + 3:02}", f"mail/{index:02}.html", [], expectation))
try:
    scenes = select_scenes(scenes, os.environ.get("BUILDER_AUDIT_SCENES"))
except ScenarioError as error:
    sys.exit(f"BUILDER_AUDIT_SCENES : {error}")
parser = build_parser()
commands = next(a for a in parser._actions if isinstance(a, argparse._SubParsersAction))
probes = next(
    a
    for a in commands.choices["probes"]._actions
    if isinstance(a, argparse._SubParsersAction)
)
(OUT / "variants.json").write_text(
    json.dumps(
        [
            {"family": family, "criterion": criterion}
            for family, probe in probes.choices.items()
            for criterion in variant_criteria(probe)
        ],
        ensure_ascii=False,
        indent=2,
    )
    + "\n"
)
inventory = []
for scene, page, actions, expectation in scenes:
    directory = OUT / scene
    directory.mkdir(exist_ok=True)
    journey = directory / "journey.json"
    journey.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "read_only_effect_confirmed": True,
                "actions": actions,
            },
            ensure_ascii=False,
        )
        + "\n"
    )
    code = call(
        scene + "-capture",
        [
            "preaudit",
            "capture-browser",
            "http://127.0.0.1:"
            + os.environ.get("BUILDER_AUDIT_PORT", "4187")
            + "/"
            + page,
            "--output-dir",
            str(directory),
            *(["--journey", str(journey), "--expect", expectation] if actions else []),
            "--profile",
            "rgaa-106",
            "--axe",
            "--form-interactions",
            "--temporal-probes",
            "--json",
        ],
    )
    if code:
        inventory.append(
            {"scene": scene, "status": "capture_failed", "log": scene + "-capture.log"}
        )
        (OUT / "inventory.json").write_text(
            json.dumps(inventory, ensure_ascii=False, indent=2) + "\n"
        )
        continue
    collection = next(directory.glob("*browser-collection.json"))
    problem = scene_expectation_error(scene, actions, expectation, collection)
    if problem:
        print(problem, file=sys.stderr, flush=True)
        inventory.append(
            {"scene": scene, "status": "expectation_failed", "reason": problem}
        )
        (OUT / "inventory.json").write_text(
            json.dumps(inventory, ensure_ascii=False, indent=2) + "\n"
        )
        continue
    html = Path(json.loads(collection.read_text())["rendered_html_path"])
    for family, probe in probes.choices.items():
        options = [a for a in probe._actions if a.dest not in ["help", "json"]]
        if not variant_criteria(probe):
            inventory.append(
                {
                    "scene": scene,
                    "family": family,
                    "status": "not_available",
                    "reason": "Aucun critère proposé par AY11",
                }
            )
            continue
        for criterion in variant_criteria(probe):
            args = ["probes", family]
            for option in options:
                if not option.option_strings:
                    args.append(str(html if option.dest == "html_path" else collection))
            if criterion is not None:
                args += ["--criterion", criterion]
            if any(a.dest == "html_path" and a.option_strings for a in options):
                args += ["--html-path", str(html)]
            name = "-".join(filter(None, [scene, family, criterion]))
            code = call(name, [*args, "--json"])
            inventory.append(
                {
                    "scene": scene,
                    "family": family,
                    "criterion": criterion,
                    "status": "executed" if not code else "failed",
                    "output": name + ".json",
                }
            )
    (OUT / "inventory.json").write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2) + "\n"
    )
print(
    json.dumps(
        {
            "commands": len(manifest),
            "inventory_entries": len(inventory),
            "failed_commands": sum(item["exit_code"] != 0 for item in manifest),
            "expectation_failures": sum(
                item["status"] == "expectation_failed" for item in inventory
            ),
            "produces_conformity": False,
        }
    ),
    flush=True,
)
sys.exit(
    1
    if any(item["exit_code"] for item in manifest)
    or any(item["status"] == "expectation_failed" for item in inventory)
    else 0
)
