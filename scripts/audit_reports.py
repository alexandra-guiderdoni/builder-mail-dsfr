"""Vérifie les rapports activés, avec l’inspecteur officiel du kit en lecture seule."""

import argparse
import asyncio
import importlib.util
import json
from pathlib import Path

import yaml
from playwright.async_api import async_playwright


async def main(root):
    config = yaml.safe_load((root / "campaign.yaml").read_text())
    inspector = (
        Path(config["tooling"]["kit_root"])
        / ".claude/skills/audit-report-dsfr/scripts/capture_audit_reports.py"
    )
    spec = importlib.util.spec_from_file_location("report_inspector", inspector)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    build = json.loads((root / "rapport-dsfr/BUILD.json").read_text())
    outputs = {entry["path"] for entry in build["outputs"]}
    reports = [
        {
            "key": "portal",
            "type": "portal",
            "page": None,
            "path": root / "PORTAIL-AUDITS.html",
        }
    ]
    for page in config["sample"]:
        for kind in ["rgaa", "dsfr"]:
            if not config["phases"].get(kind + "_checks"):
                continue
            relative = f"{kind}/pages-html/{page['id']}.html"
            assert relative in outputs and (root / relative).is_file(), relative
            reports.append(
                {
                    "key": kind + "-" + page["id"],
                    "type": kind,
                    "page": page,
                    "path": root / relative,
                }
            )
    assert "PORTAIL-AUDITS.html" in outputs
    directory = root / "rapport-dsfr/captures-validation"
    directory.mkdir(parents=True, exist_ok=True)
    result = {
        "method": "Inspecteur du kit ; sélection limitée aux rapports réellement activés dans campaign.yaml",
        "inspector_sha256": module.digest(inspector),
        "reports": {},
    }
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        try:
            for report in reports:
                for width in [1440, 390] if report["type"] == "portal" else [1440]:
                    key = report["key"] + "-" + str(width)
                    result["reports"][key] = await module.inspect(
                        browser, report, width, 1000, directory / (key + ".png")
                    )
        finally:
            await browser.close()
    result["errors"] = [
        f"{key}: {error}"
        for key, value in result["reports"].items()
        for error in value["errors"]
    ]
    result["errors"].extend(
        f"{key}: débordement horizontal"
        for key, value in result["reports"].items()
        if value["horizontalOverflow"]
    )
    result["valid"] = not result["errors"]
    (directory / "REPORT-REVIEW.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "reports": len(result["reports"]),
                "valid": result["valid"],
                "errors": result["errors"],
            },
            ensure_ascii=False,
        )
    )
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("campaign", type=Path)
    args = parser.parse_args()
    raise SystemExit(asyncio.run(main(args.campaign.resolve())))
