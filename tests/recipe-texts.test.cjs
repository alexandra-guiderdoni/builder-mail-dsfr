const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// #230 : les recettes natives sont hors de `npm test` et de la CI. Les textes de l'atelier qu'elles attendent sont réunis
// dans scripts/recipe_texts.json ; ce contrat échoue dès que l'un d'eux quitte les sources, ou qu'une recette en recopie un.
const root = path.resolve(__dirname, '..'), read = file => fs.readFileSync(path.join(root, file), 'utf8');
const texts = JSON.parse(read('scripts/recipe_texts.json'));
const sources = fs.readdirSync(path.join(root, 'app/source')).map(file => read('app/source/' + file)).join('\n');
// #243 : les deux collecteurs d’audit qui parcourent l’atelier entrent dans le même contrat.
const recipes = fs.readdirSync(path.join(root, 'scripts')).filter(file => /^recipe_.*\.(mjs|cjs)$/.test(file) || ['audit_browser.cjs', 'audit_contrasts.cjs'].includes(file));

test('#230 : chaque texte attendu par les recettes existe dans les sources de l’atelier', () => {
  const missing = Object.entries(texts).filter(([, text]) => !sources.includes(text)).map(([key, text]) => `${key} : « ${text} »`);
  assert.deepEqual(missing, []);
});

test('#230 : les recettes lisent ces textes dans le fichier commun, sans les recopier', () => {
  const copies = recipes.flatMap(file => Object.entries(texts).filter(([, text]) => read('scripts/' + file).includes(text)).map(([key]) => `${file} : ${key}`));
  assert.deepEqual(copies, []);
});

test('#230 : aucune recette n’interroge l’état de sauvegarde ou les volets par un texte en dur', () => {
  // Les deux gestes dont la dérive a rendu les recettes inexécutables : comparer #save-state, ouvrir un volet par son intitulé.
  const hard = recipes.flatMap(file => read('scripts/' + file).split('\n').flatMap((line, index) =>
    /save-state'\)\.textContent\s*===?\s*['"`]/.test(line) || /\.details\(\s*['"`]/.test(line) ? [`${file}:${index + 1}`] : []));
  assert.deepEqual(hard, []);
});

test('#230 : aucune recette n’active « reprendre » sans vérifier qu’il est visible', () => {
  // Depuis l’accueil de première visite (#205), ce bouton est masqué dans un profil neuf : l’activer au clavier ne fait rien.
  const blind = recipes.flatMap(file => read('scripts/' + file).split('\n').flatMap((line, index) =>
    /resume-document/.test(line) && /\.(click|press)\(|\b(click|activate)\(/.test(line) && !/isVisible\(\)|getClientRects|#library-home'\)\.isVisible/.test(line) ? [`${file}:${index + 1}`] : []));
  assert.deepEqual(blind, []);
});
