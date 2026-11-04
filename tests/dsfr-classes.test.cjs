const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Périmètre (#213) : classes fr-* écrites dans le HTML et le JavaScript de l'interface (app/source, app/snum, shared),
// y compris celles que le JavaScript insère par innerHTML. Exclus : les CSS de l'atelier, qui ciblent sans utiliser,
// les attributs (data-fr-theme), les locales (fr-FR), les identifiants de schéma (dsfr-mail/…), la documentation et les
// gabarits de courriel (reference/catalogue.json), rendus par render.js et non stylés par le DSFR web.
const root = path.resolve(__dirname, '..');
const sources = ['app/source', 'app/snum', 'shared'];
const dsfr = path.join(root, 'reference/dsfr-web/dist');

function files(dir, keep) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full, keep) : keep(full) ? [full] : [];
  });
}
function usedClasses(text) {
  return new Set([...text.matchAll(/(?<![\w-])fr-[a-z0-9]+(?:-{1,2}[a-z0-9]+)*(?![\w-])/g)].map(match => match[0]));
}
function orphans(classes, css) {
  return [...classes].filter(name => !new RegExp(`\\.${name}(?![\\w-])`).test(css)).sort();
}

const css = files(dsfr, file => file.endsWith('.css')).map(file => fs.readFileSync(file, 'utf8')).join('\n');
const used = new Set(sources.flatMap(dir => files(path.join(root, dir), file => /\.(html|js)$/.test(file)))
  .flatMap(file => [...usedClasses(fs.readFileSync(file, 'utf8'))]));

test('chaque classe fr-* de l’interface a un sélecteur exact dans le DSFR embarqué', () => {
  assert.ok(css.includes('.fr-btn'), 'les CSS DSFR embarqués doivent être lus');
  assert.ok(used.has('fr-btn') && used.has('fr-btn--secondary') && used.has('fr-h5'), 'les classes du HTML et du JavaScript doivent être recensées');
  assert.deepEqual(orphans(used, css), []);
});

test('le recensement ignore attributs, locales et schémas, et signale une classe sans règle', () => {
  const sample = '<html data-fr-theme="light" lang="fr-FR"><a class="fr-link fr-btn">x</a></html> "dsfr-mail/library"';
  assert.deepEqual([...usedClasses(sample)].sort(), ['fr-btn', 'fr-link']);
  assert.deepEqual(orphans(usedClasses(sample), css), ['fr-link']);
});
