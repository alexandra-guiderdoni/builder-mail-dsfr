"""Contrôle l’empreinte de la copie SNUM adaptée déclarée dans la provenance du prototype.

La provenance porte deux niveaux : `sha256` est l’empreinte historique du fichier amont,
`adapted_sha256` celle de la copie locale adaptée. Seule la seconde est recalculée ici.
"""

import argparse
import hashlib
import json
from pathlib import Path

DEFAULT = Path(__file__).resolve().parents[1] / "prototype/reference"
ADAPTED = "snum-packet.js"


def check(directory):
    manifest = json.loads((directory / "provenance.json").read_text(encoding="utf-8"))
    entry = next(item for item in manifest["files"] if item["copy"] == ADAPTED)
    expected = entry.get("adapted_sha256")
    if not expected or expected == entry["sha256"]:
        raise SystemExit(
            f"PROVENANCE : {ADAPTED} doit déclarer une empreinte adaptée distincte de l’empreinte amont"
        )
    actual = hashlib.sha256((directory / ADAPTED).read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit(
            f"PROVENANCE : {ADAPTED} différent de l’empreinte adaptée déclarée "
            f"({actual[:12]} au lieu de {expected[:12]})"
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", type=Path, default=DEFAULT)
    check(parser.parse_args().dir)
    print("PROVENANCE_OK")


if __name__ == "__main__":
    main()
