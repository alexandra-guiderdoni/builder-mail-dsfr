#!/usr/bin/env node
// Valide des fichiers JSON contre un schéma JSON Schema 2020-12.
// Outillage de développement uniquement : ajv n'est jamais requis par
// l'application. Usage : node tests/validate-schema.cjs SCHEMA FICHIER...
// Sortie JSON sur stdout ; code 2 si ajv est absent ou si le schéma est invalide.
'use strict';
const fs = require('node:fs');
let Ajv2020, addFormats;
try {
  Ajv2020 = require('ajv/dist/2020').default;
  addFormats = require('ajv-formats').default;
} catch (error) {
  console.error('ajv absent : voir docs/MAINTENANCE.md');
  process.exit(2);
}
const [schemaPath, ...files] = process.argv.slice(2);
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv2020({allErrors: true, strict: false, allowUnionTypes: true});
addFormats(ajv);
let validator;
try {
  validator = ajv.compile(schema);
} catch (error) {
  console.error('schéma invalide : ' + String(error.message).slice(0, 200));
  process.exit(2);
}
const results = files.map(name => {
  const instance = JSON.parse(fs.readFileSync(name, 'utf8'));
  const valid = validator(instance);
  const errors = valid ? [] : (validator.errors || []).map(e => {
    const chemin = (e.instancePath || '').replace(/^\//, '').replace(/\//g, '/') || '.';
    return chemin + ': ' + String(e.message).slice(0, 200);
  });
  return {file: name, valid: !!valid, errors: errors.slice(0, 5)};
});
process.stdout.write(JSON.stringify(results, null, 0));
