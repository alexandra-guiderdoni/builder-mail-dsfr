"""Décrit et illustre le contrat JSON existant, sans changer les données de travail."""

import json


def qualification(catalogue):
    documents = []
    for family in dict.fromkeys(c["family"] for c in catalogue["components"]):
        blocks = [
            {
                "id": "recette-" + c["id"],
                "component": c["id"],
                "values": {f["key"]: f["default"] for f in c["fields"]},
                "source": "",
            }
            for c in catalogue["components"]
            if c["family"] == family
        ]
        documents.append(
            {
                "schema": "dsfr-mail/document",
                "version": 1,
                "catalogue": catalogue["id"],
                "id": f"recette-{len(documents)}",
                "name": f"Recette : {family}",
                "subject": f"Recette : {family}",
                "blocks": blocks,
            }
        )
    return {
        "schema": "dsfr-mail/library",
        "version": 1,
        "catalogue": catalogue["id"],
        "activeId": documents[0]["id"],
        "documents": documents,
        "templates": [],
        "identities": [],
    }


def object_schema(properties, title):
    return {
        "type": "object",
        "title": title,
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


def schema(catalogue):
    text = {"type": "string"}
    identifier = {"type": "string", "minLength": 1}
    name = {"type": "string", "pattern": r"\S"}
    definitions, all_blocks, frames = {}, [], []
    for component in catalogue["components"]:
        fields = {}
        for field in component["fields"]:
            value = {"type": "string", "title": field["label"]}
            if field["type"] == "image":
                value["pattern"] = (
                    r"^data:image/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$"
                )
            if field["type"] == "url":
                value["description"] = (
                    "Lien HTTPS ; les règles d’URL complètes sont contrôlées à l’import."
                )
            fields[field["key"]] = value
        key = component["id"]
        definitions[key] = object_schema(
            {
                "id": identifier,
                "component": {"const": key},
                "values": object_schema(fields, component["label"]),
                "source": text,
            },
            f"{component['family']} — {component['label']}",
        )
        reference = {"$ref": f"#/$defs/{key}"}
        definitions[key]["properties"]["sourceLabel"] = {
            "type": "string",
            "title": "Intitulé du lien source (facultatif)",
        }
        all_blocks.append(reference)
        if component["family"] in ["En-têtes", "Pieds de page"]:
            frames.append(reference)
    blocks = {"type": "array", "items": {"oneOf": all_blocks}}
    definitions["document"] = object_schema(
        {
            "schema": {"const": "dsfr-mail/document"},
            "version": {"const": 1},
            "catalogue": {"const": catalogue["id"]},
            "id": identifier,
            "name": name,
            "subject": text,
            "blocks": blocks,
        },
        "Composition générique",
    )
    document_list = {"type": "array", "items": {"$ref": "#/$defs/document"}}
    definitions["identity"] = object_schema(
        {
            "id": identifier,
            "name": name,
            "blocks": {"type": "array", "items": {"oneOf": frames}},
        },
        "Identité de service",
    )
    definitions["library"] = object_schema(
        {
            "schema": {"const": "dsfr-mail/library"},
            "version": {"const": 1},
            "catalogue": {"const": catalogue["id"]},
            "activeId": identifier,
            "documents": {**document_list, "minItems": 1},
            "templates": document_list,
            "identities": {"type": "array", "items": {"$ref": "#/$defs/identity"}},
        },
        "Bibliothèque générique",
    )
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": f"urn:dsfr-mail:composition:1:{catalogue['id']}",
        "title": "Compositions et bibliothèques de courriels DSFR",
        "description": "L’import complète ces contraintes par la validation des URL, des identifiants uniques et de la composition active.",
        "oneOf": [{"$ref": "#/$defs/document"}, {"$ref": "#/$defs/library"}],
        "$defs": definitions,
    }


def artifacts(catalogue):
    example = qualification(catalogue)["documents"][0]
    example.update(
        id="exemple", name="Exemple de composition", subject="Information de service"
    )
    example["blocks"] = [
        {
            "id": f"exemple-{c['id']}",
            "component": c["id"],
            "values": {f["key"]: f["default"] for f in c["fields"]},
            "source": "",
        }
        for c in catalogue["components"]
        if c["id"] in ["mail-05", "mail-19", "mail-40"]
    ]
    values = {
        "qualification.courriels.json": qualification(catalogue),
        "exemple.courriel.json": example,
        "courriels.schema.json": schema(catalogue),
    }
    return {
        name: (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()
        for name, value in values.items()
    }
