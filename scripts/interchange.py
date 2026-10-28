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
                if component["id"] == "mail-31" and field["key"] == "f0":
                    value = {"title": field["label"], "anyOf": [{"const": ""}, value]}
            if field["type"] == "url":
                value["description"] = (
                    "Lien HTTPS ou mailto vers une adresse ASCII, avec subject facultatif ; "
                    "les autres paramètres sont refusés à l’import."
                    if component["family"] == "Pieds de page"
                    else "Lien HTTPS ; les règles d’URL complètes sont contrôlées à l’import."
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
        if key == "mail-50":
            definitions[key]["properties"]["additionalLinks"] = {
                "type": "array",
                "title": "Liens supplémentaires du pied de page (facultatifs)",
                "maxItems": 2,
                "items": object_schema(
                    {
                        "url": {
                            "type": "string",
                            "description": "Lien HTTPS ou mailto ; la validation complète est appliquée à l’import.",
                        },
                        "label": {
                            "type": "string",
                            "pattern": r"^[^\x00-\x1f\x7f-\x9f\u2028\u2029]*$",
                        },
                    },
                    "Lien supplémentaire du pied de page",
                ),
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
    # V1 reste fermée : seules les définitions V2 admettent une source distante explicite.
    v2_blocks, v2_frames = [], []
    clone = lambda value: json.loads(json.dumps(value))
    for component in catalogue["components"]:
        key = component["id"]
        v2 = clone(definitions[key])
        image_fields = [f["key"] for f in component["fields"] if f["type"] == "image"]
        if image_fields:
            v2["properties"]["remoteImages"] = {
                "type": "object", "minProperties": 1, "additionalProperties": False,
                "properties": {field: {"type": "string", "pattern": r"^[hH][tT][tT][pP][sS]://[^\s/@?#]+(?:[/?#][^\x00-\x20\x7f]*)?$"} for field in image_fields},
            }
        definitions[key + "-v2"] = v2
        reference = {"$ref": f"#/$defs/{key}-v2"}
        v2_blocks.append(reference)
        if component["family"] in ["En-têtes", "Pieds de page"]:
            v2_frames.append(reference)
    remote_block = {"type": "object", "required": ["remoteImages"], "properties": {"remoteImages": {"type": "object"}}}
    definitions["document-v2"] = clone(definitions["document"])
    definitions["document-v2"]["properties"]["version"] = {"const": 2}
    definitions["document-v2"]["properties"]["blocks"] = {"type": "array", "items": {"oneOf": v2_blocks}, "contains": remote_block}
    definitions["document-any"] = {"oneOf": [{"$ref": "#/$defs/document"}, {"$ref": "#/$defs/document-v2"}]}
    definitions["identity-v2"] = clone(definitions["identity"])
    definitions["identity-v2"]["properties"]["blocks"] = {"type": "array", "items": {"oneOf": v2_frames}}
    definitions["library-v2"] = clone(definitions["library"])
    properties = definitions["library-v2"]["properties"]
    properties["version"] = {"const": 2}
    properties["documents"] = {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/document-any"}}
    properties["templates"] = {"type": "array", "items": {"$ref": "#/$defs/document-any"}}
    properties["identities"] = {"type": "array", "items": {"$ref": "#/$defs/identity-v2"}}
    # Une bibliothèque V2 contient au moins une adresse distante (document ou identité).
    definitions["library-v2"]["anyOf"] = [
        {"properties": {field: {"type": "array", "contains": {"type": "object", "required": ["version"], "properties": {"version": {"const": 2}}}}}}
        for field in ["documents", "templates"]
    ] + [{"properties": {"identities": {"type": "array", "contains": {"type": "object", "required": ["blocks"], "properties": {"blocks": {"type": "array", "contains": remote_block}}}}}}]
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": f"urn:dsfr-mail:composition:2:{catalogue['id']}",
        "title": "Compositions et bibliothèques de courriels DSFR",
        "description": "L’import complète ces contraintes par la validation des URL, des identifiants uniques et de la composition active.",
        "oneOf": [{"$ref": "#/$defs/" + name} for name in ["document", "library", "document-v2", "library-v2"]],
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
