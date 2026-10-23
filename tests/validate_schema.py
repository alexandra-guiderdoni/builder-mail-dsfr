"""Valide des fichiers JSON contre un schéma JSON Schema 2020-12.

Outillage de développement uniquement : `jsonschema` n'est jamais requis par
l'application. Usage : validate_schema.py SCHEMA FICHIER...
Sortie JSON sur stdout ; code 2 si jsonschema est absent ou si le schéma est invalide.
"""
import json
import sys

try:
    from jsonschema import Draft202012Validator
    from jsonschema.exceptions import SchemaError
except ImportError:
    print("jsonschema absent : voir docs/MAINTENANCE.md", file=sys.stderr)
    sys.exit(2)

schema_path, *files = sys.argv[1:]
with open(schema_path, encoding="utf-8") as handle:
    schema = json.load(handle)
try:
    Draft202012Validator.check_schema(schema)
except SchemaError as error:
    print(f"schéma invalide : {error.message}", file=sys.stderr)
    sys.exit(2)

validator = Draft202012Validator(schema)
results = []
for name in files:
    with open(name, encoding="utf-8") as handle:
        instance = json.load(handle)
    errors = [f"{'/'.join(map(str, e.absolute_path)) or '.'}: {e.message[:200]}" for e in validator.iter_errors(instance)]
    results.append({"file": name, "valid": not errors, "errors": errors[:5]})
print(json.dumps(results, ensure_ascii=False))
